"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ClipboardList, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

interface AccessReviewItem {
  entityType: string
  entityId: string
  userId: string
  role: string
  grantedAt: string | null
  lastActiveAt: string | null
  isPrivileged: boolean
}

interface AccessReviewResponse {
  items: AccessReviewItem[]
  reviewedAt: string
  unavailable?: boolean
  unavailableReason?: string
}

const PRIVILEGED_ROLES = ["owner", "admin", "tour_manager"]

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
  }
  return fallback
}

export function AccessReviewPanel() {
  const { actingHeaders, isActingReady, actingContextKey } = useActingContext()
  const [data, setData] = useState<AccessReviewResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    setError(null)
    try {
      // Aggregate data from entity-grants + rbac members for review
      const [membersRes, grantsRes] = await Promise.all([
        fetch("/api/admin/rbac/members", {
          credentials: "include",
          cache: "no-store",
          headers: { ...actingHeaders, "Cache-Control": "no-cache" },
        }),
        fetch("/api/admin/entity-grants?include_expired=false", {
          credentials: "include",
          cache: "no-store",
          headers: { ...actingHeaders, "Cache-Control": "no-cache" },
        }),
      ])

      const [membersJson, grantsJson] = await Promise.all([
        membersRes.json().catch(() => ({})),
        grantsRes.json().catch(() => ({})),
      ])

      if (!membersRes.ok) {
        setError(extractErrorMsg(membersJson, "Unable to load access review data"))
        setData(null)
        return
      }

      const members: AccessReviewItem[] = (Array.isArray(membersJson.members) ? membersJson.members : [])
        .filter((m: Record<string, unknown>) => m.status === "active")
        .map((m: Record<string, unknown>) => ({
          entityType: "org",
          entityId: "current",
          userId: String(m.userId),
          role: String(m.role ?? "member"),
          grantedAt: m.activatedAt ? String(m.activatedAt) : null,
          lastActiveAt: null,
          isPrivileged: PRIVILEGED_ROLES.includes(String(m.role ?? "member")),
        }))

      const grants: AccessReviewItem[] = (Array.isArray(grantsJson.grants) ? grantsJson.grants : [])
        .map((g: Record<string, unknown>) => ({
          entityType: String(g.resource_type ?? g.resourceType ?? "resource"),
          entityId: String(g.resource_id ?? g.resourceId ?? ""),
          userId: g.grantee_user_id ? String(g.grantee_user_id) : String(g.grantee_email ?? "external"),
          role: "grant",
          grantedAt: g.created_at ? String(g.created_at) : null,
          lastActiveAt: null,
          isPrivileged: true,
        }))

      setData({
        items: [...members, ...grants],
        reviewedAt: new Date().toISOString(),
      })
    } catch {
      setError("Unable to load access review data")
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [load, actingContextKey])

  const items = data?.items ?? []
  const privileged = items.filter((i) => i.isPrivileged)

  return (
    <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-cyan-400" />
            Access Review
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            SEC-604 · {privileged.length} privileged access{privileged.length !== 1 ? "es" : ""} · {items.length} total
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          onClick={() => void load()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {isLoading && !data ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
          </div>
        ) : null}

        {!error && data && items.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No active access records found.</p>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wide">
                  <th className="py-2 pr-3 text-left font-medium">Principal</th>
                  <th className="py-2 pr-3 text-left font-medium">Scope</th>
                  <th className="py-2 pr-3 text-left font-medium hidden md:table-cell">Role</th>
                  <th className="py-2 text-left font-medium hidden lg:table-cell">Granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {items.map((item, i) => (
                  <tr key={`${item.userId}-${item.entityId}-${i}`} className={`hover:bg-slate-800/30 transition-colors ${item.isPrivileged ? "bg-yellow-900/5" : ""}`}>
                    <td className="py-2 pr-3 text-slate-400 font-mono text-xs">
                      {item.userId.length > 12 ? `${item.userId.slice(0, 8)}…` : item.userId}
                    </td>
                    <td className="py-2 pr-3 text-slate-300 text-xs">
                      {item.entityType}{item.entityId !== "current" ? ` (${item.entityId.slice(0, 6)}…)` : ""}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium border ${item.isPrivileged ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" : "bg-slate-500/20 text-slate-300 border-slate-500/30"}`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="py-2 text-slate-500 text-xs hidden lg:table-cell">
                      {item.grantedAt ? new Date(item.grantedAt).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
