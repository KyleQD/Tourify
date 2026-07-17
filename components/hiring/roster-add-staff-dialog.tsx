"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { HiringEntity } from "@/types/hiring-entity"
import type { CreateRosterMemberSource, RosterMember } from "@/types/hiring-roster-work-mode"

interface RosterAddStaffDialogProps {
  employer: HiringEntity
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (member: RosterMember) => void
}

export function RosterAddStaffDialog({ employer, open, onOpenChange, onCreated }: RosterAddStaffDialogProps) {
  const [source, setSource] = useState<CreateRosterMemberSource>("invite")
  const [userId, setUserId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [position, setPosition] = useState("")
  const [department, setDepartment] = useState("")
  const [employmentType, setEmploymentType] = useState("contractor")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSource("invite")
    setUserId("")
    setName("")
    setEmail("")
    setPhone("")
    setPosition("")
    setDepartment("")
    setEmploymentType("contractor")
    setNotes("")
    setError(null)
  }, [open])

  async function handleSubmit() {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/hiring/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employer_entity_type: employer.entityType,
          employer_entity_id: employer.entityId,
          source,
          user_id: userId || undefined,
          name: name || undefined,
          email: email || undefined,
          phone: phone || undefined,
          position: position || undefined,
          department: department || undefined,
          employment_type: employmentType || undefined,
          notes: notes || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? "Failed to add staff member")

      onCreated(payload.data)
      onOpenChange(false)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to add staff member")
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsUserId = source === "existing_user"
  const needsEmail = source === "invite"
  const canSubmit = Boolean(position || name || email) && (!needsUserId || userId) && (!needsEmail || email)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add staff</DialogTitle>
          <DialogDescription>Add an onboarded worker, existing user, or onboarding invite to this roster.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={(value) => setSource(value as CreateRosterMemberSource)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invite">Send onboarding invite</SelectItem>
                <SelectItem value="existing_user">Add existing user</SelectItem>
                <SelectItem value="manual">Manual onboarded staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {source !== "invite" ? (
            <div className="grid gap-2">
              <Label htmlFor="staff-user-id">User ID {needsUserId ? "" : "(optional)"}</Label>
              <Input id="staff-user-id" value={userId} onChange={(event) => setUserId(event.target.value)} />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input id="staff-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-email">Email {needsEmail ? "" : "(optional)"}</Label>
              <Input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-phone">Phone</Label>
              <Input id="staff-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-position">Position</Label>
              <Input id="staff-position" value={position} onChange={(event) => setPosition(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="staff-department">Department</Label>
              <Input id="staff-department" value={department} onChange={(event) => setDepartment(event.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Employment type</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contractor">Contractor</SelectItem>
                  <SelectItem value="part_time">Part time</SelectItem>
                  <SelectItem value="full_time">Full time</SelectItem>
                  <SelectItem value="volunteer">Volunteer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="staff-notes">Notes</Label>
            <Textarea id="staff-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add staff
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
