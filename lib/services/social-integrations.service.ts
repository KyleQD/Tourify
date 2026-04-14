import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import type { ArtistSocialIntegration, ConnectRequest } from '@/types/social-integrations.type'

export interface ProviderAuthUrlOptions {
  platform: ArtistSocialIntegration['platform']
  redirectUrl?: string
  state?: string
}

export class SocialIntegrationsService {
  private readonly supabase = supabase

  async list(): Promise<ArtistSocialIntegration[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('artist_social_integrations')
      .select('*')
      .eq('user_id', user.id)
      .order('platform', { ascending: true })

    if (error) throw error
    return (data || []) as unknown as ArtistSocialIntegration[]
  }

  async connect(req: ConnectRequest): Promise<string> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await this.supabase
      .from('artist_social_integrations')
      .upsert({
        user_id: user.id,
        platform: req.platform,
        account_handle: req.account_handle,
        access_token: req.access_token || null,
        refresh_token: req.refresh_token || null,
        token_expires_at: req.token_expires_at || null,
        is_connected: true,
        last_sync: new Date().toISOString()
      }, { onConflict: 'user_id,platform' })
      .select('id')
      .single()

    if (error) throw error
    return data.id as unknown as string
  }

  async disconnect(platform: ArtistSocialIntegration['platform']): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await this.supabase
      .from('artist_social_integrations')
      .update({ is_connected: false, access_token: null, refresh_token: null })
      .eq('user_id', user.id)
      .eq('platform', platform)

    if (error) throw error
  }

  async refreshAnalytics(platform?: ArtistSocialIntegration['platform']): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')
    // Ensure at least one integration has an access token before calling provider APIs
    const { data: rows, error: listErr } = await this.supabase
      .from('artist_social_integrations')
      .select('platform, access_token')
      .eq('user_id', user.id)
    if (listErr) throw listErr

    const eligible = (rows || []).some(r => (!!r.access_token) && (!platform || r.platform === platform))
    if (!eligible) throw new Error('OAuth required for analytics. Link with OAuth to fetch metrics.')

    // Trigger Edge Function to fetch provider analytics (secure, server-side)
    const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-analytics`
    const token = (await this.supabase.auth.getSession()).data.session?.access_token
    await fetch(fnUrl, { method: 'POST', headers: { 'authorization': `Bearer ${token}` } })
  }

  getOAuthStartUrl(platform: ArtistSocialIntegration['platform']): string {
    const origin = window.location.origin
    const params = new URLSearchParams({ platform, redirect: `${origin}/api/social/oauth/callback?platform=${platform}` })
    return `/api/social/oauth/start?${params.toString()}`
  }
}

export const socialIntegrationsService = new SocialIntegrationsService()


