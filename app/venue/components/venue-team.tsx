import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar?: string
  role: string
  status: "active" | "pending"
}

export interface JobPost {
  id: string
  title: string
  description: string
  type: "permanent" | "temporary"
  role: string
  requirements?: string
  contactEmail: string
  postedAt: Date
}

interface VenueTeamProps {
  members: TeamMember[]
  onAdd: (member: TeamMember) => void
  onRemove: (id: string) => void
  onEdit: (member: TeamMember) => void
}

// Simulated user directory for autocomplete (replace with real user search in production)
const userDirectory = [
  { id: "u1", name: "Alex Johnson", email: "alex@industry.com", avatar: "/abstract-aj.png" },
  { id: "u2", name: "Sarah Williams", email: "sarah@artist.com", avatar: "/abstract-southwest.png" },
  { id: "u3", name: "Michael Chen", email: "michael@general.com", avatar: "/microphone-crowd.png" },
]

export function VenueTeam({ members, onAdd, onRemove, onEdit }: VenueTeamProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [inviteUser, setInviteUser] = useState<{ id: string; name: string; email: string; avatar?: string } | null>(null)
  const [inviteRole, setInviteRole] = useState("Staff")
  const [editRole, setEditRole] = useState("Staff")
  const [assignEvent, setAssignEvent] = useState("")
  // Simulated event list for assignment
  const eventList = [
    { id: "e1", title: "Summer Jam Festival" },
    { id: "e2", title: "Jazz Night" },
    { id: "e3", title: "Corporate Event" },
  ]

  // Job board state
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false)
  const [jobForm, setJobForm] = useState({
    title: "",
    description: "",
    type: "permanent" as "permanent" | "temporary",
    role: "Staff",
    requirements: "",
    contactEmail: ""
  })

  function handleAddJob() {
    setJobs(prev => [
      {
        id: Math.random().toString(36).slice(2),
        title: jobForm.title,
        description: jobForm.description,
        type: jobForm.type,
        role: jobForm.role,
        requirements: jobForm.requirements,
        contactEmail: jobForm.contactEmail,
        postedAt: new Date()
      },
      ...prev
    ])
    setIsJobDialogOpen(false)
    setJobForm({ title: "", description: "", type: "permanent", role: "Staff", requirements: "", contactEmail: "" })
  }

  function handleRemoveJob(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  function handleAdd() {
    if (!inviteUser) return
    onAdd({
      id: inviteUser.id,
      name: inviteUser.name,
      email: inviteUser.email,
      avatar: inviteUser.avatar,
      role: inviteRole,
      status: "pending"
    })
    setIsAddDialogOpen(false)
    setInviteUser(null)
    setInviteRole("Staff")
  }

  function handleEdit() {
    if (!selectedMember) return
    onEdit({ ...selectedMember, role: editRole })
    setIsEditDialogOpen(false)
    setSelectedMember(null)
  }

  function handleRemove() {
    if (!selectedMember) return
    onRemove(selectedMember.id)
    setIsRemoveDialogOpen(false)
    setSelectedMember(null)
  }

  function handleResendInvite(member: TeamMember) {
    // Simulate resend invite (show toast or feedback in real app)
    alert(`Resent invite to ${member.email}`)
  }

  function handleAssignEvent() {
    // Simulate assignment (show toast or feedback in real app)
    alert(`Assigned ${selectedMember?.name} to event: ${assignEvent}`)
    setIsAssignDialogOpen(false)
    setAssignEvent("")
    setSelectedMember(null)
  }

  // Simulated user search/autocomplete
  const filteredUsers = userDirectory.filter(
    u =>
      !members.some(m => m.id === u.id) &&
      (u.name.toLowerCase().includes((inviteUser?.name || "").toLowerCase()) ||
        u.email.toLowerCase().includes((inviteUser?.email || "").toLowerCase()))
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Team Members</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>Add Member</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {members.map(member => (
          <Card key={member.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <Avatar>
                <AvatarImage src={member.avatar} />
                <AvatarFallback>{member.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{member.name}</div>
                <div className="text-sm text-gray-400">{member.email}</div>
                <div className="text-xs text-purple-400">{member.role}</div>
                <div className="text-xs text-gray-400">{member.status === "pending" ? "Invite Pending" : "Active"}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedMember(member); setIsEditDialogOpen(true); setEditRole(member.role) }}>Edit</Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedMember(member); setIsRemoveDialogOpen(true) }}>Remove</Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedMember(member); setIsAssignDialogOpen(true) }}>Assign to Event</Button>
                {member.status === "pending" && (
                  <Button variant="secondary" size="sm" onClick={() => handleResendInvite(member)}>
                    Resend Invite
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Job Board Section */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Job Board</h2>
          <Button onClick={() => setIsJobDialogOpen(true)}>Post a Job</Button>
        </div>
        {jobs.length === 0 ? (
          <div className="text-gray-400">No jobs posted yet.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {jobs.map(job => (
              <Card key={job.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold text-white">{job.title}</div>
                    <Button variant="outline" size="sm" onClick={() => handleRemoveJob(job.id)}>Remove</Button>
                  </div>
                  <div className="text-xs text-purple-400 mb-1">{job.role} • {job.type.charAt(0).toUpperCase() + job.type.slice(1)}</div>
                  <div className="text-gray-300 mb-2">{job.description}</div>
                  {job.requirements && <div className="text-xs text-gray-400 mb-2">Requirements: {job.requirements}</div>}
                  <div className="text-xs text-gray-400">Contact: {job.contactEmail}</div>
                  <div className="text-xs text-gray-500 mt-1">Posted {formatSafeDate(job.postedAt.toISOString())}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Post Job Dialog */}
      <Dialog open={isJobDialogOpen} onOpenChange={setIsJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post a Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Job Title"
              value={jobForm.title}
              onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))}
            />
            <Input
              placeholder="Role (e.g. Sound Engineer, Bartender)"
              value={jobForm.role}
              onChange={e => setJobForm(f => ({ ...f, role: e.target.value }))}
            />
            <Select value={jobForm.type} onValueChange={type => setJobForm(f => ({ ...f, type: type as "permanent" | "temporary" }))}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="temporary">Temporary</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Contact Email"
              value={jobForm.contactEmail}
              onChange={e => setJobForm(f => ({ ...f, contactEmail: e.target.value }))}
            />
            <Input
              placeholder="Requirements (optional)"
              value={jobForm.requirements}
              onChange={e => setJobForm(f => ({ ...f, requirements: e.target.value }))}
            />
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
              placeholder="Job Description"
              value={jobForm.description}
              onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddJob} disabled={!jobForm.title || !jobForm.role || !jobForm.contactEmail || !jobForm.description}>Post Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by name or email"
              value={inviteUser?.name || inviteUser?.email || ""}
              onChange={e => setInviteUser({ ...inviteUser, name: e.target.value, email: e.target.value } as any)}
            />
            {filteredUsers.length > 0 && (
              <div className="border rounded bg-gray-800 divide-y divide-gray-700">
                {filteredUsers.map(u => (
                  <div
                    key={u.id}
                    className="p-2 cursor-pointer hover:bg-purple-900/20"
                    onClick={() => setInviteUser(u)}
                  >
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </div>
                ))}
              </div>
            )}
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Technician">Technician</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!inviteUser}>Invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team Member Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="font-semibold">{selectedMember?.name}</div>
            <div className="text-sm text-gray-400">{selectedMember?.email}</div>
            <Select value={editRole} onValueChange={setEditRole}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Technician">Technician</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Remove Confirmation Dialog */}
      <AlertDialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
          </AlertDialogHeader>
          <div>Are you sure you want to remove {selectedMember?.name} from your team?</div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRemove}>Remove</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Assign to Event Dialog (scaffold) */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selectedMember?.name} to Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignEvent} onValueChange={setAssignEvent}>
              <SelectTrigger>
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent>
                {eventList.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={handleAssignEvent} disabled={!assignEvent}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
