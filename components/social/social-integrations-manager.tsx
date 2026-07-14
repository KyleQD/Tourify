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
import { Instagram, Music2, RefreshCcw, Youtube, Twitter, Facebook, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

const PLATFORMS: Array<{ id: ConnectRequest['platform']; label: string; Icon: any; analyticsReady: boolean }> = [
  { id: 'instagram', label: 'Instagram', Icon: Instagram, analyticsReady: true },
  { id: 'youtube', label: 'YouTube', Icon: Youtube, analyticsReady: false },
  { id: 'tiktok', label: 'TikTok', Icon: Music2, analyticsReady: false },
  { id: 'facebook', label: 'Facebook', Icon: Facebook, analyticsReady: true },
  { id: 'twitter', label: 'X / Twitter', Icon: Twitter, analyticsReady: false },
]

function isTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const ms = new Date(expiresAt).getTime()
  return Number.isFinite(ms) && ms < Date.now()
}

function isTokenExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Number.isFinite(ms) && ms > 0 && ms < 7 * 24 * 60 * 60 * 1000
}

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
    () =>
      integrations.filter(
        integration =>
          integration.is_connected &&
          !!integration.access_token &&
          !isTokenExpired(integration.token_expires_at)
      ).length,
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
      toast.success('Analytics sync completed')
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
      const integration = integrationsByPlatform.get(platform)
      const status = String((integration?.analytics as any)?.status || '')
      if (status === 'error') {
        toast.error(String((integration?.analytics as any)?.error || 'Sync failed — reconnect OAuth'))
      } else if (status === 'unsupported') {
        toast.message('Connected — analytics for this platform are coming soon')
      } else {
        toast.success('Platform sync completed')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh analytics'
      toast.error(message)
    } finally {
      setSyncingPlatform(null)
    }
  }

  function getPlatformState(platform: ConnectRequest['platform']) {
    const integration = integrationsByPlatform.get(platform)
    const meta = PLATFORMS.find(p => p.id === platform)
    if (!integration?.is_connected) {
      return {
        label: 'Not connected',
        badgeClassName: 'border-slate-600/60 bg-slate-800/40 text-slate-300',
      }
    }
    if (!integration.access_token) {
      return {
        label: 'Handle only — OAuth needed',
        badgeClassName: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      }
    }
    if (isTokenExpired(integration.token_expires_at)) {
      return {
        label: 'Reconnect OAuth',
        badgeClassName: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      }
    }
    const analyticsStatus = String((integration.analytics as any)?.status || '')
    if (analyticsStatus === 'error') {
      return {
        label: 'Sync error',
        badgeClassName: 'border-red-500/40 bg-red-500/10 text-red-300',
      }
    }
    if (!meta?.analyticsReady || analyticsStatus === 'unsupported') {
      return {
        label: 'Connected · analytics soon',
        badgeClassName: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
      }
    }
    if (isTokenExpiringSoon(integration.token_expires_at)) {
      return {
        label: 'Expiring soon',
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
        <CardTitle className="text-slate-200">Connected Accounts (OAuth)</CardTitle>
        <CardDescription className="text-slate-400">
          Connect platforms for analytics sync and cross-platform posting. Instagram and Facebook
          analytics are live; YouTube, TikTok, and X show clear coming-soon states.
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
                  <Button
                    variant={form.platform === id ? 'default' : 'outline'}
                    onClick={() => setForm(prev => ({ ...prev, platform: id }))}
                    className={`${form.platform === id ? 'bg-purple-600' : ''} border-slate-700/50 rounded-xl`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </Button>
                  <Badge className={getPlatformState(id).badgeClassName}>{getPlatformState(id).label}</Badge>
                  <Button
                    variant="outline"
                    className="border-slate-700/50 rounded-xl"
                    onClick={() => onOAuthConnect(id)}
                  >
                    {isTokenExpired(integrationsByPlatform.get(id)?.token_expires_at) ||
                    !integrationsByPlatform.get(id)?.access_token
                      ? 'Reconnect OAuth'
                      : 'Connect OAuth'}
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-700/50 bg-slate-900/40 p-4">
              <Label>Account handle</Label>
              <Input
                placeholder="@username or channel"
                value={form.account_handle}
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
                <Button
                  variant="outline"
                  className="border-slate-700/50 rounded-xl"
                  onClick={() => void handleRefreshAllAnalytics()}
                  disabled={isRefreshing}
                >
                  <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh analytics
                </Button>
              </div>
              <p className="text-xs text-slate-500 pt-2">
                Handles help discovery. OAuth enables analytics + reliable sync.
              </p>
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
                integrations.map(integration => {
                  const expired = isTokenExpired(integration.token_expires_at)
                  const syncError = String((integration.analytics as any)?.error || '')
                  return (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="capitalize">
                            {integration.platform}
                          </Badge>
                          <span className="text-slate-200 truncate">{integration.account_handle}</span>
                          {expired && (
                            <span className="text-xs text-amber-300 inline-flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> expired
                            </span>
                          )}
                          {!integration.access_token && (
                            <span className="text-xs text-slate-400">analytics off</span>
                          )}
                        </div>
                        {syncError && (
                          <p className="text-xs text-red-300/80 mt-1 line-clamp-2">{syncError}</p>
                        )}
                        {integration.last_sync && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            Last sync {new Date(integration.last_sync).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {expired || !integration.access_token ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-500/40 rounded-xl text-amber-200"
                            onClick={() => onOAuthConnect(integration.platform)}
                          >
                            Reconnect
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
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-xl"
                          onClick={async () => {
                            try {
                              await disconnect(integration.platform)
                              toast.success('Disconnected')
                            } catch {
                              toast.error('Failed to disconnect')
                            }
                          }}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <Separator className="bg-slate-800" />
        <p className="text-xs text-slate-500">
          Tokens are stored securely and refreshed via provider APIs. Nightly sync runs through
          `/api/cron/social-analytics`.
        </p>
      </CardContent>
    </Card>
  )
}

export default SocialIntegrationsManager
