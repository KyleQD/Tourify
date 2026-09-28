"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Flag, RefreshCw, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { AdminPageHeader } from "../components/admin-page-header"
import { AdminPageSkeleton } from "../components/admin-page-skeleton"
import { AdminErrorCard } from "../components/admin-error-card"
import { AdminEmptyState } from "../components/admin-empty-state"
import { AdminSurfaceCard } from "../components/admin-surface-card"
import { statusBadgeClass } from "../components/admin-badge-utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useActingContext } from "@/hooks/use-acting-context"

interface FlagDefinition {
  key: string
  display_name: string
  purpose: string
  owner: string
  environments: string[]
  safe_default: boolean
  metrics_contract: Record<string, string>
  rollback_instructions: string
  expires_at: string
  removal_issue: string
  state: "active" | "retired"
}

interface FlagAssignment {
  id: string
  flag_key: string
  environment: string
  enabled: boolean
  rollout_percentage: number
  assignment_version: number
  change_reason: string
  updated_at: string
}

interface PendingChange {
  definition: FlagDefinition
  assignment: FlagAssignment | null
  enabled: boolean
  rolloutPercentage: number
}

export default function FeaturesPage() {
  const { actingHeaders, actingContextKey, isActingReady } = useActingContext()
  const [definitions, setDefinitions] = useState<FlagDefinition[]>([])
  const [assignments, setAssignments] = useState<FlagAssignment[]>([])
  const [environment, setEnvironment] = useState("production")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    setError(null)
    setDefinitions([])
    setAssignments([])
    try {
      const response = await fetch("/api/admin/features", {
        credentials: "include",
        cache: "no-store",
        headers: { ...actingHeaders },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Feature governance is unavailable.")
      setDefinitions(payload.definitions || [])
      setAssignments(payload.assignments || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Feature governance is unavailable.")
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, isActingReady])

  useEffect(() => {
    void load()
  }, [actingContextKey, load])

  const assignmentByKey = useMemo(() => new Map(
    assignments
      .filter((assignment) => assignment.environment === environment)
      .map((assignment) => [assignment.flag_key, assignment]),
  ), [assignments, environment])

  async function saveChange() {
    if (!pending || reason.trim().length < 3) return
    setSaving(true)
    try {
      const existing = pending.assignment
      const endpoint = existing
        ? `/api/admin/features/${encodeURIComponent(pending.definition.key)}`
        : "/api/admin/features"
      const body = existing
        ? {
            environment,
            enabled: pending.enabled,
            rollout_percentage: pending.rolloutPercentage,
            reason: reason.trim(),
            expected_version: existing.assignment_version,
            idempotency_key: crypto.randomUUID(),
          }
        : {
            flag_key: pending.definition.key,
            environment,
            enabled: pending.enabled,
            rollout_percentage: pending.rolloutPercentage,
            reason: reason.trim(),
            idempotency_key: crypto.randomUUID(),
          }
      const response = await fetch(endpoint, {
        method: existing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || "Could not save this assignment.")
      const assignment = payload.assignment as FlagAssignment
      setAssignments((current) => [
        ...current.filter((item) => item.id !== assignment.id),
        assignment,
      ])
      setPending(null)
      setReason("")
      toast.success("Feature assignment saved", { description: "The reason and prior value are retained in immutable history." })
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Could not save this assignment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feature Governance"
        subtitle="Organization-scoped rollouts with safe defaults, expiry, rollback, and immutable reasons"
        icon={Flag}
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || !isActingReady} className="border-slate-700 text-slate-300">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <AdminSurfaceCard className="flex flex-wrap items-end justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-slate-200">Acting organization policy</p>
          <p className="mt-1 text-xs text-slate-500">Definitions are governed in code. This page only assigns them to the active organization.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="flag-environment" className="text-xs text-slate-400">Environment</Label>
          <select id="flag-environment" value={environment} onChange={(event) => setEnvironment(event.target.value)} className="h-9 rounded-sm border border-slate-700 bg-slate-900 px-3 text-sm text-slate-200">
            <option value="local">Local</option>
            <option value="staging">Staging</option>
            <option value="pilot">Pilot</option>
            <option value="production">Production</option>
          </select>
        </div>
      </AdminSurfaceCard>

      {!isActingReady || loading ? (
        <AdminPageSkeleton />
      ) : error ? (
        <AdminErrorCard title="Feature governance unavailable" message={error} onRetry={() => void load()} />
      ) : definitions.length === 0 ? (
        <AdminEmptyState icon={Flag} title="No governed flags" description="No active governed definitions are available. Legacy flags are preserved but are not treated as organization assignments." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {definitions.map((definition) => {
            const assignment = assignmentByKey.get(definition.key) || null
            const expired = new Date(definition.expires_at) <= new Date()
            const unavailable = definition.state === "retired" || expired || !definition.environments.includes(environment)
            const enabled = Boolean(assignment?.enabled && assignment.rollout_percentage > 0 && !unavailable)
            return (
              <AdminSurfaceCard key={definition.key} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium text-slate-100">{definition.display_name}</h2>
                      <Badge className={statusBadgeClass(unavailable ? "unavailable" : enabled ? "ready" : "disabled")}>
                        {unavailable ? "Unavailable" : enabled ? "Enabled" : "Safe default"}
                      </Badge>
                    </div>
                    <code className="mt-1 block text-xs text-slate-500">{definition.key}</code>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-purple-400" aria-hidden="true" />
                </div>
                <p className="text-sm text-slate-300">{definition.purpose}</p>
                <dl className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                  <div><dt className="text-slate-500">Owner</dt><dd>{definition.owner}</dd></div>
                  <div><dt className="text-slate-500">Rollout</dt><dd>{assignment ? `${assignment.rollout_percentage}%` : "Not assigned"}</dd></div>
                  <div><dt className="text-slate-500">Expiry</dt><dd>{new Date(definition.expires_at).toLocaleDateString()}</dd></div>
                  <div><dt className="text-slate-500">Removal issue</dt><dd>{definition.removal_issue}</dd></div>
                </dl>
                <div className="rounded-sm border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                  <span className="font-medium text-slate-300">Rollback:</span> {definition.rollback_instructions}
                </div>
                <Button
                  size="sm"
                  disabled={unavailable}
                  onClick={() => {
                    setPending({
                      definition,
                      assignment,
                      enabled: assignment ? !assignment.enabled : true,
                      rolloutPercentage: assignment?.rollout_percentage || 100,
                    })
                    setReason("")
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                >
                  {assignment ? (assignment.enabled ? "Review disable" : "Review enable") : "Configure assignment"}
                </Button>
              </AdminSurfaceCard>
            )
          })}
        </div>
      )}

      <Dialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="border-slate-700 bg-slate-900">
          <DialogHeader><DialogTitle className="text-slate-100">Review organization rollout</DialogTitle></DialogHeader>
          {pending ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">{pending.definition.display_name} will be {pending.enabled ? "enabled" : "disabled"} for {environment}.</p>
              <div className="space-y-1">
                <Label htmlFor="rollout">Rollout percentage</Label>
                <Input id="rollout" type="number" min={0} max={100} value={pending.rolloutPercentage} onChange={(event) => setPending({ ...pending, rolloutPercentage: Math.max(0, Math.min(100, Number(event.target.value))) })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="reason">Reason (required)</Label>
                <Textarea id="reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this safe, and what evidence supports the rollout?" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void saveChange()} disabled={saving || reason.trim().length < 3}>Confirm change</Button>
                <Button variant="outline" onClick={() => setPending(null)} disabled={saving}>Cancel</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
