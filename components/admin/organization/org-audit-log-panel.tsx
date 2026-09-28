'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ScrollText, ChevronLeft, ChevronRight, ExternalLink, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminEmptyState } from '@/app/admin/dashboard/components/admin-empty-state'

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'loading' | 'ready' | 'error'

interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  created_at: string
  actor?: {
    id: string
    full_name: string
    username: string
  }
}

interface AuditResponse {
  logs: AuditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ─── Action colours (mirrors settings/audit/page.tsx) ────────────────────────

const ACTION_COLORS: Record<string, string> = {
  create:    'bg-green-500/20 text-green-300 border-green-500/30',
  update:    'bg-blue-500/20 text-blue-300 border-blue-500/30',
  delete:    'bg-red-500/20 text-red-300 border-red-500/30',
  publish:   'bg-purple-500/20 text-purple-300 border-purple-500/30',
  settle:    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  refund:    'bg-orange-500/20 text-orange-300 border-orange-500/30',
  hire:      'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  flag:      'bg-amber-500/20 text-amber-300 border-amber-500/30',
}

const DEFAULT_ACTION_COLOR = 'bg-slate-500/20 text-slate-300 border-slate-500/30'

const RESULT_COLORS: Record<string, string> = {
  success: 'bg-green-500/20 text-green-300 border-green-500/30',
  denied:  'bg-red-500/20 text-red-300 border-red-500/30',
  failed:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function truncate(str: string | undefined, len: number) {
  if (!str) return '—'
  return str.length <= len ? str : str.slice(0, len) + '…'
}

function actionBadge(action: string) {
  const cls = ACTION_COLORS[action] ?? DEFAULT_ACTION_COLOR
  return (
    <Badge className={`border text-xs font-mono ${cls}`}>
      {action}
    </Badge>
  )
}

function resultBadge(result: string | undefined) {
  if (!result) return null
  const cls = RESULT_COLORS[result] ?? DEFAULT_ACTION_COLOR
  return (
    <Badge className={`border text-xs ${cls}`}>
      {result}
    </Badge>
  )
}

// ─── Action options ───────────────────────────────────────────────────────────

const ACTION_OPTIONS = ['', 'create', 'update', 'delete', 'publish', 'settle', 'refund', 'hire', 'flag']

// ─── Panel ───────────────────────────────────────────────────────────────────

export function OrgAuditLogPanel() {
  const [panelState, setPanelState] = useState<PanelState>('idle')
  const [data, setData] = useState<AuditResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [action, setAction] = useState('')
  const [actorId, setActorId] = useState('')
  const [entityType, setEntityType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const fetchLogs = useCallback(async (pg: number = page) => {
    setPanelState('loading')
    setError(null)
    try {
      const params = new URLSearchParams({
        limit: '50',
        page: String(pg),
        ...(action     && { action }),
        ...(actorId    && { actor_id: actorId }),
        ...(entityType && { entity_type: entityType }),
        ...(from       && { from }),
        ...(to         && { to }),
      })
      const res = await fetch(`/api/admin/audit?${params.toString()}`)
      if (!res.ok) throw new Error(await res.text())
      const json: AuditResponse = await res.json()
      setData(json)
      setPage(pg)
      setPanelState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
      setPanelState('error')
    }
  }, [action, actorId, entityType, from, to, page])

  function handleApply() {
    fetchLogs(1)
  }

  function handleClear() {
    setAction('')
    setActorId('')
    setEntityType('')
    setFrom('')
    setTo('')
    setPage(1)
    setData(null)
    setPanelState('idle')
  }

  function handlePrev() {
    if (page > 1) fetchLogs(page - 1)
  }

  function handleNext() {
    if (data && page < data.totalPages) fetchLogs(page + 1)
  }

  const isLoading = panelState === 'loading'
  const logs = data?.logs ?? []

  return (
    <div className="space-y-4">
      {/* ── Filter bar ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-200 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-slate-400" />
            Audit Log
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            {/* Action dropdown */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Action</label>
              <select
                value={action}
                onChange={e => setAction(e.target.value)}
                className="h-8 rounded-sm bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {ACTION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt === '' ? '(all)' : opt}</option>
                ))}
              </select>
            </div>

            {/* Actor */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Actor</label>
              <input
                value={actorId}
                onChange={e => setActorId(e.target.value)}
                placeholder="Actor ID or name"
                className="h-8 rounded-sm bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Entity type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">Entity type</label>
              <input
                value={entityType}
                onChange={e => setEntityType(e.target.value)}
                placeholder="Entity type"
                className="h-8 rounded-sm bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* From date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">From</label>
              <input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="h-8 rounded-sm bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* To date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400">To</label>
              <input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="h-8 rounded-sm bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 items-end pb-0.5">
              <Button
                size="sm"
                onClick={handleApply}
                disabled={panelState === 'loading'}
                className="h-8 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-0 text-xs"
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClear}
                className="h-8 border-slate-600 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Results ── */}
      {panelState === 'idle' && (
        <p className="text-xs text-slate-500 text-center py-4">Apply filters to load audit events.</p>
      )}

      {panelState === 'loading' && (
        <p className="text-xs text-slate-400 text-center py-4 animate-pulse">Loading…</p>
      )}

      {panelState === 'error' && (
        <p className="text-xs text-red-400 text-center py-4">{error}</p>
      )}

      {panelState === 'ready' && logs.length === 0 && (
        <AdminEmptyState
          icon={ScrollText}
          title="No audit events"
          description="No audit events match these filters."
        />
      )}

      {panelState === 'ready' && logs.length > 0 && (
        <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 text-slate-400">
                    <th className="text-left px-4 py-2 font-medium">Timestamp</th>
                    <th className="text-left px-4 py-2 font-medium">Actor</th>
                    <th className="text-left px-4 py-2 font-medium">Action</th>
                    <th className="text-left px-4 py-2 font-medium">Entity Type</th>
                    <th className="text-left px-4 py-2 font-medium">Entity ID</th>
                    <th className="text-left px-4 py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td className="px-4 py-2 text-slate-300 whitespace-nowrap">
                        {log.actor?.full_name ?? log.actor?.username ?? (log.actor_id ? truncate(log.actor_id, 8) : '[system]')}
                      </td>
                      <td className="px-4 py-2">{actionBadge(log.action)}</td>
                      <td className="px-4 py-2 text-slate-400">{log.entity_type}</td>
                      <td className="px-4 py-2 text-slate-500 font-mono">{truncate(log.entity_id, 8)}</td>
                      <td className="px-4 py-2">
                        {resultBadge((log as AuditLog & { result?: string }).result)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700/50">
              <span className="text-slate-500 text-xs">
                Page {data?.page} of {data?.totalPages} · {data?.total} total
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrev}
                  disabled={page <= 1 || isLoading}
                  className="h-7 w-7 p-0 border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNext}
                  disabled={!data || page >= data.totalPages || isLoading}
                  className="h-7 w-7 p-0 border-slate-700 text-slate-400 hover:bg-slate-800"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Footer links */}
            <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-800/60">
              <button
                onClick={() => { window.location.href = '/api/admin/audit?format=csv' }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Download className="h-3 w-3" />
                Export CSV
              </button>
              <Link
                href="/admin/dashboard/settings/audit"
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open Full Log
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
