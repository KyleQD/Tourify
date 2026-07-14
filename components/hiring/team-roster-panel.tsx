"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Loader2, Users } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RosterAssignmentDialog } from "@/components/hiring/roster-assignment-dialog"
import { RosterFilters } from "@/components/hiring/roster-filters"
import { RosterMemberDetailDrawer } from "@/components/hiring/roster-member-detail-drawer"
import { WorkforceMetricCard, WorkforcePanel } from "@/components/hiring/workforce-ui"
import type { HiringEntity } from "@/types/hiring-entity"
import type {
  ComplianceStatus,
  ListRosterMembersResult,
  RosterMember,
  RosterMemberStatus,
} from "@/types/hiring-roster-work-mode"

interface TeamRosterPanelProps {
  employer: HiringEntity
  eventId?: string | null
  tourId?: string | null
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  if (status === "active") return "default"
  if (status === "suspended" || status === "blocked") return "destructive"
  if (status === "pending" || status === "needs_review") return "secondary"
  return "outline"
}

function buildRosterUrl(employer: HiringEntity, params: URLSearchParams): string {
  params.set("entity_type", employer.entityType)
  params.set("entity_id", employer.entityId)
  return `/api/hiring/roster?${params.toString()}`
}

export function TeamRosterPanel({ employer, eventId = null, tourId = null }: TeamRosterPanelProps) {
  const [result, setResult] = useState<ListRosterMembersResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<RosterMemberStatus | "all">("all")
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | "all">("all")
  const [department, setDepartment] = useState("all")
  const [selectedMember, setSelectedMember] = useState<RosterMember | null>(null)
  const [assignmentMember, setAssignmentMember] = useState<RosterMember | null>(null)
  const [isAssignmentOpen, setIsAssignmentOpen] = useState(false)

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (status !== "all") params.set("status", status)
    if (complianceStatus !== "all") params.set("compliance_status", complianceStatus)
    if (department !== "all") params.set("department", department)
    if (eventId) params.set("event_id", eventId)
    if (tourId) params.set("tour_id", tourId)
    return params
  }, [search, status, complianceStatus, department, eventId, tourId])

  async function loadRoster() {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(buildRosterUrl(employer, new URLSearchParams(queryParams)))
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Failed to load roster")
      setResult(payload.data)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load roster")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadRoster()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employer.entityType, employer.entityId, queryParams.toString()])

  async function handleStatusChange(member: RosterMember, nextStatus: RosterMemberStatus) {
    const response = await fetch(`/api/hiring/roster/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employer_entity_type: employer.entityType,
        employer_entity_id: employer.entityId,
        status: nextStatus,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error ?? "Failed to update roster member")
      return
    }

    setSelectedMember(payload.data)
    await loadRoster()
  }

  function handleAssign(member: RosterMember) {
    setAssignmentMember(member)
    setIsAssignmentOpen(true)
  }

  function handleAssigned(member: RosterMember) {
    setSelectedMember(member)
    void loadRoster()
  }

  function handleExport() {
    const params = new URLSearchParams(queryParams)
    params.set("entity_type", employer.entityType)
    params.set("entity_id", employer.entityId)
    window.open(`/api/hiring/roster/export?${params.toString()}`, "_blank")
  }

  const members = result?.members ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Team roster</h2>
          <p className="text-sm text-muted-foreground">
            Active staff from approved applications, Work Mode access, compliance status, and shift/zone assignments.
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={!members.length}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <WorkforceMetricCard label="Total staff" value={result?.total ?? 0} description="Roster members" icon={Users} accent="purple" isLoading={isLoading} />
        <WorkforceMetricCard label="Active" value={result?.statusCounts?.active ?? 0} description="Ready for work" icon={Users} accent="green" isLoading={isLoading} />
        <WorkforceMetricCard label="Needs review" value={result?.complianceCounts?.needs_review ?? 0} description="Compliance queue" icon={Users} accent="amber" isLoading={isLoading} />
        <WorkforceMetricCard label="Compliant" value={result?.complianceCounts?.compliant ?? 0} description="Approved records" icon={Users} accent="cyan" isLoading={isLoading} />
      </div>

      <RosterFilters
        search={search}
        status={status}
        complianceStatus={complianceStatus}
        department={department}
        departments={result?.departments ?? []}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onComplianceStatusChange={setComplianceStatus}
        onDepartmentChange={setDepartment}
      />

      {error ? <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}

      <WorkforcePanel className="overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading roster...
            </div>
          ) : members.length ? (
            <Table>
              <TableHeader className="bg-slate-900/70">
                <TableRow>
                  <TableHead>Staff member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Work Mode</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id} className="border-slate-800/80 hover:bg-slate-900/60">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.profile.avatarUrl ?? undefined} />
                          <AvatarFallback>{getInitials(member.profile.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.profile.fullName}</p>
                          <p className="text-sm text-muted-foreground">{member.profile.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.position}</p>
                        <p className="text-sm text-muted-foreground">{member.department ?? "No department"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(member.status)}>{member.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(member.complianceStatus)}>{member.complianceStatus}</Badge>
                    </TableCell>
                    <TableCell>{member.assignedZone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={member.workModeAssignment?.status === "active" ? "default" : "outline"}>
                        {member.workModeAssignment?.status ?? "none"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedMember(member)}>
                          View
                        </Button>
                        <Button size="sm" onClick={() => handleAssign(member)}>
                          Assign
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <Users className="mb-3 h-8 w-8 text-muted-foreground" />
              <h3 className="font-semibold">No roster members found</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Staff will appear here after onboarding completion creates real staff_members and employment_assignments rows.
              </p>
            </div>
          )}
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
        contextEventId={eventId}
      />
    </div>
  )
}
