"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Edit,
  Loader2,
  Mail,
  Plus,
  Trash2,
  User,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AdminFilterBar } from "@/app/admin/dashboard/components/admin-filter-bar"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import {
  WorkforceEmptyState,
  WorkforceMetricCard,
  WorkforcePanel,
} from "@/components/hiring/workforce-ui"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useActingContext } from "@/hooks/use-acting-context"
import { cn } from "@/lib/utils"

export interface EventStaffItem {
  id: string
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
  status: "confirmed" | "pending" | "declined"
  arrival_time?: string
  departure_time?: string
  notes?: string
  staff_member_id?: string
  shift_date?: string
}

interface AvailableMember {
  id: string
  user_id?: string | null
  staff_member_id?: string | null
  name: string
  email: string
  phone?: string
  role?: string
  department?: string
  status?: string
}

interface OnboardingTemplate {
  id: string
  name: string
  isDefault: boolean
}

interface EventStaffManagerProps {
  eventId: string
  eventDate?: string | null
  eventTime?: string | null
  staff: EventStaffItem[]
  onStaffUpdate: (staff: EventStaffItem[]) => void
}

function presentShift(shift: any): EventStaffItem {
  const member = shift?.staff_members
  return {
    id: shift.id,
    name: member?.name || shift.staff_name || shift.role_assignment || "Staff",
    role: shift.role_assignment || member?.role || shift.role || "Crew",
    email: member?.email || shift.staff_email || "",
    phone: member?.phone || shift.phone,
    status: shift.status === "assigned" || shift.status === "confirmed"
      ? "confirmed"
      : shift.status === "declined"
        ? "declined"
        : "pending",
    arrival_time: shift.start_time,
    departure_time: shift.end_time,
    notes: shift.notes,
    staff_member_id: shift.staff_member_id || member?.id,
    shift_date: shift.shift_date,
  }
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}))
  return new Error(typeof body.error === "string" && body.error ? body.error : fallback)
}

function statusClasses(status: EventStaffItem["status"]) {
  if (status === "confirmed") return detailSurfacePattern.badgeSuccess
  if (status === "declined") return "border-rose-400/30 bg-rose-500/15 text-rose-200"
  return detailSurfacePattern.badgeWarning
}

export function EventStaffManager({
  eventId,
  eventDate,
  eventTime,
  staff,
  onStaffUpdate,
}: EventStaffManagerProps) {
  const { actingAccount, actingHeaders, isActingReady } = useActingContext()
  const orgId = actingAccount?.profile_data?.ops_org_id
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([])
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  const [defaults, setDefaults] = useState({
    shiftDate: eventDate || "",
    startTime: eventTime?.slice(0, 5) || "09:00",
    endTime: "17:00",
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<EventStaffItem | null>(null)
  const [mode, setMode] = useState<"person" | "invite">("person")
  const [saving, setSaving] = useState(false)
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [form, setForm] = useState({
    staffMemberId: "",
    name: "",
    email: "",
    phone: "",
    role: "",
    department: "General",
    templateId: "",
    shiftDate: eventDate || "",
    startTime: eventTime?.slice(0, 5) || "09:00",
    endTime: "17:00",
    status: "pending" as EventStaffItem["status"],
    notes: "",
  })

  useEffect(() => {
    if (!isActingReady) return
    let cancelled = false
    async function load() {
      setLoadingPeople(true)
      const staffRequest = fetch(`/api/events/${eventId}/staff`, { headers: actingHeaders, cache: "no-store" })
      const templatesRequest = orgId
        ? fetch(`/api/admin/onboarding/templates?entity_type=organization&entity_id=${encodeURIComponent(orgId)}`, {
            headers: actingHeaders,
            cache: "no-store",
          })
        : Promise.resolve(null)
      const [staffResponse, templateResponse] = await Promise.all([staffRequest, templatesRequest])
      const staffBody = await staffResponse.json().catch(() => ({}))
      const templateBody = templateResponse ? await templateResponse.json().catch(() => ({})) : {}
      if (cancelled) return
      if (staffResponse.ok) {
        setAvailableMembers(staffBody.availableMembers || [])
        if (staffBody.defaults) setDefaults(staffBody.defaults)
      } else {
        setFormError(staffBody.error || "Unable to load organization people.")
      }
      if (templateResponse?.ok) {
        const rows = Array.isArray(templateBody.data) ? templateBody.data : []
        const normalized = rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          isDefault: Boolean(row.is_default ?? row.isDefault),
        }))
        setTemplates(normalized)
      }
      setLoadingPeople(false)
    }
    void load()
    return () => { cancelled = true }
  }, [actingHeaders, eventId, isActingReady, orgId])

  const filtered = useMemo(() => staff.filter((member) => {
    const query = search.toLowerCase()
    return (statusFilter === "all" || member.status === statusFilter)
      && [member.name, member.email, member.role].some((value) => value.toLowerCase().includes(query))
  }), [search, staff, statusFilter])

  function resetForm() {
    const defaultTemplate = templates.find((template) => template.isDefault) || templates[0]
    setSelected(null)
    setMode("person")
    setFormError(null)
    setForm({
      staffMemberId: "",
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "General",
      templateId: defaultTemplate?.id || "",
      shiftDate: defaults.shiftDate || eventDate || new Date().toISOString().slice(0, 10),
      startTime: defaults.startTime || eventTime?.slice(0, 5) || "09:00",
      endTime: defaults.endTime || "17:00",
      status: "pending",
      notes: "",
    })
  }

  function openCreate() {
    resetForm()
    setDialogOpen(true)
  }

  function openEdit(member: EventStaffItem) {
    setSelected(member)
    setMode("person")
    setFormError(null)
    setForm({
      staffMemberId: member.staff_member_id || "",
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      role: member.role,
      department: "General",
      templateId: "",
      shiftDate: member.shift_date || defaults.shiftDate,
      startTime: member.arrival_time || defaults.startTime,
      endTime: member.departure_time || defaults.endTime,
      status: member.status,
      notes: member.notes || "",
    })
    setDialogOpen(true)
  }

  async function save() {
    setSaving(true)
    setFormError(null)
    try {
      if (selected) {
        const response = await fetch(`/api/events/${eventId}/staff/${selected.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            staff_member_id: form.staffMemberId || undefined,
            role_assignment: form.role,
            shift_date: form.shiftDate,
            start_time: form.startTime,
            end_time: form.endTime,
            notes: form.notes,
            status: form.status,
          }),
        })
        if (!response.ok) throw await responseError(response, "Unable to update this assignment.")
        const body = await response.json()
        const updated = body.staff || presentShift(body.shift)
        onStaffUpdate(staff.map((member) => member.id === selected.id ? updated : member))
        toast.success("Staff assignment updated")
      } else if (mode === "invite") {
        if (!form.name || (!form.email && !form.phone) || !form.role || !form.templateId) {
          throw new Error("Add the invitee, role, and onboarding packet before sending.")
        }
        const response = await fetch(`/api/events/${eventId}/staff/invites`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            name: form.name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            role: form.role,
            department: form.department,
            template_id: form.templateId,
            shift_date: form.shiftDate,
            start_time: form.startTime,
            end_time: form.endTime,
            notes: form.notes || undefined,
          }),
        })
        if (!response.ok) throw await responseError(response, "Unable to send this invitation.")
        toast.success("Staffing invitation sent", { description: "The shift will activate when the invite is accepted." })
      } else {
        if (!form.staffMemberId || !form.shiftDate || !form.startTime || !form.endTime) {
          throw new Error("Select a person and complete the shift window.")
        }
        const response = await fetch(`/api/events/${eventId}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            staff_member_id: availableMembers.find((member) => member.id === form.staffMemberId)?.staff_member_id || undefined,
            user_id: availableMembers.find((member) => member.id === form.staffMemberId)?.user_id || undefined,
            shift_date: form.shiftDate,
            start_time: form.startTime,
            end_time: form.endTime,
            role_assignment: form.role || undefined,
            notes: form.notes || undefined,
          }),
        })
        if (!response.ok) throw await responseError(response, "Unable to create this assignment.")
        const body = await response.json()
        onStaffUpdate([...staff, presentShift(body.shift)])
        if (body.syncWarnings?.length) toast.warning(body.syncWarnings[0])
        else toast.success("Staff assigned", { description: "The worker can review it in Work Mode." })
      }
      setDialogOpen(false)
      setSelected(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save this assignment."
      setFormError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!selected) return
    setSaving(true)
    try {
      const response = await fetch(`/api/events/${eventId}/staff/${selected.id}`, {
        method: "DELETE",
        headers: actingHeaders,
      })
      if (!response.ok) throw await responseError(response, "Unable to remove this assignment.")
      onStaffUpdate(staff.filter((member) => member.id !== selected.id))
      setDeleteOpen(false)
      setSelected(null)
      toast.success("Staff assignment removed")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to remove this assignment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Event staff</h2>
          <p className="text-sm text-slate-400">Assign organization people or invite a new worker.</p>
        </div>
        <Button onClick={openCreate} disabled={!isActingReady} className={detailSurfacePattern.btnPrimary}>
          <Plus className="mr-2 h-4 w-4" /> Add staff
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <WorkforceMetricCard label="Confirmed" value={staff.filter((item) => item.status === "confirmed").length} icon={CheckCircle2} accent="green" />
        <WorkforceMetricCard label="Pending" value={staff.filter((item) => item.status === "pending").length} icon={Clock3} accent="amber" />
        <WorkforceMetricCard label="Declined" value={staff.filter((item) => item.status === "declined").length} icon={XCircle} accent="purple" />
      </div>

      <AdminFilterBar
        searchPlaceholder="Search event staff…"
        searchValue={search}
        onSearchChange={setSearch}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={[
          { value: "all", label: "All statuses" },
          { value: "confirmed", label: "Confirmed" },
          { value: "pending", label: "Pending" },
          { value: "declined", label: "Declined" },
        ]}
      />

      <WorkforcePanel className="p-3 sm:p-4">
        {filtered.length === 0 ? (
          <WorkforceEmptyState
            icon={Users}
            title={staff.length ? "No matching staff" : "No staff assigned"}
            description={staff.length ? "Adjust the search or status filter." : "Add an organization person or send a staffing invitation."}
            action={!staff.length ? <Button onClick={openCreate}><UserPlus className="mr-2 h-4 w-4" />Add first worker</Button> : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((member) => (
              <div key={member.id} className={cn(detailSurfacePattern.listRow, "flex flex-col gap-3 sm:flex-row sm:items-center")}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className={detailSurfacePattern.avatarFallback}><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-white">{member.name}</p>
                    <Badge variant="outline" className={statusClasses(member.status)}>{member.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-300">{member.role}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                    {member.email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span> : null}
                    {member.shift_date ? <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{member.shift_date}</span> : null}
                    {member.arrival_time ? <span>{member.arrival_time}–{member.departure_time || "TBD"}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button variant="outline" size="icon" aria-label={`Edit ${member.name}`} onClick={() => openEdit(member)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" aria-label={`Remove ${member.name}`} onClick={() => { setSelected(member); setDeleteOpen(true) }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </WorkforcePanel>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className={cn(detailSurfacePattern.dialogContent, "max-h-[90vh] overflow-y-auto sm:max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>{selected ? "Edit staff assignment" : "Add event staff"}</DialogTitle>
          </DialogHeader>

          {!selected ? (
            <Tabs value={mode} onValueChange={(value) => { setMode(value as "person" | "invite"); setFormError(null) }}>
              <TabsList className={detailSurfacePattern.tabsList}>
                <TabsTrigger value="person" className={detailSurfacePattern.tabsTrigger}>Organization people</TabsTrigger>
                <TabsTrigger value="invite" className={detailSurfacePattern.tabsTrigger}>Invite someone</TabsTrigger>
              </TabsList>
              <TabsContent value="person" className="mt-4 space-y-2">
                <Label htmlFor="event-staff-person">Staff member</Label>
                <Select value={form.staffMemberId} onValueChange={(value) => {
                  const member = availableMembers.find((item) => item.id === value)
                  setForm((current) => ({ ...current, staffMemberId: value, role: current.role || member?.role || "", department: member?.department || current.department }))
                }} disabled={loadingPeople}>
                  <SelectTrigger id="event-staff-person" className={detailSurfacePattern.selectTrigger}>
                    <SelectValue placeholder={loadingPeople ? "Loading people…" : "Select an organization person"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.name} · {member.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="invite" className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="invite-name">Name</Label><Input id="invite-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={detailSurfacePattern.input} /></div>
                <div className="space-y-2"><Label htmlFor="invite-email">Email</Label><Input id="invite-email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={detailSurfacePattern.input} /></div>
                <div className="space-y-2"><Label htmlFor="invite-phone">Phone (optional)</Label><Input id="invite-phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={detailSurfacePattern.input} /></div>
                <div className="space-y-2"><Label htmlFor="invite-department">Department</Label><Input id="invite-department" value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} className={detailSurfacePattern.input} /></div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="invite-template">Onboarding packet</Label>
                  <Select value={form.templateId} onValueChange={(value) => setForm({ ...form, templateId: value })}>
                    <SelectTrigger id="invite-template" className={detailSurfacePattern.selectTrigger}><SelectValue placeholder="Select onboarding packet" /></SelectTrigger>
                    <SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}{template.isDefault ? " · Default" : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="event-staff-role">Role</Label><Input id="event-staff-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} placeholder="Stagehand, FOH, security…" className={detailSurfacePattern.input} /></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="event-staff-date">Shift date</Label><Input id="event-staff-date" type="date" value={form.shiftDate} onChange={(event) => setForm({ ...form, shiftDate: event.target.value })} className={detailSurfacePattern.input} /></div>
              <div className="space-y-2"><Label htmlFor="event-staff-start">Start</Label><Input id="event-staff-start" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className={detailSurfacePattern.input} /></div>
              <div className="space-y-2"><Label htmlFor="event-staff-end">End</Label><Input id="event-staff-end" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className={detailSurfacePattern.input} /></div>
            </div>
            {selected ? (
              <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as EventStaffItem["status"] })}><SelectTrigger className={detailSurfacePattern.selectTrigger}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="declined">Declined</SelectItem></SelectContent></Select></div>
            ) : null}
            <div className="space-y-2"><Label htmlFor="event-staff-notes">Notes</Label><Textarea id="event-staff-notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={detailSurfacePattern.textarea} /></div>
          </div>

          {formError ? <Alert variant="destructive" role="alert"><AlertTitle>Assignment not saved</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} disabled={saving} className={detailSurfacePattern.btnPrimary}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selected ? "Save changes" : mode === "invite" ? "Send invitation" : "Assign staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Remove staff assignment?</AlertDialogTitle><AlertDialogDescription>This removes {selected?.name || "this worker"} from the event schedule.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={(event) => { event.preventDefault(); void remove() }}>{saving ? "Removing…" : "Remove"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
