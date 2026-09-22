"use client"

import { useEffect, useState } from "react"

interface ProviderStatus {
  providers: {
    ticketmaster: { enabled: boolean; health: { ok: boolean; latencyMs: number | null; errorCode: string | null } | null }
    bandsintown: { mode: string; health: { ok: boolean } | null }
  }
  configIssues: Array<{ provider: string; variable: string; message: string }>
}

export default function ProvidersClient() {
  const [status, setStatus] = useState<ProviderStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/event-providers", { credentials: "include" })
      if (!res.ok) {
        setError(`Failed to load (${res.status})`)
        return
      }
      setStatus(await res.json())
    })()
  }, [])

  return (
    <div className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-semibold">Event providers</h1>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {status && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-medium">Ticketmaster</h2>
            <p className="mt-1 text-sm text-slate-300">
              Enabled: {status.providers.ticketmaster.enabled ? "yes" : "no"}
            </p>
            {status.providers.ticketmaster.health && (
              <p className="text-sm text-slate-300">
                Health: {status.providers.ticketmaster.health.ok ? "ok" : `failing (${status.providers.ticketmaster.health.errorCode})`}
                {status.providers.ticketmaster.health.latencyMs != null && ` · ${status.providers.ticketmaster.health.latencyMs}ms`}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="font-medium">Bandsintown</h2>
            <p className="mt-1 text-sm text-slate-300">Mode: {status.providers.bandsintown.mode}</p>
          </div>
        </div>
      )}
      {status && status.configIssues.length > 0 && (
        <div className="rounded-lg border border-amber-700/50 bg-amber-500/10 p-4 text-sm text-amber-200">
          <h2 className="font-medium">Configuration issues</h2>
          <ul className="mt-1 list-disc pl-5">
            {status.configIssues.map((issue) => (
              <li key={`${issue.provider}-${issue.variable}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
