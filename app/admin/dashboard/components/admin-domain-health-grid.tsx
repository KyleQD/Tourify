"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, CheckCircle2, LockKeyhole, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AdminErrorCard } from "./admin-error-card"
import { AdminSurfaceCard } from "./admin-surface-card"
import { useActingContext } from "@/hooks/use-acting-context"
import type { AdminDashboardCommandCenter, AdminDashboardDomainHealth } from "@/lib/admin/dashboard-command-center"

const STATUS_CLASS = {
  ready: "border-green-500/30 bg-green-500/10 text-green-200",
  empty: "border-slate-600 bg-slate-800/80 text-slate-300",
  denied: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  unavailable: "border-red-500/30 bg-red-500/10 text-red-200",
  stale: "border-orange-500/30 bg-orange-500/10 text-orange-200",
} as const

export function AdminDomainHealthGrid() {
  const { actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const [data, setData] = useState<AdminDashboardCommandCenter | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isActingReady) {
      setData(null)
      setLoading(true)
      return
    }
    const controller = new AbortController()
    setData(null)
    setError(null)
    setLoading(true)

    void fetch("/api/admin/dashboard/command-center", {
      credentials: "include",
      cache: "no-store",
      headers: actingHeaders,
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(body.error || "Failed to load domain health")
        setData(body.commandCenter || null)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Failed to load domain health")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [actingContextKey, actingHeaders, isActingReady])

  if (error) return <AdminErrorCard title="Domain health unavailable" message={error} onRetry={() => window.location.reload()} />

  return (
    <section aria-labelledby="admin-domain-health-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="admin-domain-health-title" className="text-lg font-semibold text-white">Organization command center</h2>
          <p className="text-sm text-slate-400">Capability-aware health and next actions for the active organization.</p>
        </div>
        {data?.degraded ? (
          <Badge className="border border-amber-500/30 bg-amber-500/10 text-amber-200">
            <AlertTriangle className="mr-1 h-3 w-3" aria-hidden="true" /> Partial data
          </Badge>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(data?.domains || Array.from({ length: 10 }, (_, index) => ({ id: `loading-${index}` }))).map((domain) => (
          <AdminSurfaceCard key={domain.id} className="flex min-h-32 flex-col justify-between p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400" aria-busy="true">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Loading…
              </div>
            ) : (
              <DomainHealthContent domain={domain as AdminDashboardDomainHealth} />
            )}
          </AdminSurfaceCard>
        ))}
      </div>
    </section>
  )
}

function DomainHealthContent({ domain }: { domain: AdminDashboardDomainHealth }) {
  return (
    <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{domain.label}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{domain.count ?? "—"}</p>
                    <p className="text-xs text-slate-400">{domain.countLabel}</p>
                  </div>
                  <Badge className={`border text-[11px] ${STATUS_CLASS[domain.status as keyof typeof STATUS_CLASS]}`}>
                    {domain.status === "denied" ? <LockKeyhole className="mr-1 h-3 w-3" aria-hidden="true" /> : <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden="true" />}
                    {domain.status}
                  </Badge>
                </div>
                {domain.status === "denied" ? (
                  <Button variant="ghost" size="sm" className="mt-3 h-7 justify-between px-0 text-slate-500" disabled>
                    Restricted <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button asChild variant="ghost" size="sm" className="mt-3 h-7 justify-between px-0 text-slate-300 hover:bg-transparent hover:text-white">
                  <Link href={domain.href} aria-disabled={(domain.status as string) === "denied"} tabIndex={(domain.status as string) === "denied" ? -1 : 0}>
                    Open <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
                )}
    </>
  )
}
