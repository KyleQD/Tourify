export type SocialPlatform = 'instagram' | 'facebook' | 'twitter' | 'youtube' | 'tiktok'

export type SocialAnalyticsStatus = 'synced' | 'unsupported' | 'needs_oauth' | 'error'

export interface OrganizationSocialIntegration {
  id: string
  organizer_account_id: string
  ops_org_id: string
  platform: SocialPlatform
  account_handle: string
  token_expires_at: string | null
  is_connected: boolean
  last_sync: string | null
  analytics: Record<string, unknown>
  connected_by: string | null
  created_at: string
  updated_at: string
  has_token: boolean
  has_refresh_token: boolean
}

export interface OrganizationSocialMediaInsight {
  id: string
  integration_id: string
  organizer_account_id: string
  ops_org_id: string
  platform: SocialPlatform
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
}

export interface OrganizationSocialIntegrationRow {
  id: string
  organizer_account_id: string
  ops_org_id: string
  platform: SocialPlatform
  account_handle: string
  access_token?: string | null
  refresh_token?: string | null
  token_envelope?: unknown
  refresh_token_envelope?: unknown
  token_expires_at: string | null
  is_connected: boolean
  last_sync: string | null
  analytics: Record<string, unknown>
  connected_by: string | null
  created_at: string
  updated_at: string
}
