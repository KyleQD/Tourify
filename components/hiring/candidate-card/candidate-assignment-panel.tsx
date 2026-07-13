"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EventSelect } from "@/components/events/event-select"
import { useToast } from "@/hooks/use-toast"
import { getEmployerQueryString } from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringCandidate } from "@/types/hiring-candidate-workflow"
import type { HiringEntity } from "@/types/hiring-entity"
import { WorkforcePanel } from "@/components/hiring/workforce-ui"

interface CandidateAssignmentPanelProps {
  candidate: HiringCandidate
  employer: HiringEntity
  onUpdated: () => void
}

interface ManagerOption {
  id: string
  name: string
}

interface ShiftOption {
  id: string
  label: string
}

function resolveVenueId(employer: HiringEntity): string | null {
  if (employer.entityType === "venue") return employer.entityId
  return employer.scope?.venueId ?? null
}

export function CandidateAssignmentPanel({ candidate, employer, onUpdated }: CandidateAssignmentPanelProps) {
  const { toast } = useToast()
  const employerQuery = getEmployerQueryString(employer)
  const venueId = useMemo(() => resolveVenueId(employer), [employer])

  const [eventId, setEventId] = useState<string>(candidate.assignment?.eventId ?? "")
  const [shiftId, setShiftId] = useState<string>(candidate.assignment?.shiftId ?? "")
  const [managerId, setManagerId] = useState<string>(candidate.assignment?.managerId ?? "")
  const [managerName, setManagerName] = useState<string>(candidate.assignment?.managerName ?? "")
  const [position, setPosition] = useState<string>(candidate.position ?? "")
  const [notes, setNotes] = useState<string>("")

  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [shifts, setShifts] = useState<ShiftOption[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!venueId) return
    let active = true
    async function loadManagers() {
      try {
        const res = await fetch(`/api/admin/team-members?venue_id=${venueId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const list: ManagerOption[] = (data?.members ?? [])
          .map((member: Record<string, unknown>) => {
            const profile = member.profiles as { full_name?: string; email?: string } | undefined
            const id = (member.user_id as string) ?? (member.id as string)
            const name = profile?.full_name ?? profile?.email ?? (member.full_name as string) ?? (member.email as string) ?? "Team member"
            return id ? { id, name } : null
          })
          .filter(Boolean)
        if (active) setManagers(list)
      } catch {
        if (active) setManagers([])
      }
    }
    void loadManagers()
    return () => {
      active = false
    }
  }, [venueId])

  useEffect(() => {
    if (!venueId || !eventId) {
      setShifts([])
      return
    }
    let active = true
    async function loadShifts() {
      try {
        const res = await fetch(`/api/admin/staffing/shifts?venueId=${venueId}&event_id=${eventId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const list: ShiftOption[] = (data?.data ?? []).map((shift: Record<string, unknown>) => {
          const date = shift.shift_date ? String(shift.shift_date) : ""
          const start = shift.start_time ? String(shift.start_time).slice(0, 5) : ""
          const end = shift.end_time ? String(shift.end_time).slice(0, 5) : ""
          const role = shift.role_assignment ? ` · ${shift.role_assignment}` : ""
          return { id: String(shift.id), label: `${date} ${start}-${end}${role}`.trim() }
        })
        if (active) setShifts(list)
      } catch {
        if (active) setShifts([])
      }
    }
    void loadShifts()
    return () => {
      active = false
    }
  }, [venueId, eventId])

  async function save() {
    setIsSaving(true)
    try {
      const response = await fetch(`/api/hiring/candidates/${candidate.id}/assignment?${employerQuery}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intended_event_id: eventId || null,
          intended_shift_id: shiftId || null,
          assigned_manager_id: managerId || null,
          assigned_manager_name: managerName || null,
          position: position || null,
          notes: notes || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Failed to save assignment")

      const warnings: string[] = payload?.data?.warnings ?? []
      toast({
        title: "Assignment saved",
        description: warnings.length ? warnings.join(" ") : "Event, manager, and role updated for this candidate.",
      })
      onUpdated()
    } catch (error) {
      toast({
        title: "Could not save assignment",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasRoster = Boolean(candidate.roster?.staffMemberId)

  return (
    <WorkforcePanel className="space-y-4 p-5">
      <h3 className="text-base font-medium text-white">Assignment</h3>
      <div className="space-y-4">
        {!hasRoster ? (
          <p className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-400">
            Roster record not created yet. These assignments are saved now and applied to the roster once onboarding
            completes.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Event</Label>
            <EventSelect defaultEventId={eventId || undefined} onSelect={(event) => setEventId(event?.id ?? "")} />
          </div>

          <div className="space-y-2">
            <Label>Role / position</Label>
            <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Bartender" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Manager</Label>
            {venueId && managers.length > 0 ? (
              <Select
                value={managerId}
                onValueChange={(value) => {
                  setManagerId(value)
                  setManagerName(managers.find((m) => m.id === value)?.name ?? "")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign a manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="Manager name"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Shift</Label>
            <Select value={shiftId} onValueChange={setShiftId} disabled={!eventId || shifts.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={!eventId ? "Select an event first" : shifts.length ? "Select a shift" : "No shifts"} />
              </SelectTrigger>
              <SelectContent>
                {shifts.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional assignment notes" rows={2} />
        </div>

        <Button
          onClick={() => void save()}
          disabled={isSaving}
          className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:from-purple-700 hover:to-cyan-700"
        >
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save assignment
        </Button>
      </div>
    </WorkforcePanel>
  )
}
