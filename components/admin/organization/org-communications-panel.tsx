'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, RefreshCw, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAdminCapabilities } from '@/hooks/use-admin-capabilities'

// ─── Types ──────────────────────────────────────────────────────────────────

interface NotifSettings {
  email_operational: boolean
  email_commercial: boolean
  email_security: boolean
  email_emergency: boolean
  quiet_hours_start: string | null
  quiet_hours_end: string | null
  quiet_hours_timezone: string
}

interface CommsSettingsResponse {
  success: boolean
  orgId: string
  settings: NotifSettings
  unavailable: boolean
  freshAt: string
}

interface FreshnessSource {
  sourceId: string
  sourceName: string
  lastCompletedAt: string | null
  isStale: boolean
  isPartial: boolean
  completenessPercent: number
  available: boolean
}

interface FreshnessResponse {
  freshness: {
    sources: FreshnessSource[]
    generatedAt: string
  }
}

type PanelState = 'idle' | 'loading' | 'ready' | 'error'

const NOTIF_CATEGORIES: { key: keyof NotifSettings; label: string; fixed?: boolean }[] = [
  { key: 'email_operational', label: 'Operational (tours, events, logistics)' },
  { key: 'email_commercial',  label: 'Commercial (finance, contracts, vendors)' },
  { key: 'email_security',    label: 'Security (access changes, audit events)' },
  { key: 'email_emergency',   label: 'Emergency alerts', fixed: true },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgCommunicationsPanel() {
  const { canAny } = useAdminCapabilities()
  const canEdit = canAny(['org.settings.manage', 'communications.send'])

  const [state, setState] = useState<PanelState>('idle')
  const [settings, setSettings] = useState<NotifSettings | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calendar freshness
  const [freshnessState, setFreshnessState] = useState<PanelState>('idle')
  const [sources, setSources] = useState<FreshnessSource[]>([])

  // Editable copy
  const [draft, setDraft] = useState<NotifSettings | null>(null)

  const loadSettings = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/communications-settings', { credentials: 'include' })
      if (!res.ok) throw new Error(`Settings unavailable (${res.status})`)
      const json: CommsSettingsResponse = await res.json()
      setSettings(json.settings)
      setDraft(json.settings)
      setUnavailable(json.unavailable)
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
      setState('error')
    }
  }

  const loadFreshness = async () => {
    setFreshnessState('loading')
    try {
      const res = await fetch('/api/admin/analytics/freshness', { credentials: 'include' })
      if (!res.ok) throw new Error()
      const json: FreshnessResponse = await res.json()
      setSources(json.freshness?.sources ?? [])
      setFreshnessState('ready')
    } catch {
      setFreshnessState('error')
    }
  }

  useEffect(() => {
    void loadSettings()
    void loadFreshness()
  }, [])

  const handleToggle = (key: keyof NotifSettings) => {
    if (!draft || !canEdit) return
    setDraft((prev) => prev ? { ...prev, [key]: !prev[key] } : prev)
  }

  const handleSave = async () => {
    if (!draft) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/admin/organization/communications-settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      if (!res.ok) throw new Error('Failed to save preferences')
      setSaveMsg('Preferences saved.')
      setSettings(draft)
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const STALE_THRESHOLD_MINUTES = 15

  return (
    <div className="space-y-6">
      {/* ── Section 1: Notification Preferences ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <CardTitle className="text-sm font-medium text-slate-300">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {state === 'loading' && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Loading preferences…
            </div>
          )}
          {state === 'error' && (
            <div>
              <p className="text-sm text-red-400">{error}</p>
              <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void loadSettings()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </div>
          )}
          {state === 'ready' && draft && (
            <>
              {/* In-app: always on */}
              <div className="flex items-center justify-between py-2 border-b border-slate-800/40">
                <div>
                  <p className="text-sm text-slate-200">In-app notifications</p>
                  <p className="text-xs text-slate-500">Always enabled — cannot be disabled</p>
                </div>
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">Always on</Badge>
              </div>

              {/* Email toggles */}
              {NOTIF_CATEGORIES.map(({ key, label, fixed }) => {
                const isOn = draft[key] as boolean
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-b-0">
                    <div>
                      <p className="text-sm text-slate-200">{label}</p>
                    </div>
                    {fixed ? (
                      <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">Always on</Badge>
                    ) : (
                      <button
                        disabled={!canEdit || unavailable}
                        onClick={() => handleToggle(key)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          isOn ? 'bg-purple-600' : 'bg-slate-600'
                        } ${(!canEdit || unavailable) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            isOn ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Quiet hours */}
              <div className="pt-2">
                <p className="text-xs font-medium text-slate-400 mb-2">Quiet Hours</p>
                <div className="flex gap-3 items-center">
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">Start</label>
                    <input
                      type="time"
                      value={draft.quiet_hours_start ?? ''}
                      disabled={!canEdit}
                      onChange={(e) => setDraft((p) => p ? { ...p, quiet_hours_start: e.target.value || null } : p)}
                      className="h-7 px-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 block mb-1">End</label>
                    <input
                      type="time"
                      value={draft.quiet_hours_end ?? ''}
                      disabled={!canEdit}
                      onChange={(e) => setDraft((p) => p ? { ...p, quiet_hours_end: e.target.value || null } : p)}
                      className="h-7 px-2 rounded bg-slate-800 border border-slate-700 text-slate-200 text-xs disabled:opacity-50"
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-4">Emergency alerts bypass quiet hours.</p>
                </div>
              </div>

              {canEdit && (
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSave}
                    className="h-7 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                  >
                    {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Save Preferences'}
                  </Button>
                  {saveMsg && (
                    <p className={`text-xs ${saveMsg.includes('saved') ? 'text-green-400' : 'text-red-400'}`}>
                      {saveMsg}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Section 2: Calendar Source Health ── */}
      <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-300">Calendar Source Freshness</CardTitle>
            <Link href="/admin/dashboard/calendar" className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
              View Calendar <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {freshnessState === 'loading' && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading freshness data…
            </div>
          )}
          {freshnessState === 'error' && (
            <p className="text-sm text-slate-400">Calendar freshness unavailable.</p>
          )}
          {freshnessState === 'ready' && (
            <div className="space-y-2">
              {sources.length === 0 ? (
                <p className="text-sm text-slate-400">No calendar sources configured.</p>
              ) : (
                sources.map((source) => {
                  const lagMin = source.lastCompletedAt
                    ? Math.round((Date.now() - new Date(source.lastCompletedAt).getTime()) / 60000)
                    : null
                  const isStale = lagMin !== null && lagMin > STALE_THRESHOLD_MINUTES
                  const statusBadge = !source.available
                    ? { label: 'unavailable', cls: 'bg-slate-600/30 text-slate-400' }
                    : isStale
                    ? { label: 'stale', cls: 'bg-yellow-500/20 text-yellow-300' }
                    : { label: 'fresh', cls: 'bg-green-500/20 text-green-300' }

                  return (
                    <div
                      key={source.sourceId}
                      className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-b-0"
                    >
                      <div>
                        <p className="text-sm text-slate-200">{source.sourceName}</p>
                        <p className="text-xs text-slate-500">
                          {lagMin !== null ? `${lagMin}m ago` : 'Never updated'}
                        </p>
                      </div>
                      <Badge className={`${statusBadge.cls} border text-xs`}>
                        {statusBadge.label}
                      </Badge>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
