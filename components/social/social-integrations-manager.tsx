'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useSocialIntegrations } from '@/hooks/use-social-integrations'
import { socialIntegrationsService } from '@/lib/services/social-integrations.service'
import type { ConnectRequest } from '@/types/social-integrations.type'
import { Instagram, Music2, RefreshCcw, Youtube, Twitter, Facebook } from 'lucide-react'
import { toast } from 'sonner'

const PLATFORMS: Array<{ id: ConnectRequest['platform']; label: string; Icon: any }> = [
  { id: 'instagram', label: 'Instagram', Icon: Instagram },
  { id: 'youtube', label: 'YouTube', Icon: Youtube },
  { id: 'tiktok', label: 'TikTok', Icon: Music2 },
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
  { id: 'twitter', label: 'X / Twitter', Icon: Twitter },
]

export function SocialIntegrationsManager() {
  const { integrations, loading, error, connect, disconnect, refreshAnalytics } = useSocialIntegrations()
  const [form, setForm] = useState<ConnectRequest>({ platform: 'instagram', account_handle: '' })
  const [submitting, setSubmitting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [syncingPlatform, setSyncingPlatform] = useState<ConnectRequest['platform'] | null>(null)

  const onSubmit = async () => {
    if (!form.account_handle) return
    setSubmitting(true)
    try {
      await connect(form)
      toast.success('Handle saved. Use OAuth to enable analytics.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save handle'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const onOAuthConnect = (platform: ConnectRequest['platform']) => {
    const startUrl = socialIntegrationsService.getOAuthStartUrl(platform)
    window.location.href = startUrl
  }

  const integrationsByPlatform = useMemo(() => {
    const map = new Map<ConnectRequest['platform'], (typeof integrations)[number]>()
    integrations.forEach(integration => map.set(integration.platform, integration))
    return map
  }, [integrations])

  const connectedCount = useMemo(
    () => integrations.filter(integration => integration.is_connected).length,
    [integrations]
  )

  const oauthReadyCount = useMemo(
    () => integrations.filter(integration => integration.is_connected && !!integration.access_token).length,
    [integrations]
  )

  useEffect(() => {
    const existing = integrationsByPlatform.get(form.platform)
    if (!existing?.account_handle) return
    setForm(prev => {
      if (prev.account_handle) return prev
      return { ...prev, account_handle: existing.account_handle }
    })
  }, [form.platform, integrationsByPlatform])

  async function handleRefreshAllAnalytics() {
    try {
      setIsRefreshing(true)
      await refreshAnalytics()
      toast.success('Analytics sync started')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh analytics'
      toast.error(message)
    } finally {
      setIsRefreshing(false)
    }
  }

  async function handleSyncSinglePlatform(platform: ConnectRequest['platform']) {
    try {
      setSyncingPlatform(platform)
      await refreshAnalytics()
      toast.success('Platform sync started')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh analytics'
      toast.error(message)
    } finally {
      setSyncingPlatform(null)
    }
  }

  function getPlatformState(platform: ConnectRequest['platform']) {
    const integration = integrationsByPlatform.get(platform)
    if (!integration?.is_connected) {
      return {
        label: 'Not connected',
        badgeClassName: 'border-slate-600/60 bg-slate-800/40 text-slate-300',
      }
    }
    if (!integration.access_token) {
      return {
        label: 'Connected (OAuth needed)',
        badgeClassName: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      }
    }
    return {
      label: 'Connected + syncing',
      badgeClassName: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/5">
      <CardHeader>
        <CardTitle className="text-slate-200">Social Accounts</CardTitle>
        <CardDescription className="text-slate-400">
          Connect platforms once, then keep analytics synced automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Connected</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{connectedCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">OAuth Ready</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{oauthReadyCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">Available</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">{PLATFORMS.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map(({ id, label, Icon }) => (
                <div key={id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/50 p-2">
                  <Button variant={form.platform === id ? 'default' : 'outline'}
                    onClick={() => setForm(prev => ({ ...prev, platform: id }))}
                    className={`${form.platform === id ? 'bg-purple-600' : ''} border-slate-700/50 rounded-xl`}
                  >
                    <Icon className="h-4 w-4 mr-2" />{label}
                  </Button>
                  <Badge className={getPlatformState(id).badgeClassName}>{getPlatformState(id).label}</Badge>
                  <Button variant="outline" className="border-slate-700/50 rounded-xl" onClick={() => onOAuthConnect(id)}>Connect OAuth</Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <Label>Account handle</Label>
              <Input placeholder="@username or channel" value={form.account_handle}
                onChange={e => setForm(prev => ({ ...prev, account_handle: e.target.value }))}
                onKeyDown={event => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  void onSubmit()
                }}
                className="rounded-xl bg-slate-900/60 border-slate-700/60 text-slate-200 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-purple-500/40 focus-visible:border-purple-500/40"
              />
              <div className="flex gap-2 pt-2">
                <Button onClick={onSubmit} disabled={submitting || !form.account_handle} className="rounded-xl">
                  {submitting ? 'Saving...' : 'Save handle'}
                </Button>
                <Button variant="outline" className="border-slate-700/50 rounded-xl" onClick={() => void handleRefreshAllAnalytics()} disabled={isRefreshing}>
                  <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh analytics
                </Button>
              </div>
              <p className="text-xs text-slate-500 pt-2">Handles help discovery. OAuth enables analytics + reliable sync.</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
            <h4 className="text-slate-200 font-medium">Connected</h4>
            <div className="space-y-2">
              {loading ? (
                <p className="text-slate-400 text-sm">Loading...</p>
              ) : integrations.length === 0 ? (
                <p className="text-slate-400 text-sm">No accounts connected yet.</p>
              ) : (
                integrations.map(integration => (
                  <div key={integration.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="capitalize">{integration.platform}</Badge>
                      <span className="text-slate-200">{integration.account_handle}</span>
                      {integration.is_connected && (
                        <span className="text-xs text-green-400">linked</span>
                      )}
                      {!integration.access_token && (
                        <span className="text-xs text-slate-400">analytics off</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!integration.access_token ? (
                        <Button size="sm" variant="outline" className="border-slate-700/50 rounded-xl" onClick={() => onOAuthConnect(integration.platform)}>
                          OAuth
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700/50 rounded-xl"
                        onClick={() => void handleSyncSinglePlatform(integration.platform)}
                        disabled={syncingPlatform === integration.platform}
                      >
                        {syncingPlatform === integration.platform ? 'Syncing...' : 'Sync'}
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-xl" onClick={async () => {
                        try { await disconnect(integration.platform); toast.success('Disconnected') }
                        catch { toast.error('Failed to disconnect') }
                      }}>Disconnect</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-slate-800" />
        <p className="text-xs text-slate-500">
          For OAuth flows (Instagram, YouTube, TikTok, Facebook), we store tokens securely and refresh periodically. Posting uses provider APIs via Supabase Edge Functions.
        </p>
      </CardContent>
    </Card>
  )
}

export default SocialIntegrationsManager


