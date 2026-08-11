import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { sanitizeOrganizationSocialIntegrations } from "@/lib/admin/content-hub/sanitize-integration"
import { buildOrgPlatformAnalyticsMap, resolveOrgIntegrationStatus } from "@/lib/admin/content-hub/build-platform-analytics"
import { listOrgScopedPosts } from "@/lib/admin/content-hub/org-posts"
import { getSocialProviderConfigStatus } from "@/lib/admin/content-hub/provider-config"
import type { OrganizationSocialIntegrationRow } from "@/types/organization-social-integrations.type"

export const GET = withAdminCapability("content.view", async (_request: NextRequest, { supabase, admin }) => {
  try {
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

    const integrations = sanitizeOrganizationSocialIntegrations(
      (rows || []) as OrganizationSocialIntegrationRow[],
    )
    const platforms = buildOrgPlatformAnalyticsMap(integrations)
    const postsResult = await listOrgScopedPosts({
      supabase,
      organizerAccountId: admin.profileId,
      limit: 100,
    })

    const orgPosts = postsResult.items
    const likes = orgPosts.reduce((sum, post) => sum + post.likes_count, 0)
    const comments = orgPosts.reduce((sum, post) => sum + post.comments_count, 0)
    const shares = orgPosts.reduce((sum, post) => sum + post.shares_count, 0)

    let metaFollowers = 0
    let metaImpressions = 0
    let metaReach = 0
    for (const key of ["instagram", "facebook"] as const) {
      const slice = platforms[key]
      if (slice.status === "synced") {
        metaFollowers += slice.followers
        metaImpressions += slice.impressions
        metaReach += slice.reach
      }
    }

    const attention: Array<{ type: string; platform?: string; message: string }> = []
    for (const integration of integrations) {
      const { status, statusLabel } = resolveOrgIntegrationStatus(integration)
      if (status === "needs_oauth") {
        attention.push({
          type: "reconnect",
          platform: integration.platform,
          message: `${integration.platform}: ${statusLabel}`,
        })
      } else if (status === "error") {
        attention.push({
          type: "error",
          platform: integration.platform,
          message: `${integration.platform}: ${statusLabel}`,
        })
      } else if (status === "unsupported" && integration.is_connected) {
        attention.push({
          type: "unsupported",
          platform: integration.platform,
          message: `${integration.platform}: connected — analytics not available yet`,
        })
      }
    }

    const connectedCount = integrations.filter((row) => row.is_connected).length
    if (connectedCount === 0) {
      attention.unshift({
        type: "connect",
        message: "Connect a social platform to start tracking promotion performance",
      })
    }

    const lastSync = integrations
      .map((row) => row.last_sync)
      .filter(Boolean)
      .sort()
      .at(-1) || null

    return NextResponse.json({
      success: true,
      overview: {
        organizerAccountId: admin.profileId,
        orgId: admin.orgId,
        connectedCount,
        platformCount: 5,
        lastSync,
        meta: {
          followers: metaFollowers,
          impressions: metaImpressions,
          reach: metaReach,
        },
        orgPosts: {
          count: orgPosts.length,
          likes,
          comments,
          shares,
          engagement: likes + comments + shares,
        },
        platforms,
        attention,
        providerConfig: getSocialProviderConfigStatus(),
      },
    })
  } catch (error: any) {
    console.error("[Admin Content Hub Overview]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load content hub overview" },
      { status: 500 },
    )
  }
})
