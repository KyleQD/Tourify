"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, RefreshCw, Filter, ChevronLeft, ChevronRight, User, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminPageHeader } from "../../components/admin-page-header"
import { AdminPageSkeleton } from "../../components/admin-page-skeleton"
import { AdminErrorCard } from "../../components/admin-error-card"
import { AdminEmptyState } from "../../components/admin-empty-state"

interface AuditLog {
  id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
  actor?: {
    id: string
    full_name: string
    username: string
    avatar_url?: string
  }
}

const ACTION_COLORS: Record<string, string> = {
  create:    "bg-green-500/20 text-green-300 border-green-500/30",
  update:    "bg-blue-500/20 text-blue-300 border-blue-500/30",
  delete:    "bg-red-500/20 text-red-300 border-red-500/30",
  publish:   "bg-purple-500/20 text-purple-300 border-purple-500/30",
  unpublish: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  settle:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  refund:    "bg-orange-500/20 text-orange-300 border-orange-500/30",
  hire:      "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  fire:      "bg-rose-500/20 text-rose-300 border-rose-500/30",
  flag:      "bg-amber-500/20 text-amber-300 border-amber-500/30",
  toggle:    "bg-slate-500/20 text-slate-300 border-slate-500/30",
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entityType, setEntityType] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" })
      if (entityType !== "all") params.set("entity_type", entityType)
      if (from) params.set("from", from)
      if (to) params.set("to", to + "T23:59:59Z")
      const res = await fetch(`/api/admin/audit?${params}`)
      if (!res.ok) throw new Error("Failed to load audit log")
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [page, entityType, from, to])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (isLoading && logs.length === 0) return <AdminPageSkeleton />
  if (error) return <AdminErrorCard message={error} onRetry={fetchLogs} />

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit Log"
        subtitle={`${total.toLocaleString()} events recorded`}
        icon={Shield}
        actions={
          <Button variant="outline" size="sm" onClick={fetchLogs} className="border-slate-700 text-slate-300">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-400">Filter</span>
            </div>
            <div className="w-44">
              <Select value={entityType} onValueChange={v => { setEntityType(v); setPage(1) }}>
                <SelectTrigger className="h-8 text-sm bg-slate-800 border-slate-700 text-slate-200">
                  <SelectValue placeholder="Entity type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {["all", "event", "tour", "transaction", "settlement", "staff", "rbac", "ticket", "feature_flag", "content", "artist", "venue"].map(t => (
                    <SelectItem key={t} value={t} className="text-slate-200 capitalize">{t === "all" ? "All types" : t.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <Input
                type="date"
                value={from}
                onChange={e => { setFrom(e.target.value); setPage(1) }}
                className="h-8 w-36 text-sm bg-slate-800 border-slate-700 text-slate-200"
                aria-label="From date"
              />
              <span className="text-slate-500 text-sm">to</span>
              <Input
                type="date"
                value={to}
                onChange={e => { setTo(e.target.value); setPage(1) }}
                className="h-8 w-36 text-sm bg-slate-800 border-slate-700 text-slate-200"
                aria-label="To date"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <AdminEmptyState
          icon={Shield}
          title="No audit events yet"
          description="Admin actions like publishing events, creating transactions, and managing staff will be recorded here."
        />
      ) : (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-300">
              Showing {logs.length} of {total.toLocaleString()} events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-800">
              {logs.map(log => (
                <div key={log.id} className="px-6 py-3 flex items-start gap-4 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-7 w-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        <span className="font-medium">{log.actor?.full_name || log.actor?.username || "Unknown"}</span>
                        {" "}
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ACTION_COLORS[log.action] || ACTION_COLORS.toggle}`}>
                          {log.action}
                        </Badge>
                        {" "}
                        <span className="text-slate-400 capitalize">{log.entity_type.replace("_", " ")}</span>
                        {log.entity_id && (
                          <span className="text-slate-600 text-xs ml-1 font-mono">{log.entity_id.slice(0, 8)}…</span>
                        )}
                      </p>
                      {log.ip_address && (
                        <p className="text-[11px] text-slate-600 mt-0.5">IP: {log.ip_address}</p>
                      )}
                    </div>
                  </div>
                  <time className="text-xs text-slate-500 shrink-0 mt-0.5">{formatTime(log.created_at)}</time>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800">
                <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="h-7 border-slate-700 text-slate-300"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="h-7 border-slate-700 text-slate-300"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
