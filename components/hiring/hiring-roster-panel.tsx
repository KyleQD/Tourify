"use client"

import { useMemo, useState } from "react"
import { Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RosterAssignmentDialog } from "@/components/hiring/roster-assignment-dialog"
import { RosterMemberDetailDrawer } from "@/components/hiring/roster-member-detail-drawer"
import type { HiringEntity } from "@/types/hiring-entity"
import type { HiringRosterMemberListItem } from "@/types/hiring-dashboard"
import type { ListRosterMembersResult, RosterMember, RosterMemberStatus } from "@/types/hiring-roster-work-mode"
import { formatDashboardDate, getEmployerQueryString, normalizeStatusLabel } from "@/lib/hiring/hiring-dashboard-utils"
import { useHiringDashboardFetch } from "@/hooks/use-hiring-dashboard-fetch"
import { WorkforceEmptyState, WorkforcePanel } from "./workforce-ui"

interface HiringRosterPanelProps {
  employer: HiringEntity
}

function toListItems(payload: ListRosterMembersResult | HiringRosterMemberListItem[] | null | undefined): HiringRosterMemberListItem[] {
  if (Array.isArray(payload)) return payload
  if (!payload?.members) return []

  return payload.members.map((member) => ({
    id: member.id,
    userId: member.userId,
    name: member.profile.fullName,
    email: member.profile.email ?? undefined,
    position: member.position,
    department: member.department ?? undefined,
    status: member.status,
    complianceStatus: member.complianceStatus,
    startedAt: member.startedAt ?? undefined,
  }))
}

function toRosterMembers(payload: ListRosterMembersResult | HiringRosterMemberListItem[] | null | undefined): RosterMember[] {
  if (!payload || Array.isArray(payload) || !payload.members) return []
  return payload.members
}

export function HiringRosterPanel({ employer }: HiringRosterPanelProps) {
  const queryString = getEmployerQueryString(employer)
  const { data, isLoading, error, refetch } = useHiringDashboardFetch<ListRosterMembersResult | HiringRosterMemberListItem[]>({
    url: `/api/hiring/roster?${queryString}`,
    initialData: { members: [], total: 0, departments: [], complianceCounts: {}, statusCounts: {} },
  })

  const roster = useMemo(() => toListItems(data), [data])
  const members = useMemo(() => toRosterMembers(data), [data])
  const [selectedMember, setSelectedMember] = useState<RosterMember | null>(null)
  const [assignmentMember, setAssignmentMember] = useState<RosterMember | null>(null)
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  function openMember(memberId: string) {
    const member = members.find((item) => item.id === memberId) ?? null
    setSelectedMember(member)
  }

  function handleAssign(member: RosterMember) {
    setAssignmentMember(member)
    setIsAssignmentOpen(true)
  }

  function handleAssigned(member: RosterMember) {
    setSelectedMember(member)
    void refetch()
  }

  async function handleStatusChange(member: RosterMember, nextStatus: RosterMemberStatus) {
    setStatusError(null)
    const response = await fetch(`/api/hiring/roster/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employer_entity_type: employer.entityType,
        employer_entity_id: employer.entityId,
        status: nextStatus,
      }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setStatusError(
        typeof payload?.error === "string" ? payload.error : "Failed to update roster member"
      )
      return
    }

    setSelectedMember(payload?.data ?? member)
    await refetch()
  }

  return (
    <>
      <WorkforcePanel>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-white">Roster</CardTitle>
            <CardDescription>
              Workers appear here after application approval (pending until onboarding is approved). Open a member to
              assign role, team, shift, or zone.
            </CardDescription>
          </div>
          <Button className="rounded-xl" variant="outline" asChild>
            <a href={`/api/hiring/roster/export?${queryString}`}>Export roster</a>
          </Button>
        </CardHeader>
        <CardContent>
          {error || statusError ? <p className="text-sm text-destructive">{error || statusError}</p> : null}
          {isLoading ? <p className="text-sm text-muted-foreground">Loading roster…</p> : null}
          {!isLoading && roster.length === 0 ? (
            <WorkforceEmptyState
              icon={Users}
              title="No roster members yet"
              description="Approve an application to add the worker here as pending. After they finish onboarding, approve it to activate full access—then assign roles, shifts, and teams."
            />
          ) : null}
          {roster.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <div className="grid grid-cols-12 border-b border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                <div className="col-span-4">Worker</div>
                <div className="col-span-3">Role</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3">Started</div>
              </div>
              {roster.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => openMember(member.id)}
                  className="grid w-full grid-cols-12 gap-2 border-b border-white/10 bg-transparent px-4 py-4 text-left text-sm transition hover:bg-white/[0.06] last:border-0"
                >
                  <div className="col-span-4">
                    <p className="font-medium text-white">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email || "No email"}</p>
                  </div>
                  <div className="col-span-3 text-muted-foreground">
                    {[member.department, member.position].filter(Boolean).join(" • ") || "No role"}
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline">{normalizeStatusLabel(member.status)}</Badge>
                  </div>
                  <div className="col-span-3 text-muted-foreground">{formatDashboardDate(member.startedAt)}</div>
                </button>
              ))}
            </div>
          ) : null}
        </CardContent>
      </WorkforcePanel>

      <RosterMemberDetailDrawer
        member={selectedMember}
        open={Boolean(selectedMember)}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null)
        }}
        onAssign={handleAssign}
        onStatusChange={handleStatusChange}
      />

      <RosterAssignmentDialog
        employer={employer}
        member={assignmentMember}
        open={isAssignmentOpen}
        onOpenChange={setIsAssignmentOpen}
        onAssigned={handleAssigned}
      />
    </>
  )
}
