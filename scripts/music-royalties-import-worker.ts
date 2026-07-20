/**
 * Normalize pending royalty import batches (received → processing → review/accepted/quarantined).
 * Pilot parser: generic CSV from private music-royalty-statements storage.
 */
import { createClient } from "@supabase/supabase-js"
import { CSV_PARSER_VERSION, parseGenericRoyaltyCsv, reconcileSourceTotals } from "../lib/music/royalties/csv-parser"
import { minorUnitsToDb } from "../lib/music/royalties/royalties-access"

const BATCH_SIZE = Number(process.env.MUSIC_ROYALTIES_IMPORT_BATCH || 10)

function requiredEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function createWorkerClient() {
  return createClient(
    requiredEnv("SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function claimBatches(supabase: ReturnType<typeof createWorkerClient>) {
  const { data: candidates, error } = await supabase
    .from("music_royalties_import_batches")
    .select("*")
    .eq("status", "received")
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE)
  if (error) throw error

  const claimed = []
  for (const candidate of candidates || []) {
    const { data } = await supabase
      .from("music_royalties_import_batches")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", candidate.id)
      .eq("status", "received")
      .select("*")
      .maybeSingle()
    if (data) claimed.push(data)
  }
  return claimed
}

async function processBatch(supabase: ReturnType<typeof createWorkerClient>, batch: any) {
  const { data: file, error: downloadError } = await supabase.storage
    .from(batch.storage_bucket || "music-royalty-statements")
    .download(batch.storage_path)

  if (downloadError || !file) {
    await supabase.from("music_royalties_import_batches").update({
      status: "quarantined",
      dead_letter_reason: downloadError?.message || "download_failed",
      updated_at: new Date().toISOString(),
    }).eq("id", batch.id)
    return
  }

  const csvText = await file.text()
  const parsed = parseGenericRoyaltyCsv({
    sourceBatchId: batch.id,
    provider: batch.provider,
    csvText,
  })

  const { data: run } = await supabase
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
    await supabase.from("music_royalties_raw_rows").upsert(
      parsed.lines.map((line) => ({
        import_batch_id: batch.id,
        row_number: line.sourceRowNumber,
        row_hash: line.sourceRowHash,
        payload: line.rawPayload,
      })),
      { onConflict: "import_batch_id,row_number", ignoreDuplicates: true },
    )

    await supabase.from("music_royalties_normalized_lines").insert(
      parsed.lines.map((line) => ({
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
      })),
    )
  }

  const normalizedTotal = parsed.lines.reduce((sum, line) => sum + line.netRoyaltyMinor, 0n)
  const reconciliation = reconcileSourceTotals({
    sourceTotalMinor: parsed.sourceTotalMinor,
    normalizedTotalMinor: normalizedTotal,
  })

  const nextStatus = reconciliation.ok ? "review_required" : "quarantined"
  await supabase.from("music_royalties_import_batches").update({
    status: nextStatus,
    parser_version: CSV_PARSER_VERSION,
    source_total_minor: minorUnitsToDb(parsed.sourceTotalMinor),
    normalized_total_minor: minorUnitsToDb(normalizedTotal),
    dead_letter_reason: reconciliation.ok ? null : `variance_${reconciliation.varianceMinor.toString()}`,
    updated_at: new Date().toISOString(),
  }).eq("id", batch.id)

  if (run?.id) {
    await supabase.from("music_royalties_normalization_runs").update({
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

  await supabase.from("music_royalties_outbox_events").upsert({
    owner_user_id: batch.owner_user_id,
    event_type: "music.royalty.import.normalized",
    dedupe_key: `${batch.id}:normalized`,
    payload: { importBatchId: batch.id, status: nextStatus },
    status: "pending",
  }, { onConflict: "event_type,dedupe_key", ignoreDuplicates: true })

  console.log(`[music-royalties-import-worker] normalized ${batch.id} → ${nextStatus} (${parsed.lines.length} lines)`)
}

async function main() {
  const supabase = createWorkerClient()
  const claimed = await claimBatches(supabase)
  if (!claimed.length) {
    console.log("[music-royalties-import-worker] no received batches")
    return
  }
  for (const batch of claimed) {
    try {
      await processBatch(supabase, batch)
    } catch (error) {
      console.error(`[music-royalties-import-worker] failed ${batch.id}`, error)
      await supabase.from("music_royalties_import_batches").update({
        status: "quarantined",
        dead_letter_reason: error instanceof Error ? error.message.slice(0, 500) : "worker_failed",
        updated_at: new Date().toISOString(),
      }).eq("id", batch.id)
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
