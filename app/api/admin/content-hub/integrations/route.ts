import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { sanitizeOrganizationSocialIntegrations } from "@/lib/admin/content-hub/sanitize-integration"
import { getSocialProviderConfigStatus } from "@/lib/admin/content-hub/provider-config"
import type { OrganizationSocialIntegrationRow } from "@/types/organization-social-integrations.type"
import type { SocialPlatform } from "@/types/organization-social-integrations.type"

export const GET = withAdminCapability("content.view", async (_request: NextRequest, { supabase, admin }) => {
  const { data: rows, error } = await supabase
    .from("organization_social_integrations")
    .select(
      "id, organizer_account_id, ops_org_id, platform, account_handle, access_token, refresh_token, token_envelope, refresh_token_envelope, token_expires_at, is_connected, last_sync, analytics, connected_by, created_at, updated_at",
    )
    .eq("organizer_account_id", admin.profileId)
    .order("platform", { ascending: true })

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    integrations: sanitizeOrganizationSocialIntegrations(
      (rows || []) as OrganizationSocialIntegrationRow[],
    ),
    providerConfig: getSocialProviderConfigStatus(),
    oauth: {
      organizerAccountId: admin.profileId,
      opsOrgId: admin.orgId,
      scope: "organization",
      returnTo: "admin",
    },
  })
})

export const DELETE = withAdminCapability(
  "content.manage",
  async (request: NextRequest, { supabase, admin }) => {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get("platform") as SocialPlatform | null
    if (!platform) {
      return NextResponse.json({ success: false, error: "platform is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("organization_social_integrations")
      .update({
        is_connected: false,
        access_token: null,
        refresh_token: null,
        token_envelope: null,
        refresh_token_envelope: null,
        analytics: {
          status: "needs_oauth",
          platform,
          synced_at: new Date().toISOString(),
          error: "Disconnected",
        },
        last_sync: new Date().toISOString(),
      })
      .eq("organizer_account_id", admin.profileId)
      .eq("platform", platform)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, platform })
  },
)
