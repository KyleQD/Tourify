import "server-only"

import type { SocialPlatform } from "@/types/organization-social-integrations.type"
import { sanitizeOrganizationSocialIntegrations } from "@/lib/admin/content-hub/sanitize-integration"
import type { OrganizationSocialIntegrationRow } from "@/types/organization-social-integrations.type"

interface SupabaseLike {
  from: (table: string) => any
  auth: { getSession: () => Promise<{ data: { session: { access_token?: string } | null } }> }
}

export class OrganizationSocialIntegrationsService {
  constructor(private readonly supabase: SupabaseLike) {}

  async list(organizerAccountId: string) {
    const { data, error } = await this.supabase
      .from("organization_social_integrations")
      .select(
        "id, organizer_account_id, ops_org_id, platform, account_handle, access_token, refresh_token, token_envelope, refresh_token_envelope, token_expires_at, is_connected, last_sync, analytics, connected_by, created_at, updated_at",
      )
      .eq("organizer_account_id", organizerAccountId)
      .order("platform", { ascending: true })

    if (error) throw error
    return sanitizeOrganizationSocialIntegrations((data || []) as OrganizationSocialIntegrationRow[])
  }

  async disconnect(organizerAccountId: string, platform: SocialPlatform) {
    const { error } = await this.supabase
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
      .eq("organizer_account_id", organizerAccountId)
      .eq("platform", platform)

    if (error) throw error
  }

  getOAuthStartUrl(args: {
    platform: SocialPlatform
    organizerAccountId: string
    opsOrgId: string
    origin: string
  }): string {
    const params = new URLSearchParams({
      platform: args.platform,
      scope: "organization",
      return_to: "admin",
      organizer_account_id: args.organizerAccountId,
      ops_org_id: args.opsOrgId,
      redirect: `${args.origin}/api/social/oauth/callback?platform=${args.platform}`,
    })
    return `/api/social/oauth/start?${params.toString()}`
  }
}
