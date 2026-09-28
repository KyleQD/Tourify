"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, ChevronDown, ChevronRight, CircleDashed, RefreshCw, UserCheck, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useActingContext } from "@/hooks/use-acting-context"

function extractErrorMsg(json: unknown, fallback: string): string {
  if (typeof json === "object" && json !== null) {
    const j = json as Record<string, unknown>
    if (typeof j.error === "string") return j.error
    if (typeof j.message === "string") return j.message
  }
  return fallback
}

type ConversionStatus = "pending" | "in_progress" | "complete" | "rolled_back" | "failed"

interface ConversionStep {
  step: string
  completed: boolean
  completed_at?: string
  error?: string
}

interface IdentityConversion {
  id: string
  applicantName: string
  applicantEmail: string
  role: string
  department: string
  status: ConversionStatus
  steps: ConversionStep[]
  rollbackReason: string | null
  createdAt: string
  updatedAt: string
}

interface ConversionsResponse {
  conversions: IdentityConversion[]
  unavailable?: boolean
  unavailableReason?: string
  freshAt: string
}

const STATUS_BADGE: Record<ConversionStatus, string> = {
  pending: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  in_progress: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  complete: "bg-green-500/20 text-green-300 border-green-500/30",
  rolled_back: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
}

const STATUS_LABELS: Record<ConversionStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  complete: "Complete",
  rolled_back: "Rolled Back",
  failed: "Failed",
}

const STEP_LABELS: Record<string, string> = {
  create_org_person: "Create Org Person",
  create_tour_role: "Create Tour Role",
  grant_work_mode: "Grant Work Mode",
  update_onboarding: "Update Onboarding",
  update_offer: "Update Offer",
  update_requisition: "Update Requisition",
}

function StepIndicator({ step }: { step: ConversionStep }) {
  if (step.completed) return <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" aria-label="complete" />
  if (step.error) return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" aria-label="failed" />
  return <CircleDashed className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-label="pending" />
}

function ConversionRow({ conversion }: { conversion: IdentityConversion }) {
  const [expanded, setExpanded] = useState(false)
  const completedSteps = conversion.steps.filter((s) => s.completed).length
  const totalSteps = conversion.steps.length

  return (
    <div className="border border-slate-700/50 rounded-sm bg-slate-900/40">
      <button
        type="button"
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-slate-800/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100 truncate">{conversion.applicantName}</p>
          <p className="text-xs text-slate-400 truncate">{conversion.role} · {conversion.department}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400">{completedSteps}/{totalSteps} steps</span>
          <Badge className={`text-[10px] px-1.5 py-0 border ${STATUS_BADGE[conversion.status]}`}>
            {STATUS_LABELS[conversion.status]}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-slate-700/40 pt-2 space-y-1.5">
          <p className="text-xs text-slate-400 mb-2">{conversion.applicantEmail}</p>
          {conversion.steps.map((step) => (
            <div key={step.step} className="flex items-center gap-2">
              <StepIndicator step={step} />
              <span className="text-xs text-slate-300">{STEP_LABELS[step.step] ?? step.step}</span>
              {step.completed_at && (
                <span className="text-[10px] text-slate-500 ml-auto">
                  {new Date(step.completed_at).toLocaleDateString()}
                </span>
              )}
              {step.error && <span className="text-[10px] text-red-400 ml-1">{step.error}</span>}
            </div>
          ))}
          {conversion.rollbackReason && (
            <p className="text-xs text-orange-400 mt-2">Rollback: {conversion.rollbackReason}</p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * w12-hiring-roster-handoff
 * HIRE-406 / WORK-103 — hired candidate → canonical worker/roster identity conversion panel.
 * Mounts inside the Roster tab of StaffOperationsTabs.
 */
export function HiringRosterHandoffPanel() {
  const { actingAccount } = useActingContext()
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable" | "error">("idle")
  const [conversions, setConversions] = useState<IdentityConversion[]>([])
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [freshAt, setFreshAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState("loading")
    setErrorMsg(null)
    try {
      const res = await fetch("/api/admin/workforce/conversions?limit=25")
      const json = (await res.json()) as ConversionsResponse & { error?: string }
      if (!res.ok) {
        setErrorMsg(extractErrorMsg(json, "Failed to load conversion records"))
        setState("error")
        return
      }
      if (json.unavailable) {
        setUnavailableReason(json.unavailableReason ?? "Not yet available")
        setState("unavailable")
        return
      }
      setConversions(json.conversions ?? [])
      setFreshAt(json.freshAt)
      setState("ready")
    } catch {
      setErrorMsg("Network error loading conversion records")
      setState("error")
    }
  }, [])

  useEffect(() => {
    if (actingAccount !== undefined) void load()
  }, [actingAccount, load])

  if (state === "idle" || state === "loading") {
    return (
      <Card className="bg-slate-900/60 border border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-busy="true" />
            Loading conversion records…
          </div>
        </CardContent>
      </Card>
    )
  }

  if (state === "unavailable") {
    return (
      <Card className="bg-slate-900/60 border border-dashed border-slate-700/50 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-slate-400">{unavailableReason ?? "Roster handoff not yet available."}</p>
        </CardContent>
      </Card>
    )
  }

  if (state === "error") {
    return (
      <Card className="bg-slate-900/60 border border-red-500/30 rounded-sm">
        <CardContent className="p-4">
          <p className="text-sm text-red-400">{errorMsg ?? "Failed to load conversion records."}</p>
          <Button variant="ghost" size="sm" className="mt-2 text-slate-300" onClick={() => void load()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-sm font-medium text-slate-100">Roster Handoff</CardTitle>
            <Badge className="bg-slate-700/60 text-slate-300 border-slate-600/50 text-[10px] px-1.5">
              {conversions.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400" onClick={() => void load()} title="Refresh">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {freshAt && (
          <p className="text-[10px] text-slate-500 mt-0.5">
            Fresh at {new Date(freshAt).toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {conversions.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No active conversion records.</p>
        ) : (
          conversions.map((conv) => <ConversionRow key={conv.id} conversion={conv} />)
        )}
      </CardContent>
    </Card>
  )
}
