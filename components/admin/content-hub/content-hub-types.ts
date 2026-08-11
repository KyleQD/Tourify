import type { OrganizationSocialIntegration } from "@/types/organization-social-integrations.type"
import type { OrgPlatformMetricSlice } from "@/lib/admin/content-hub/build-platform-analytics"
import type { SocialPlatform } from "@/types/organization-social-integrations.type"

export type ContentHubTab = "overview" | "platforms" | "posts" | "analytics" | "moderation"

export interface OrgPostItem {
  id: string
  content: string | null
  created_at: string
  user_id: string
  posted_as_profile_id: string | null
  posted_as_type: string | null
  moderation_status: string
  is_visible: boolean
  is_pinned: boolean
  likes_count: number
  comments_count: number
  shares_count: number
  author_name: string | null
}

export interface ContentHubOverview {
  organizerAccountId: string
  orgId: string
  connectedCount: number
  platformCount: number
  lastSync: string | null
  meta: { followers: number; impressions: number; reach: number }
  orgPosts: {
    count: number
    likes: number
    comments: number
    shares: number
    engagement: number
  }
  platforms: Record<string, OrgPlatformMetricSlice>
  attention: Array<{ type: string; platform?: string; message: string }>
  providerConfig: Record<
    SocialPlatform,
    { configured: boolean; envVar: string; analyticsReady: boolean }
  >
}

export interface ContentHubAnalytics {
  platforms: Record<string, OrgPlatformMetricSlice>
  mediaInsights: Array<{
    id: string
    platform: string
    media_id: string
    permalink: string | null
    caption: string | null
    media_type: string | null
    impressions: number
    reach: number
    engagement: number
    likes: number
    comments: number
    shares: number
    posted_at: string | null
    synced_at: string
  }>
  orgPosts: OrgPostItem[]
  csvRows: Array<Record<string, string | number>>
  generatedAt: string
}

export interface IntegrationsResponse {
  integrations: OrganizationSocialIntegration[]
  providerConfig: ContentHubOverview["providerConfig"]
  oauth: {
    organizerAccountId: string
    opsOrgId: string
    scope: string
    returnTo: string
  }
}
