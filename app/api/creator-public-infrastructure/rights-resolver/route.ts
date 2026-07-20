import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER } from "@/lib/music/creator-public-infrastructure/public-infrastructure-disclaimer"
import { resolveCreatorPublicInfrastructureFlags } from "@/lib/music/creator-public-infrastructure/creator-public-infrastructure-flags"
import { resolveRightsReference } from "@/lib/music/creator-public-infrastructure/rights-reference-resolver"

export const dynamic = "force-dynamic"

const resolveSchema = z.object({
  public_id: z.string().min(1),
  requested_scope: z.string().min(1),
  max_age_seconds: z.number().int().positive().default(86_400),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
  if (!flags.creator_public_infrastructure_rights_resolver_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Rights-reference resolver is not available.", retryable: false })

  const publicId = request.nextUrl.searchParams.get("public_id")
  const requestedScope = request.nextUrl.searchParams.get("requested_scope") || "status_view"
  if (!publicId)
    return jsonError({ status: 400, code: "validation_error", message: "public_id is required.", retryable: false })

  const { data, error } = await supabase
    .from("creator_public_rights_references")
    .select("public_id, source_type, source_id, source_version, status, public_scopes, disputed, refreshed_at, jurisdiction")
    .eq("public_id", publicId)
    .maybeSingle()

  if (error)
    return jsonError({ status: 500, code: "resolver_query_failed", message: "Unable to resolve rights reference.", retryable: true })
  if (!data)
    return jsonError({ status: 404, code: "not_found", message: "Rights reference not found.", retryable: false })

  const resolution = resolveRightsReference({
    reference: {
      publicId: data.public_id,
      sourceType: data.source_type,
      sourceId: data.source_id,
      sourceVersion: data.source_version,
      status: data.status,
      publicScopes: data.public_scopes || [],
      refreshedAt: data.refreshed_at,
    },
    requestedScope,
    maxAgeSeconds: 86_400,
    now: new Date(),
  })

  return NextResponse.json({
    data: {
      public_id: data.public_id,
      status_view: resolution,
      source_type: data.source_type,
      source_id: data.source_id,
      source_version: data.source_version,
      freshness: data.refreshed_at,
      disputed: data.disputed,
      jurisdiction: data.jurisdiction,
    },
    disclaimer: CREATOR_PUBLIC_INFRASTRUCTURE_DISCLAIMER,
    note: "Status view only — not ownership proof and not licensing authority. Does not query confidential Phase 1–10 tables.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorPublicInfrastructureFlags(supabase, user.id)
    if (!flags.creator_public_infrastructure_rights_resolver_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Rights-reference resolver is not available.", retryable: false })

    const payload = resolveSchema.parse(await request.json())
    const url = new URL(request.url)
    url.searchParams.set("public_id", payload.public_id)
    url.searchParams.set("requested_scope", payload.requested_scope)
    return GET(new NextRequest(url, { headers: request.headers }))
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid resolver payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "resolver_failed", message: "Unable to resolve rights reference.", retryable: true })
  }
}
