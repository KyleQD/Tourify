import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { sanitizeOrganizationSocialIntegrations } from "@/lib/admin/content-hub/sanitize-integration"
import { buildOrgPlatformAnalyticsMap } from "@/lib/admin/content-hub/build-platform-analytics"
import { listOrgScopedPosts } from "@/lib/admin/content-hub/org-posts"
import type { OrganizationSocialIntegrationRow } from "@/types/organization-social-integrations.type"

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

  const integrations = sanitizeOrganizationSocialIntegrations(
    (rows || []) as OrganizationSocialIntegrationRow[],
  )
  const platforms = buildOrgPlatformAnalyticsMap(integrations)

  const { data: mediaRows, error: mediaError } = await supabase
    .from("organization_social_media_insights")
    .select(
      "id, integration_id, organizer_account_id, ops_org_id, platform, media_id, permalink, caption, media_type, impressions, reach, engagement, likes, comments, shares, posted_at, synced_at",
    )
    .eq("organizer_account_id", admin.profileId)
    .order("posted_at", { ascending: false })
    .limit(40)

  if (mediaError) {
    return NextResponse.json({ success: false, error: mediaError.message }, { status: 500 })
  }

  const postsResult = await listOrgScopedPosts({
    supabase,
    organizerAccountId: admin.profileId,
    limit: 50,
  })

  const csvRows: Array<Record<string, string | number>> = []
  for (const [platform, slice] of Object.entries(platforms)) {
    csvRows.push({
      type: "platform",
      platform,
      status: slice.status,
      followers: slice.followers,
      impressions: slice.impressions,
      reach: slice.reach,
      engagement: slice.engagement,
      synced_at: slice.syncedAt || "",
    })
  }
  for (const media of mediaRows || []) {
    csvRows.push({
      type: "media",
      platform: media.platform,
      media_id: media.media_id,
      impressions: media.impressions,
      reach: media.reach,
      engagement: media.engagement,
      likes: media.likes,
      comments: media.comments,
      shares: media.shares,
      posted_at: media.posted_at || "",
    })
  }

  return NextResponse.json({
    success: true,
    platforms,
    mediaInsights: mediaRows || [],
    orgPosts: postsResult.items,
    csvRows,
    generatedAt: new Date().toISOString(),
  })
})
