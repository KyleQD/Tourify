'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, Settings, AlertTriangle, ExternalLink, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

interface SettingsData {
  success: boolean
  orgId: string
  profileId: string
  organizationName: string | null
  organizationType: string | null
  subtype: string | null
  urlSlug: string | null
  timeZone: string | null
  baseCurrency: string | null
  version: number | null
  canEdit: boolean
  settingsUnavailable: boolean
  settingsUnavailableReason?: string
  freshAt: string
}

interface FeatureFlag {
  flag_key: string
  environment: string
  enabled: boolean
  rollout_percentage?: number
  reason?: string
}

// ─── IANA timezone groups (common zones) ─────────────────────────────────────

const TIMEZONE_OPTIONS: Array<{ group: string; zones: string[] }> = [
  {
    group: 'Americas',
    zones: [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu',
      'America/Toronto',
      'America/Vancouver',
      'America/Mexico_City',
      'America/Sao_Paulo',
      'America/Buenos_Aires',
    ],
  },
  {
    group: 'Europe',
    zones: [
      'Europe/London',
      'Europe/Dublin',
      'Europe/Paris',
      'Europe/Berlin',
      'Europe/Amsterdam',
      'Europe/Madrid',
      'Europe/Rome',
      'Europe/Stockholm',
      'Europe/Zurich',
      'Europe/Moscow',
    ],
  },
  {
    group: 'Asia / Pacific',
    zones: [
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Bangkok',
      'Asia/Singapore',
      'Asia/Tokyo',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Australia/Sydney',
      'Australia/Melbourne',
      'Pacific/Auckland',
    ],
  },
  {
    group: 'Africa / Middle East',
    zones: [
      'Africa/Cairo',
      'Africa/Johannesburg',
      'Africa/Lagos',
      'Asia/Jerusalem',
      'Asia/Riyadh',
    ],
  },
  {
    group: 'UTC',
    zones: ['UTC'],
  },
]

// ─── Common ISO 4217 currencies ───────────────────────────────────────────────

const CURRENCY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'JPY', label: 'JPY — Japanese Yen' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'AED', label: 'AED — UAE Dirham' },
]

// ─── Card chrome ──────────────────────────────────────────────────────────────

const CARD = 'bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm p-5'
const CARD_DASHED = 'border-dashed border-slate-700/50 bg-slate-900/30 rounded-sm p-5'
const CARD_ERROR = 'border border-red-500/30 bg-slate-900/60 rounded-sm p-5'
const LABEL_CLASS = 'block text-xs font-medium text-slate-400 mb-1'
const VALUE_CLASS = 'text-sm text-slate-200'

// ─── Component ───────────────────────────────────────────────────────────────

export function OrgSettingsPanel() {
  const [panelState, setPanelState] = useState<PanelState>('loading')
  const [data, setData] = useState<SettingsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Editable form state
  const [timeZone, setTimeZone] = useState<string>('')
  const [baseCurrency, setBaseCurrency] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Feature flags
  const [flagsState, setFlagsState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [definitions, setDefinitions] = useState<Array<{ key: string; description?: string }>>([])
  const [assignments, setAssignments] = useState<FeatureFlag[]>([])

  const load = useCallback(async () => {
    setPanelState('loading')
    setError(null)
    try {
      const res = await fetch('/api/admin/organization/settings', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>
        setError(String(body.error ?? 'Failed to load settings.'))
        setPanelState('error')
        return
      }
      const body = (await res.json()) as SettingsData
      setData(body)
      setTimeZone(body.timeZone ?? '')
      setBaseCurrency(body.baseCurrency ?? '')
      setPanelState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.')
      setPanelState('error')
    }
  }, [])

  const loadFlags = useCallback(async () => {
    setFlagsState('loading')
    try {
      const res = await fetch('/api/admin/features', { credentials: 'include' })
      if (!res.ok) {
        setFlagsState('unavailable')
        return
      }
      const body = await res.json() as {
        definitions?: Array<{ key: string; description?: string }>
        assignments?: FeatureFlag[]
      }
      setDefinitions(body.definitions ?? [])
      setAssignments(body.assignments ?? [])
      setFlagsState('ready')
    } catch {
      setFlagsState('unavailable')
    }
  }, [])

  useEffect(() => {
    load()
    loadFlags()
  }, [load, loadFlags])

  async function handleSave() {
    if (!data) return
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch('/api/admin/organization/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeZone: timeZone || undefined,
          baseCurrency: baseCurrency || undefined,
          expectedVersion: data.version ?? 0,
        }),
      })
      const body = await res.json() as Record<string, unknown>
      if (res.status === 409) {
        setSaveError('Settings changed elsewhere — please reload')
        return
      }
      if (!res.ok) {
        setSaveError(String(body.error ?? 'Failed to save settings.'))
        return
      }
      // Refresh data with updated version
      await load()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (panelState === 'loading') {
    return (
      <div className={CARD}>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading organization settings…</span>
        </div>
      </div>
    )
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (panelState === 'error' || !data) {
    return (
      <div className={CARD_ERROR}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Failed to load settings</p>
            <p className="text-xs text-slate-400 mt-1">{error ?? 'An unexpected error occurred.'}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs border-slate-700/50 text-slate-300 hover:bg-slate-800"
              onClick={load}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const canEdit = data.canEdit && !data.settingsUnavailable

  return (
    <div className="space-y-6">

      {/* ── Org Identity ─────────────────────────────────────────────── */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-400" />
          Organization Identity
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <span className={LABEL_CLASS}>Display Name</span>
            <span className={VALUE_CLASS}>{data.organizationName ?? '—'}</span>
          </div>
          <div>
            <span className={LABEL_CLASS}>Account Type</span>
            <span className={VALUE_CLASS}>{data.organizationType ?? '—'}</span>
          </div>
          {data.subtype && (
            <div>
              <span className={LABEL_CLASS}>Subtype</span>
              <span className={VALUE_CLASS}>{data.subtype}</span>
            </div>
          )}
          {data.urlSlug && (
            <div>
              <span className={LABEL_CLASS}>URL Slug</span>
              <span className={VALUE_CLASS}>/{data.urlSlug}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Configuration ────────────────────────────────────────────── */}
      <div className={CARD}>
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Configuration</h3>

        {data.settingsUnavailable ? (
          <div className={CARD_DASHED}>
            <p className="text-xs text-slate-500 text-center py-2">
              Time zone and currency settings are not yet configured.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Time Zone */}
            <div>
              <label className={LABEL_CLASS}>Default Time Zone</label>
              {canEdit ? (
                <Select
                  value={timeZone}
                  onValueChange={setTimeZone}
                  disabled={isSaving}
                >
                  <SelectTrigger className="bg-slate-800/60 border-slate-700/50 text-slate-200 text-sm rounded-sm w-full max-w-xs">
                    <SelectValue placeholder="Select time zone…" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700/50">
                    {TIMEZONE_OPTIONS.map((group) => (
                      <div key={group.group}>
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {group.group}
                        </div>
                        {group.zones.map((zone) => (
                          <SelectItem
                            key={zone}
                            value={zone}
                            className="text-sm text-slate-200 focus:bg-slate-800"
                          >
                            {zone}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={VALUE_CLASS}>{timeZone || '—'}</span>
              )}
            </div>

            {/* Base Currency */}
            <div>
              <label className={LABEL_CLASS}>Base Currency</label>
              {canEdit ? (
                <Select
                  value={baseCurrency}
                  onValueChange={setBaseCurrency}
                  disabled={isSaving}
                >
                  <SelectTrigger className="bg-slate-800/60 border-slate-700/50 text-slate-200 text-sm rounded-sm w-full max-w-xs">
                    <SelectValue placeholder="Select currency…" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700/50">
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem
                        key={c.code}
                        value={c.code}
                        className="text-sm text-slate-200 focus:bg-slate-800"
                      >
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={VALUE_CLASS}>{baseCurrency || '—'}</span>
              )}
            </div>

            {/* Save */}
            {canEdit && (
              <div className="flex items-center gap-3 pt-1">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-purple-700 hover:bg-purple-600 text-white text-xs rounded-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                      Saving…
                    </>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
                {saveSuccess && (
                  <span className="text-xs text-green-400">Settings saved.</span>
                )}
                {saveError && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {saveError}
                  </span>
                )}
              </div>
            )}

            {!data.canEdit && (
              <p className="text-xs text-slate-500">
                You need the <code className="text-slate-400">org.settings.manage</code> capability to edit these settings.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Feature Flags ─────────────────────────────────────────────── */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Flag className="h-4 w-4 text-slate-400" />
            Feature Flags
          </h3>
          <Link
            href="/admin/dashboard/features"
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
          >
            Manage Flags
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {flagsState === 'loading' && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-slate-800/50 rounded-sm animate-pulse" />
            ))}
          </div>
        )}

        {flagsState === 'unavailable' && (
          <div className={CARD_DASHED}>
            <p className="text-xs text-slate-500 text-center py-2">
              Feature flag data is unavailable. You may not have the{' '}
              <code className="text-slate-400">org.settings.manage</code> capability.
            </p>
          </div>
        )}

        {flagsState === 'ready' && assignments.length === 0 && (
          <p className="text-xs text-slate-500">No feature flags are assigned to this organization.</p>
        )}

        {flagsState === 'ready' && assignments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium">Flag Key</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium">Environment</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium">Status</th>
                  <th className="text-left py-2 pr-4 text-slate-400 font-medium">Rollout</th>
                  <th className="text-left py-2 text-slate-400 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((flag, i) => {
                  const def = definitions.find((d) => d.key === flag.flag_key)
                  return (
                    <tr
                      key={`${flag.flag_key}-${flag.environment}`}
                      className={i % 2 === 0 ? 'bg-slate-800/20' : ''}
                    >
                      <td className="py-2 pr-4 text-slate-300 font-mono">
                        {flag.flag_key}
                        {def?.description && (
                          <span className="block text-slate-500 font-sans text-[10px]">{def.description}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-slate-400">{flag.environment}</td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant="outline"
                          className={
                            flag.enabled
                              ? 'border-green-500/40 text-green-400 text-[10px]'
                              : 'border-slate-600 text-slate-500 text-[10px]'
                          }
                        >
                          {flag.enabled ? 'enabled' : 'disabled'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-400">
                        {flag.rollout_percentage != null && flag.rollout_percentage > 0
                          ? `${flag.rollout_percentage}%`
                          : '—'}
                      </td>
                      <td className="py-2 text-slate-500 max-w-xs truncate">{flag.reason ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
