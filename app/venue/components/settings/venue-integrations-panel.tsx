"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LoadingSpinner } from "@/app/venue/components/loading-spinner"
import { VenueEmptyState } from "@/components/dashboard/venue-empty-state"
import { AlertCircle, Link2, RefreshCw, ShieldOff } from "lucide-react"

// VEN-264/267/270 — venue acting-account integrations surface. The catalog is
// server env-gated; connection DTOs never carry tokens; health is explicit.

interface CatalogEntry {
  provider: string
  label: string
  configured: boolean
  missing_env: string[]
  capabilities: Record<string, boolean>
  docsHint: string
}

interface Connection {
  id: string
  platform: string
  account_handle: string | null
  has_token: boolean
  last_sync: string | null
  health: "connected" | "needs_reauth" | "disconnected"
}

const HEALTH_STYLE: Record<Connection["health"], { label: string; className: string }> = {
  connected: { label: "Connected", className: "border-green-700 text-green-400" },
  needs_reauth: { label: "Needs re-auth", className: "border-yellow-600 text-yellow-500" },
  disconnected: { label: "Disconnected", className: "border-zinc-600 text-zinc-400" },
}

export function VenueIntegrationsPanel({ venueId }: { venueId: string }) {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [stripeNote, setStripeNote] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/venue/integrations?venue_id=${encodeURIComponent(venueId)}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || `Load failed (${res.status})`)
      }
      const payload = await res.json()
      setCatalog(payload.catalog || [])
      setConnections(payload.connections || [])
      setStripeNote(payload.stripe_note || "")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }, [venueId])

  useEffect(() => {
    void load()
  }, [load])

  const connect = (provider: string) => {
    window.location.href = `/api/social/oauth/start?platform=${provider}&scope=organization&return_to=artist`
  }

  const disconnect = async (connection: Connection) => {
    setBusyId(connection.id)
    setNotice(null)
    try {
      const res = await fetch("/api/venue/integrations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          venue_id: venueId,
          connection_id: connection.id,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Disconnect failed")
      setNotice(`${connection.platform} disconnected and credentials revoked.`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed")
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {notice && <p role="status" className="rounded-md border border-green-700 bg-green-950/30 p-2 text-sm text-green-300">{notice}</p>}

      {/* Existing connections */}
      <section aria-label="Connected accounts" className="space-y-2">
        <h3 className="text-sm font-semibold">Connected accounts</h3>
        {connections.length === 0 ? (
          <VenueEmptyState icon={Link2} title="No connections yet" description="Connect a provider below to sync content." />
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {connections.map((connection) => (
              <li key={connection.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium capitalize">
                    {connection.platform}
                    {connection.account_handle ? ` · ${connection.account_handle}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connection.last_sync ? `Last sync ${new Date(connection.last_sync).toLocaleString()}` : "Never synced"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className={HEALTH_STYLE[connection.health].className}>
                    {HEALTH_STYLE[connection.health].label}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => void disconnect(connection)} disabled={busyId === connection.id}>
                    <ShieldOff className="mr-1 h-3.5 w-3.5" /> Disconnect
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Provider catalog */}
      <section aria-label="Available providers" className="space-y-2">
        <h3 className="text-sm font-semibold">Available providers</h3>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {catalog.map((entry) => (
            <li key={entry.provider} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.docsHint}</p>
                </div>
                {entry.configured && !connections.some((c) => c.platform === entry.provider && c.has_token) ? (
                  <Button size="sm" onClick={() => connect(entry.provider)}>
                    Connect
                  </Button>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {!entry.configured && (
                  <Badge variant="outline" className="border-yellow-700 text-yellow-500">
                    Not configured ({entry.missing_env.join(", ")})
                  </Badge>
                )}
                {Object.entries(entry.capabilities).map(([cap, supported]) =>
                  supported ? (
                    <Badge key={cap} variant="outline" className="border-emerald-800 text-emerald-400">
                      {cap.replace(/_/g, " ")}
                    </Badge>
                  ) : (
                    <span key={cap} className="rounded border border-dashed px-1.5 py-0.5 text-muted-foreground line-through">
                      {cap.replace(/_/g, " ")}
                    </span>
                  ),
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {stripeNote && <p className="text-xs text-muted-foreground">{stripeNote}</p>}

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="h-3 w-3" /> Connect flows use signed OAuth state bound to your session.
      </p>
      <Link href="/settings/integrations" className="text-xs underline text-muted-foreground">
        Personal account integrations →
      </Link>
    </div>
  )
}
