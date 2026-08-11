"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, ShieldCheck, UserRound } from "lucide-react"

import {
  detailSurfacePattern,
  getStatusBadgeClasses,
} from "@/components/dashboard/detail-surface-pattern"
import { WorkModePermissionsCard } from "@/components/hiring/work-mode-permissions-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { RosterMember } from "@/types/hiring-roster-work-mode"

interface RosterMemberDetailDrawerProps {
  member: RosterMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (member: RosterMember) => void
  onUpdate?: (
    member: RosterMember,
    updates: {
      name?: string | null
      email?: string | null
      phone?: string | null
      position?: string | null
      department?: string | null
      employment_type?: string | null
      notes?: string | null
    }
  ) => void | Promise<void>
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
  onUpdate,
  onStatusChange,
}: RosterMemberDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [position, setPosition] = useState("")
  const [department, setDepartment] = useState("")
  const [employmentType, setEmploymentType] = useState("")
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!member) return
    setIsEditing(false)
    setName(member.profile.fullName)
    setEmail(member.profile.email ?? "")
    setPhone(member.profile.phone ?? "")
    setPosition(member.position)
    setDepartment(member.department ?? "")
    setEmploymentType(member.employmentType ?? "")
    setNotes(member.notes ?? "")
  }, [member])

  async function handleSave() {
    if (!member || !onUpdate) return
    setIsSaving(true)
    try {
      await onUpdate(member, {
        name,
        email: email || null,
        phone: phone || null,
        position,
        department: department || null,
        employment_type: employmentType || null,
        notes: notes || null,
      })
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          "w-full overflow-y-auto sm:max-w-xl",
          detailSurfacePattern.sheetContent
        )}
      >
        <div className={detailSurfacePattern.topAccent} />
        {!member ? null : (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className={detailSurfacePattern.title}>{member.profile.fullName}</SheetTitle>
              <SheetDescription className={detailSurfacePattern.description}>
                {member.position} {member.department ? `• ${member.department}` : ""}
              </SheetDescription>
            </SheetHeader>

            <div className="flex items-start gap-4">
              <Avatar className={cn("h-14 w-14", detailSurfacePattern.avatarRing)}>
                <AvatarImage src={member.profile.avatarUrl ?? undefined} />
                <AvatarFallback className={detailSurfacePattern.avatarFallback}>
                  {getInitials(member.profile.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={getStatusBadgeClasses({ status: member.status })}>
                    {member.status}
                  </Badge>
                  <Badge className={detailSurfacePattern.badgeOutline}>{member.complianceStatus}</Badge>
                  {member.assignedZone ? (
                    <Badge className={detailSurfacePattern.badgeSoft}>Zone: {member.assignedZone}</Badge>
                  ) : null}
                </div>
                <div className={cn("space-y-1", detailSurfacePattern.subtleText)}>
                  {member.profile.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-cyan-300/80" />
                      {member.profile.email}
                    </div>
                  ) : null}
                  {member.profile.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-cyan-300/80" />
                      {member.profile.phone}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button className={detailSurfacePattern.btnPrimary} onClick={() => onAssign(member)}>
                Assign shift / zone
              </Button>
              <Button
                variant="outline"
                className={detailSurfacePattern.btnOutline}
                onClick={() => setIsEditing((value) => !value)}
              >
                {isEditing ? "Cancel edit" : "Edit details"}
              </Button>
              {member.status !== "active" ? (
                <Button
                  variant="outline"
                  className={detailSurfacePattern.btnOutline}
                  onClick={() => onStatusChange(member, "active")}
                >
                  Mark active
                </Button>
              ) : null}
              {member.status !== "inactive" ? (
                <Button
                  variant="outline"
                  className={detailSurfacePattern.btnOutline}
                  onClick={() => onStatusChange(member, "inactive")}
                >
                  Mark inactive
                </Button>
              ) : null}
              {member.status !== "offboarded" ? (
                <Button
                  variant="destructive"
                  className={detailSurfacePattern.btnDestructive}
                  onClick={() => onStatusChange(member, "offboarded")}
                >
                  Offboard
                </Button>
              ) : null}
            </div>

            {isEditing ? (
              <Card className={cn(detailSurfacePattern.panel, "border-white/10 bg-transparent shadow-none")}>
                <CardHeader>
                  <CardTitle className={cn("text-base", detailSurfacePattern.title)}>
                    Edit roster details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="roster-name" className={detailSurfacePattern.label}>
                        Name
                      </Label>
                      <Input
                        id="roster-name"
                        className={detailSurfacePattern.input}
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="roster-email" className={detailSurfacePattern.label}>
                        Email
                      </Label>
                      <Input
                        id="roster-email"
                        className={detailSurfacePattern.input}
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="roster-phone" className={detailSurfacePattern.label}>
                        Phone
                      </Label>
                      <Input
                        id="roster-phone"
                        className={detailSurfacePattern.input}
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="roster-position" className={detailSurfacePattern.label}>
                        Position
                      </Label>
                      <Input
                        id="roster-position"
                        className={detailSurfacePattern.input}
                        value={position}
                        onChange={(event) => setPosition(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="roster-department" className={detailSurfacePattern.label}>
                        Department
                      </Label>
                      <Input
                        id="roster-department"
                        className={detailSurfacePattern.input}
                        value={department}
                        onChange={(event) => setDepartment(event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="roster-employment" className={detailSurfacePattern.label}>
                        Employment type
                      </Label>
                      <Input
                        id="roster-employment"
                        className={detailSurfacePattern.input}
                        value={employmentType}
                        onChange={(event) => setEmploymentType(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="roster-notes" className={detailSurfacePattern.label}>
                      Notes
                    </Label>
                    <Textarea
                      id="roster-notes"
                      className={detailSurfacePattern.textarea}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      className={detailSurfacePattern.btnPrimary}
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <WorkModePermissionsCard
              permissions={member.workModeAssignment?.permissions ?? null}
              status={member.workModeAssignment?.status ?? null}
            />

            <Card className={cn(detailSurfacePattern.panel, "border-white/10 bg-transparent shadow-none")}>
              <CardHeader>
                <CardTitle className={cn("text-base", detailSurfacePattern.title)}>Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {member.documentSummary?.length ? (
                  <div className="space-y-3">
                    {member.documentSummary.map((document) => (
                      <div key={document.id} className={cn("flex items-center justify-between", detailSurfacePattern.listRow)}>
                        <div>
                          <p className="font-medium text-white">{document.label}</p>
                          <p className={detailSurfacePattern.subtleText}>{document.documentType}</p>
                        </div>
                        <Badge className={detailSurfacePattern.badgeOutline}>{document.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={detailSurfacePattern.subtleText}>
                    No documents are attached to this staff member yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className={cn(detailSurfacePattern.panel, "border-white/10 bg-transparent shadow-none")}>
              <CardHeader>
                <CardTitle className={cn("flex items-center gap-2 text-base", detailSurfacePattern.title)}>
                  <ShieldCheck className="h-4 w-4 text-cyan-300/80" />
                  Roster details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Employment type</span>
                  <span className="text-white">{member.employmentType ?? "Not set"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Started</span>
                  <span className="text-white">
                    {member.startedAt ? new Date(member.startedAt).toLocaleDateString() : "Not started"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Onboarding progress</span>
                  <span className="text-white">{member.onboardingProgress ?? 0}%</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Employer</span>
                  <span className="text-right text-white">{member.employer.displayName}</span>
                </div>
              </CardContent>
            </Card>

            {member.notes ? (
              <Card className={cn(detailSurfacePattern.panel, "border-white/10 bg-transparent shadow-none")}>
                <CardHeader>
                  <CardTitle className={cn("flex items-center gap-2 text-base", detailSurfacePattern.title)}>
                    <UserRound className="h-4 w-4 text-cyan-300/80" />
                    Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn("whitespace-pre-wrap", detailSurfacePattern.subtleText)}>{member.notes}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
