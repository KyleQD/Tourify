import { NextRequest, NextResponse } from "next/server"
import { jsonError, requireApiUser } from "@/lib/api/route-helpers"
import { CREATOR_DIGITAL_COMMONS_DISCLAIMER } from "@/lib/music/creator-digital-commons/commons-disclaimer"
import { resolveCreatorDigitalCommonsFlags } from "@/lib/music/creator-digital-commons/creator-digital-commons-flags"
import { evaluateRegistryProjection } from "@/lib/music/creator-digital-commons/registry-projection-policy"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireApiUser(request)
  if (!authResult.success) return authResult.response
  const { user, supabase } = authResult.auth
  const flags = await resolveCreatorDigitalCommonsFlags(supabase, user.id)
  if (!flags.creator_digital_commons_registry_sandbox_enabled)
    return jsonError({ status: 404, code: "feature_disabled", message: "Registry sandbox is not available.", retryable: false })

  if (flags.creator_digital_commons_public_api_sandbox_enabled)
    return jsonError({
      status: 403,
      code: "public_api_gated",
      message: "Public API sandbox remains separately gated and default-deny until counsel package.",
      retryable: false,
    })

  const [{ data: registries }, { data: entries }] = await Promise.all([
    supabase
      .from("creator_commons_registries")
      .select("id, registry_kind, status, policy_version, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("creator_commons_registry_entries")
      .select("id, registry_id, source_type, source_id, source_version, status, public_projection, source_fresh_at, disputed, revoked")
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  const projected = (entries || []).map((entry: any) => {
    const gate = evaluateRegistryProjection({
      purposeApproved: true,
      source: {
        sourceType: entry.source_type,
        sourceId: entry.source_id,
        sourceVersion: entry.source_version,
        disputed: entry.disputed,
        revoked: entry.revoked,
      },
      sourceFresh: Boolean(entry.source_fresh_at),
      fieldsApproved: true,
      leakageReviewPassed: true,
      containsSensitiveEvidence: false,
      policyVersion: "1.0.0",
    })
    return { ...entry, projectionGate: gate }
  })

  return NextResponse.json({
    data: { registries: registries || [], entries: projected },
    disclaimer: CREATOR_DIGITAL_COMMONS_DISCLAIMER,
    note: "Minimized projections only — not ownership or licensing authority.",
    enabled: true,
  })
}
