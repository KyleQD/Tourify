"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Mail,
  Phone,
  Calendar,
  Clock4,
} from "lucide-react"
import { toast } from "sonner"

interface Staff {
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
  hourly_rate?: number
  total_hours?: number
  created_at?: string
  updated_at?: string
  staff_member_id?: string
  shift_date?: string
}

interface AvailableMember {
  id: string
  name: string
  email: string
  phone?: string
  role?: string
  status?: string
  hourly_rate?: number
}

interface EventStaffManagerProps {
  eventId: string
  staff: Staff[]
  onStaffUpdate: (staff: Staff[]) => void
}

function presentShift(shift: any): Staff {
  const member = shift?.staff_members
  const status =
    shift?.status === "assigned" || shift?.status === "confirmed"
      ? "confirmed"
      : shift?.status === "declined"
        ? "declined"
        : "pending"

  return {
    id: shift.id,
    name: member?.name || shift.staff_name || shift.role_assignment || "Staff",
    role: shift.role_assignment || member?.role || shift.role || "crew",
    email: member?.email || shift.staff_email || "",
    phone: member?.phone || shift.phone,
    status,
    arrival_time: shift.start_time,
    departure_time: shift.end_time,
    notes: shift.notes,
    staff_member_id: shift.staff_member_id || member?.id,
    shift_date: shift.shift_date,
  }
}

export function EventStaffManager({ eventId, staff, onStaffUpdate }: EventStaffManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([])

  const [formData, setFormData] = useState({
    staff_member_id: "",
    role: "",
    status: "pending" as Staff["status"],
    shift_date: "",
    arrival_time: "",
    departure_time: "",
    notes: "",
  })

  useEffect(() => {
    async function loadMembers() {
      try {
        const response = await fetch(`/api/events/${eventId}/staff`)
        if (!response.ok) return
        const data = await response.json()
        setAvailableMembers(data.availableMembers || [])
      } catch {
        // non-fatal
      }
    }
    loadMembers()
  }, [eventId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-500/20 text-green-400"
      case "pending": return "bg-yellow-500/20 text-yellow-400"
      case "declined": return "bg-red-500/20 text-red-400"
      default: return "bg-slate-500/20 text-slate-400"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return <CheckCircle className="h-4 w-4" />
      case "pending": return <Clock className="h-4 w-4" />
      case "declined": return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredStaff = staff.filter((member) => {
    const matchesStatus = filterStatus === "all" || member.status === filterStatus
    const matchesRole = filterRole === "all" || member.role.toLowerCase().includes(filterRole.toLowerCase())
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.role.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesRole && matchesSearch
  })

  const confirmedStaff = staff.filter((member) => member.status === "confirmed").length
  const pendingStaff = staff.filter((member) => member.status === "pending").length
  const declinedStaff = staff.filter((member) => member.status === "declined").length

  const handleCreateStaff = () => {
    setSelectedStaff(null)
    setFormData({
      staff_member_id: "",
      role: "",
      status: "pending",
      shift_date: new Date().toISOString().slice(0, 10),
      arrival_time: "09:00",
      departure_time: "17:00",
      notes: "",
    })
    setIsCreateDialogOpen(true)
  }

  const handleEditStaff = (member: Staff) => {
    setSelectedStaff(member)
    setFormData({
      staff_member_id: member.staff_member_id || "",
      role: member.role,
      status: member.status,
      shift_date: member.shift_date || new Date().toISOString().slice(0, 10),
      arrival_time: member.arrival_time || "",
      departure_time: member.departure_time || "",
      notes: member.notes || "",
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteStaff = (member: Staff) => {
    setSelectedStaff(member)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveStaff = async () => {
    try {
      if (selectedStaff) {
        const response = await fetch(`/api/events/${eventId}/staff/${selectedStaff.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role_assignment: formData.role,
            shift_date: formData.shift_date,
            start_time: formData.arrival_time,
            end_time: formData.departure_time,
            notes: formData.notes,
            status: formData.status,
            staff_member_id: formData.staff_member_id || undefined,
          }),
        })

        if (!response.ok) throw new Error("Failed to update staff member")

        const updated = await response.json()
        const presented = updated.staff || presentShift(updated.shift)
        onStaffUpdate(staff.map((member) => (member.id === selectedStaff.id ? presented : member)))
      } else {
        if (!formData.staff_member_id || !formData.shift_date || !formData.arrival_time || !formData.departure_time) {
          toast.error("Select a staff member and shift times")
          return
        }

        const response = await fetch(`/api/events/${eventId}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            staff_member_id: formData.staff_member_id,
            shift_date: formData.shift_date,
            start_time: formData.arrival_time,
            end_time: formData.departure_time,
            role_assignment: formData.role || undefined,
            notes: formData.notes || undefined,
          }),
        })

        if (!response.ok) throw new Error("Failed to create staff member")

        const created = await response.json()
        onStaffUpdate([...staff, presentShift(created.shift)])
      }

      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      setSelectedStaff(null)
      toast.success(selectedStaff ? "Staff updated" : "Staff assigned")
    } catch (error) {
      console.error("Error saving staff member:", error)
      toast.error("Failed to save staff assignment")
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedStaff) return

    try {
      const response = await fetch(`/api/events/${eventId}/staff/${selectedStaff.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete staff member")

      onStaffUpdate(staff.filter((member) => member.id !== selectedStaff.id))
      setIsDeleteDialogOpen(false)
      setSelectedStaff(null)
      toast.success("Staff assignment removed")
    } catch (error) {
      console.error("Error deleting staff member:", error)
      toast.error("Failed to remove staff assignment")
    }
  }

  const handleStatusChange = async (staffId: string, newStatus: Staff["status"]) => {
    try {
      const response = await fetch(`/api/events/${eventId}/staff/${staffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update staff status")

      const updated = await response.json()
      const presented = updated.staff || presentShift(updated.shift)
      onStaffUpdate(staff.map((member) => (member.id === staffId ? presented : member)))
    } catch (error) {
      console.error("Error updating staff status:", error)
      toast.error("Failed to update status")
    }
  }

  function renderStaffForm() {
    return (
      <div className="space-y-4">
        {!selectedStaff && (
          <div className="space-y-2">
            <Label>Staff member</Label>
            <Select
              value={formData.staff_member_id}
              onValueChange={(value) => {
                const member = availableMembers.find((m) => m.id === value)
                setFormData({
                  ...formData,
                  staff_member_id: value,
                  role: formData.role || member?.role || "",
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Role assignment</Label>
          <Input
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="Stagehand, FOH, etc."
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Shift date</Label>
            <Input
              type="date"
              value={formData.shift_date}
              onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Start</Label>
            <Input
              type="time"
              value={formData.arrival_time}
              onChange={(e) => setFormData({ ...formData, arrival_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>End</Label>
            <Input
              type="time"
              value={formData.departure_time}
              onChange={(e) => setFormData({ ...formData, departure_time: e.target.value })}
            />
          </div>
        </div>
        {selectedStaff && (
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as Staff["status"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Event Staff</h2>
          <p className="text-slate-400">Manage staff assignments and schedules</p>
        </div>
        <Button onClick={handleCreateStaff}>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Confirmed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{confirmedStaff}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{pendingStaff}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{declinedStaff}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search staff..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Filter role..."
          value={filterRole === "all" ? "" : filterRole}
          onChange={(e) => setFilterRole(e.target.value || "all")}
          className="max-w-xs"
        />
      </div>

      <div className="space-y-3">
        {filteredStaff.map((member) => (
          <Card key={member.id} className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-white">{member.name}</div>
                  <div className="text-sm text-slate-400">{member.role}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                    {member.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </span>
                    )}
                    {member.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {member.phone}
                      </span>
                    )}
                    {member.arrival_time && (
                      <span className="inline-flex items-center gap-1">
                        <Clock4 className="h-3 w-3" />
                        {member.arrival_time}–{member.departure_time}
                      </span>
                    )}
                    {member.shift_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {member.shift_date}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getStatusColor(member.status)}>
                  <span className="mr-1">{getStatusIcon(member.status)}</span>
                  {member.status}
                </Badge>
                <Select
                  value={member.status}
                  onValueChange={(value) => handleStatusChange(member.id, value as Staff["status"])}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => handleEditStaff(member)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleDeleteStaff(member)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredStaff.length === 0 && (
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-8 text-center text-slate-400">
              No staff assignments yet. Add crew from your staff roster.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign staff</DialogTitle>
          </DialogHeader>
          {renderStaffForm()}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff}>Assign</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit staff assignment</DialogTitle>
          </DialogHeader>
          {renderStaffForm()}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveStaff}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the shift assignment for {selectedStaff?.name}. It does not delete the staff member record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
