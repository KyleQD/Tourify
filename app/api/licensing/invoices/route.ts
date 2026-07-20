import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { LICENSING_DISCLAIMER } from "@/lib/music/licensing/delivery-gate"
import { resolveMusicLicensingFlags } from "@/lib/music/licensing/music-licensing-flags"
import { createSandboxPaymentAdapter } from "@/lib/music/licensing/partner-adapters"
import { buildPhase3RoyaltyHandoff } from "@/lib/music/licensing/phase3-handoff"
import { getTrustedMusicWriteClient } from "@/lib/music/music-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  agreement_id: z.string().uuid(),
  currency: z.string().length(3).default("USD"),
  amount_minor: z.number().int().nonnegative(),
  due_at: z.string().datetime().optional().nullable(),
  issue: z.boolean().default(false),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveMusicLicensingFlags(supabase, user.id)
  if (!flags.music_licensing_payments_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Licensing invoices are not available.", retryable: false })

  const agreementId = request.nextUrl.searchParams.get("agreement_id")
  if (!agreementId)
    return jsonError({ status: 400, code: "validation_error", message: "agreement_id required.", retryable: false })

  const { data, error } = await supabase
    .from("music_license_invoices")
    .select("id, agreement_id, provider_invoice_id, currency, amount_minor, status, due_at, paid_at, created_at")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "invoices_query_failed", message: "Unable to load invoices.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: LICENSING_DISCLAIMER,
    note: "Payment status comes from verified partner webhooks only — never client redirects.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveMusicLicensingFlags(supabase, user.id)
    if (!flags.music_licensing_payments_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Licensing invoices are not available.", retryable: false })

    const payload = createSchema.parse(await request.json())
    const trusted = await getTrustedMusicWriteClient(supabase)
    let providerInvoiceId: string | null = null
    let status = "draft"
    if (payload.issue) {
      const adapter = createSandboxPaymentAdapter()
      const issued = await adapter.createInvoice({
        agreementId: payload.agreement_id,
        amountMinor: payload.amount_minor,
        currency: payload.currency,
      })
      providerInvoiceId = issued.providerInvoiceId
      status = issued.status
    }

    const { data, error } = await trusted
      .from("music_license_invoices")
      .insert({
        agreement_id: payload.agreement_id,
        provider_invoice_id: providerInvoiceId,
        currency: payload.currency,
        amount_minor: payload.amount_minor,
        status,
        due_at: payload.due_at || null,
      })
      .select("id, agreement_id, provider_invoice_id, amount_minor, currency, status")
      .single()

    if (error)
      return jsonError({ status: 500, code: "invoice_create_failed", message: "Unable to create invoice.", retryable: true })

    const handoff = buildPhase3RoyaltyHandoff({
      agreementId: payload.agreement_id,
      invoiceId: data.id,
      amountMinor: payload.amount_minor,
      currency: payload.currency,
    })
    await trusted.from("music_licensing_outbox").insert({
      event_type: "phase3.invoice_handoff",
      payload: handoff,
      status: "pending",
    })

    return NextResponse.json({ data, handoff, disclaimer: LICENSING_DISCLAIMER }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid invoice payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "invoice_create_failed", message: "Unable to create invoice.", retryable: true })
  }
}
