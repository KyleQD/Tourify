"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Music2,
  RefreshCcw,
  Unplug,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import type { IntegrationsResponse } from "./content-hub-types"
import type { SocialPlatform } from "@/types/organization-social-integrations.type"
import { resolveOrgIntegrationStatus } from "@/lib/admin/content-hub/build-platform-analytics"
import { formatDistanceToNow } from "date-fns"

const PLATFORMS: Array<{
  id: SocialPlatform
  label: string
  Icon: typeof Instagram
  analyticsReady: boolean
}> = [
  { id: "instagram", label: "Instagram", Icon: Instagram, analyticsReady: true },
  { id: "facebook", label: "Facebook", Icon: Facebook, analyticsReady: true },
  { id: "youtube", label: "YouTube", Icon: Youtube, analyticsReady: false },
  { id: "tiktok", label: "TikTok", Icon: Music2, analyticsReady: false },
  { id: "twitter", label: "X / Twitter", Icon: Twitter, analyticsReady: false },
]

interface PlatformConnectionsPanelProps {
  data: IntegrationsResponse | null
  isLoading: boolean
  actingHeaders: Record<string, string>
  onReload: () => Promise<void>
}

export function PlatformConnectionsPanel({
  data,
  isLoading,
  actingHeaders,
  onReload,
}: PlatformConnectionsPanelProps) {
  const [busyPlatform, setBusyPlatform] = useState<SocialPlatform | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const byPlatform = useMemo(() => {
    const map = new Map<SocialPlatform, IntegrationsResponse["integrations"][number]>()
    for (const row of data?.integrations || []) map.set(row.platform, row)
    return map
  }, [data])

  function onConnect(platform: SocialPlatform) {
    if (!data?.oauth) {
      toast.error("Organization context not ready")
      return
    }
    const configured = data.providerConfig?.[platform]?.configured
    if (!configured) {
      const envVar = data.providerConfig?.[platform]?.envVar || "provider credentials"
      toast.error(`Provider not configured (${envVar})`)
      return
    }

    const params = new URLSearchParams({
      platform,
      scope: "organization",
      return_to: "admin",
      organizer_account_id: data.oauth.organizerAccountId,
      ops_org_id: data.oauth.opsOrgId,
      redirect: `${window.location.origin}/api/social/oauth/callback?platform=${platform}`,
    })
    window.location.href = `/api/social/oauth/start?${params.toString()}`
  }

  async function onDisconnect(platform: SocialPlatform) {
    setBusyPlatform(platform)
    try {
      const res = await fetch(`/api/admin/content-hub/integrations?platform=${platform}`, {
        method: "DELETE",
        credentials: "include",
        headers: { ...actingHeaders },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Disconnect failed")
      toast.success(`Disconnected ${platform}`)
      await onReload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Disconnect failed")
    } finally {
      setBusyPlatform(null)
    }
  }

  async function onSync(platform?: SocialPlatform) {
    setIsSyncing(true)
    if (platform) setBusyPlatform(platform)
    try {
      const res = await fetch("/api/admin/content-hub/integrations/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify(platform ? { platform } : {}),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Sync failed")
      toast.success("Analytics sync complete")
      await onReload()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed")
    } finally {
      setIsSyncing(false)
      setBusyPlatform(null)
    }
  }

  if (isLoading || !data) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="py-12 text-center text-slate-400 text-sm">
          Loading platform connections…
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-400">
          Connect promotion accounts for this organization. Instagram and Facebook sync live
          engagement; other platforms can connect now with analytics marked unavailable until
          supported.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-slate-700 text-slate-300 shrink-0"
          onClick={() => onSync()}
          disabled={isSyncing}
        >
          <RefreshCcw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? "animate-spin" : ""}`} />
          Sync all
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {PLATFORMS.map(({ id, label, Icon, analyticsReady }) => {
          const integration = byPlatform.get(id)
          const configured = data.providerConfig?.[id]?.configured ?? false
          const { status, statusLabel } = resolveOrgIntegrationStatus(integration)
          const connected = Boolean(integration?.is_connected)

          return (
            <Card key={id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </CardTitle>
                  <Badge
                    className={
                      analyticsReady
                        ? "bg-green-500/15 text-green-300 border-green-500/30 text-[10px]"
                        : "bg-slate-700/50 text-slate-300 border-slate-600 text-[10px]"
                    }
                  >
                    {analyticsReady ? "Analytics ready" : "Connect only"}
                  </Badge>
                </div>
                <CardDescription className="text-slate-500 text-xs">
                  {integration?.account_handle
                    ? `@${integration.account_handle}`
                    : connected
                      ? "Connected"
                      : "Not connected"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="text-[10px] bg-slate-800 text-slate-300 border-slate-600">
                    {connected ? "Connected" : "Disconnected"}
                  </Badge>
                  <Badge className="text-[10px] bg-slate-800 text-slate-300 border-slate-600">
                    {statusLabel}
                  </Badge>
                  {!configured && (
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                      Provider not configured
                    </Badge>
                  )}
                </div>

                {integration?.last_sync && (
                  <p className="text-[11px] text-slate-500">
                    Last sync{" "}
                    {formatDistanceToNow(new Date(integration.last_sync), { addSuffix: true })}
                  </p>
                )}

                {status === "error" && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                    <span>{statusLabel}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white"
                    onClick={() => onConnect(id)}
                    disabled={!configured || busyPlatform === id}
                  >
                    {connected ? "Reconnect" : "Connect"}
                  </Button>
                  {connected && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 text-slate-300"
                        onClick={() => onSync(id)}
                        disabled={isSyncing || busyPlatform === id}
                      >
                        <RefreshCcw className="h-3.5 w-3.5 mr-1" />
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                        onClick={() => onDisconnect(id)}
                        disabled={busyPlatform === id}
                      >
                        <Unplug className="h-3.5 w-3.5 mr-1" />
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
