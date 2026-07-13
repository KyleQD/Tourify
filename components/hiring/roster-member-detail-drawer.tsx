"use client"

import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { WorkModePermissionsCard } from "@/components/hiring/work-mode-permissions-card"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

interface RosterMemberDetailDrawerProps {
  member: RosterMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (member: RosterMember) => void
  onStatusChange: (member: RosterMember, status: RosterMember["status"]) => void
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

export function RosterMemberDetailDrawer({
  member,
  open,
  onOpenChange,
  onAssign,
  onStatusChange,
}: RosterMemberDetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {!member ? null : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle>{member.profile.fullName}</SheetTitle>
              <SheetDescription>
                {member.position} {member.department ? `• ${member.department}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={member.profile.avatarUrl ?? undefined} />
                <AvatarFallback>{getInitials(member.profile.fullName)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge>{member.status}</Badge>
                  <Badge variant="outline">{member.complianceStatus}</Badge>
                  {member.assignedZone ? <Badge variant="secondary">Zone: {member.assignedZone}</Badge> : null}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {member.profile.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {member.profile.email}
                    </div>
                  ) : null}
                  {member.profile.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {member.profile.phone}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onAssign(member)}>Assign shift / zone</Button>
              {member.status !== "active" ? (
                <Button variant="outline" onClick={() => onStatusChange(member, "active")}>
                  Mark active
                </Button>
              ) : null}
              {member.status !== "inactive" ? (
                <Button variant="outline" onClick={() => onStatusChange(member, "inactive")}>
                  Mark inactive
                </Button>
              ) : null}
            </div>

            <WorkModePermissionsCard
              permissions={member.workModeAssignment?.permissions ?? null}
              status={member.workModeAssignment?.status ?? null}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {member.documentSummary?.length ? (
                  <div className="space-y-3">
                    {member.documentSummary.map((document) => (
                      <div key={document.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{document.label}</p>
                          <p className="text-sm text-muted-foreground">{document.documentType}</p>
                        </div>
                        <Badge variant="outline">{document.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No documents are attached to this staff member yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  Roster details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Employment type</span>
                  <span>{member.employmentType ?? "Not set"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Started</span>
                  <span>{member.startedAt ? new Date(member.startedAt).toLocaleDateString() : "Not started"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Onboarding progress</span>
                  <span>{member.onboardingProgress ?? 0}%</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Employer</span>
                  <span>{member.employer.displayName}</span>
                </div>
              </CardContent>
            </Card>

            {member.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserRound className="h-4 w-4" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{member.notes}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
