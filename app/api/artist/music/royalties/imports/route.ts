import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"
import { CSV_PARSER_VERSION, parseGenericRoyaltyCsv, reconcileSourceTotals } from "@/lib/music/royalties/csv-parser"
import { resolveMusicRoyaltiesFlags } from "@/lib/music/royalties/music-royalties-flags"
import {
  enqueueRoyaltyOutboxEvent,
  minorUnitsToDb,
  sha256Hex,
} from "@/lib/music/royalties/royalties-access"

export const dynamic = "force-dynamic"

const createImportSchema = z.object({
  provider: z.string().min(1).max(80).default("generic_csv"),
  source_statement_id: z.string().max(200).optional().nullable(),
  period_start: z.string().optional().nullable(),
  period_end: z.string().optional().nullable(),
  currency: z.string().length(3).default("USD"),
  original_filename: z.string().max(240).optional().nullable(),
  mime_type: z.string().max(120).optional().nullable(),
  csv_text: z.string().max(5_000_000).optional(),
  prepare_upload: z.boolean().default(false),
  storage_path: z.string().max(500).optional(),
  source_sha256: z.string().length(64).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
  if (!flags.music_royalties_ingestion_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Royalty imports are not available.", retryable: false })

  const { data, error } = await supabase
    .from("music_royalties_import_batches")
    .select("id, public_id, provider, status, currency, period_start, period_end, source_total_minor, normalized_total_minor, original_filename, created_at, updated_at")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error)
    return jsonError({ status: 500, code: "royalty_imports_query_failed", message: "Unable to load imports.", retryable: true })

  return NextResponse.json({ data: data || [], enabled: true })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicRoyaltiesFlags(supabase, user.id)
    if (!flags.music_royalties_ingestion_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Royalty imports are not available.", retryable: false })

    const payload = createImportSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)

    if (payload.prepare_upload) {
      const safeName = (payload.original_filename || "statement.csv").replace(/[^A-Za-z0-9._-]/g, "_").slice(-160)
      const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`
      const { data: upload, error: uploadError } = await trusted.storage
        .from("music-royalty-statements")
        .createSignedUploadUrl(storagePath)
      if (uploadError || !upload?.signedUrl || !upload?.token)
        return jsonError({ status: 500, code: "signed_upload_url_failed", message: "Unable to prepare statement upload.", retryable: true })

      return NextResponse.json({
        data: {
          bucket: "music-royalty-statements",
          path: storagePath,
          token: upload.token,
          signedUrl: upload.signedUrl,
        },
      })
    }

    const hasCsv = Boolean(payload.csv_text?.trim())
    if (!hasCsv && !payload.storage_path)
      return jsonError({
        status: 400,
        code: "import_payload_required",
        message: "Provide csv_text for pilot import or storage_path after signed upload.",
        retryable: false,
      })

    const sourceSha = payload.source_sha256 || (hasCsv ? sha256Hex(payload.csv_text!) : null)
    if (!sourceSha)
      return jsonError({
        status: 400,
        code: "source_sha256_required",
        message: "source_sha256 is required when importing a stored file.",
        retryable: false,
      })

    const storagePath = payload.storage_path || `${user.id}/pilot/${sourceSha}.csv`
    const insertRow = {
      owner_user_id: user.id,
      provider: payload.provider,
      source_statement_id: payload.source_statement_id || null,
      source_sha256: sourceSha,
      storage_bucket: "music-royalty-statements",
      storage_path: storagePath,
      original_filename: payload.original_filename || (hasCsv ? "pilot.csv" : null),
      mime_type: payload.mime_type || (hasCsv ? "text/csv" : null),
      byte_size: hasCsv ? Buffer.byteLength(payload.csv_text!, "utf8") : null,
      status: hasCsv ? "processing" : "received",
      parser_version: hasCsv ? CSV_PARSER_VERSION : null,
      currency: payload.currency.toUpperCase(),
      period_start: payload.period_start || null,
      period_end: payload.period_end || null,
      metadata: { pilot_inline_csv: hasCsv },
    }

    const { data: batch, error: batchError } = await trusted
      .from("music_royalties_import_batches")
      .insert(insertRow)
      .select("*")
      .maybeSingle()

    if (batchError) {
      if (batchError.code === "23505")
        return jsonError({ status: 409, code: "import_duplicate", message: "This statement was already imported.", retryable: false })
      return jsonError({ status: 500, code: "import_create_failed", message: "Unable to create import batch.", retryable: true })
    }

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.royalty.import.received",
      dedupeKey: batch.id,
      payload: { importBatchId: batch.id, provider: batch.provider },
    })

    if (!hasCsv)
      return NextResponse.json({ data: batch }, { status: 201 })

    const parsed = parseGenericRoyaltyCsv({
      sourceBatchId: batch.id,
      provider: payload.provider,
      csvText: payload.csv_text!,
    })

    const { data: run } = await trusted
      .from("music_royalties_normalization_runs")
      .insert({
        import_batch_id: batch.id,
        parser_version: CSV_PARSER_VERSION,
        status: "running",
        metrics: { line_count: parsed.lines.length },
      })
      .select("id")
      .maybeSingle()

    if (parsed.lines.length) {
      const rawRows = parsed.lines.map((line) => ({
        import_batch_id: batch.id,
        row_number: line.sourceRowNumber,
        row_hash: line.sourceRowHash,
        payload: line.rawPayload,
      }))
      await trusted.from("music_royalties_raw_rows").insert(rawRows)

      const normalizedRows = parsed.lines.map((line) => ({
        import_batch_id: batch.id,
        normalization_run_id: run?.id || null,
        source_row_number: line.sourceRowNumber,
        source_row_hash: line.sourceRowHash,
        provider: line.provider,
        usage_start: line.usageStart,
        usage_end: line.usageEnd,
        territory: line.territory || null,
        currency: line.currency,
        gross_royalty_minor: minorUnitsToDb(line.grossRoyaltyMinor),
        deductions_minor: minorUnitsToDb(line.deductionsMinor),
        net_royalty_minor: minorUnitsToDb(line.netRoyaltyMinor),
        isrc: line.isrc || null,
        iswc: line.iswc || null,
        upc: line.upc || null,
        provider_asset_id: line.providerAssetId || null,
        usage_type: line.usageType || null,
        units: line.units || null,
        match_status: "unmatched",
        raw_payload: line.rawPayload,
      }))
      const { error: linesError } = await trusted.from("music_royalties_normalized_lines").insert(normalizedRows)
      if (linesError)
        return jsonError({ status: 500, code: "normalized_lines_insert_failed", message: "Unable to store normalized lines.", retryable: true })
    }

    const normalizedTotal = parsed.lines.reduce((sum, line) => sum + line.netRoyaltyMinor, 0n)
    const reconciliation = reconcileSourceTotals({
      sourceTotalMinor: parsed.sourceTotalMinor,
      normalizedTotalMinor: normalizedTotal,
    })

    const nextStatus = reconciliation.ok
      ? (flags.music_royalties_matching_enabled ? "review_required" : "accepted")
      : "quarantined"

    const { data: updated, error: updateError } = await trusted
      .from("music_royalties_import_batches")
      .update({
        status: nextStatus,
        source_total_minor: minorUnitsToDb(parsed.sourceTotalMinor),
        normalized_total_minor: minorUnitsToDb(normalizedTotal),
        parser_version: CSV_PARSER_VERSION,
        dead_letter_reason: reconciliation.ok ? null : `variance_${reconciliation.varianceMinor.toString()}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batch.id)
      .select("*")
      .maybeSingle()

    if (updateError)
      return jsonError({ status: 500, code: "import_update_failed", message: "Unable to finalize import.", retryable: true })

    if (run?.id) {
      await trusted.from("music_royalties_normalization_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        metrics: {
          line_count: parsed.lines.length,
          source_total_minor: parsed.sourceTotalMinor.toString(),
          normalized_total_minor: normalizedTotal.toString(),
          variance_minor: reconciliation.varianceMinor.toString(),
          ok: reconciliation.ok,
        },
      }).eq("id", run.id)
    }

    await enqueueRoyaltyOutboxEvent({
      supabase: trusted,
      ownerUserId: user.id,
      eventType: "music.royalty.import.normalized",
      dedupeKey: `${batch.id}:normalized`,
      payload: { importBatchId: batch.id, status: nextStatus },
    })

    return NextResponse.json({
      data: updated,
      reconciliation: {
        ok: reconciliation.ok,
        variance_minor: reconciliation.varianceMinor.toString(),
        line_count: parsed.lines.length,
      },
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "invalid_request", message: "Invalid import payload.", issues: error.issues })
    console.error("royalty import create failed", error)
    return jsonError({ status: 500, code: "import_internal_error", message: "Unexpected import error.", retryable: true })
  }
}
