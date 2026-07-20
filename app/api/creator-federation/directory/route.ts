import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_FEDERATION_DISCLAIMER } from "@/lib/music/creator-federation/federation-disclaimer"
import { resolveCreatorFederationFlags } from "@/lib/music/creator-federation/creator-federation-flags"
import { discoverFederationService } from "@/lib/music/creator-federation/service-discovery"

export const dynamic = "force-dynamic"

const discoverSchema = z.object({
  service: z.string().default("service_directory_admin"),
  jurisdiction: z.string().default("SANDBOX"),
  credential_profile: z.string().default("sandbox-org"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorFederationFlags(supabase, user.id)
  if (!flags.creator_federation_service_directory_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Service directory is not available.", retryable: false })

  const { data, error } = await supabase

    .from("creator_federation_service_endpoints")
    .select("id, organization_id, service_key, endpoint_url, supported_profiles, jurisdictions, status, is_public")
    .eq("is_public", false)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: false })
    .limit(50)

  if (error)
    return jsonError({ status: 500, code: "directory_query_failed", message: "Unable to load directory.", retryable: true })

  return NextResponse.json({
    data: data || [],
    disclaimer: CREATOR_FEDERATION_DISCLAIMER,
    note: "Private bilateral directory only.",
    enabled: true,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response
    const { user, supabase } = authResult.auth
    const flags = await resolveCreatorFederationFlags(supabase, user.id)
    if (!flags.creator_federation_service_directory_enabled)
      return jsonError({ status: 404, code: "feature_disabled", message: "Service directory is not available.", retryable: false })

    const payload = discoverSchema.parse(await request.json())
    const { data } = await supabase
      .from("creator_federation_service_endpoints")
      .select("organization_id, service_key, endpoint_url, supported_profiles, jurisdictions, status")
      .eq("is_public", false)
      .eq("status", "active")
      .limit(100)

    const endpoints = (data || []).map((row: Record<string, any>) => ({
      organizationId: row.organization_id,
      service: row.service_key,
      jurisdictions: (row.jurisdictions as string[]) || [],
      credentialProfiles: (row.supported_profiles as string[]) || [],
      status: row.status as "active",
      url: row.endpoint_url,
    }))

    const matches = discoverFederationService({
      endpoints,
      service: payload.service,
      jurisdiction: payload.jurisdiction,
      credentialProfile: payload.credential_profile,
    })

    return NextResponse.json({ data: { matches }, disclaimer: CREATOR_FEDERATION_DISCLAIMER })
  } catch (error) {
    if (error instanceof z.ZodError)
      return jsonError({ status: 400, code: "validation_error", message: "Invalid discovery payload.", retryable: false, issues: error.issues })
    return jsonError({ status: 500, code: "discovery_failed", message: "Unable to discover services.", retryable: true })
  }
}
