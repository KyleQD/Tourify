"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, CheckCircle, Clock, XCircle, Users, Mail, Phone, Calendar, User, UserPlus, Building, Copy } from "lucide-react"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { useActingContext } from "@/hooks/use-acting-context"
import { AdminFilterBar } from "@/app/admin/dashboard/components/admin-filter-bar"
import { WorkforceEmptyState, WorkforceMetricCard, WorkforcePanel } from "@/components/hiring/workforce-ui"

interface TourMember {
  id: string
  user_id?: string
  name: string
  role: string
  email: string
  phone?: string
  avatar?: string
  status: 'confirmed' | 'pending' | 'declined'
  arrival_date?: string
  departure_date?: string
  responsibilities?: string
  team_id?: string
}

interface TourTeam {
  id: string
  name: string
  role: string
  description?: string
  members: TourMember[]
  created_at: string
}

interface TourTeamManagerProps {
  tourId: string
  members: TourMember[]
  onMembersUpdate: (members: TourMember[]) => void
}

interface WorkflowTask {
  id: string
  title: string
  status: "todo" | "doing" | "done" | "blocked"
  priority: "low" | "medium" | "high" | "critical"
  assignee_id: string | null
  due_at: string | null
}

interface WorkflowMessage {
  id: string
  body: string
  sender_id: string | null
  created_at: string
}

interface OrganizationPerson {
  id: string
  userId: string
  name: string
  email: string | null
  role: string | null
  status: string | null
  staffMemberId: string | null
}

interface OnboardingTemplate {
  id: string
  name: string
  isDefault: boolean
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}))
  const message = typeof body.error === "string"
    ? body.error
    : typeof body.error?.message === "string"
      ? body.error.message
      : fallback
  return new Error(message)
}

export function TourTeamManager({ tourId, members, onMembersUpdate }: TourTeamManagerProps) {
  const { actingAccount, actingContextKey, actingHeaders, isActingReady } = useActingContext()
  const orgId = actingAccount?.profile_data?.ops_org_id
  const adminRequest = useCallback((input?: RequestInit): RequestInit => ({
    ...input,
    headers: { ...actingHeaders, ...(input?.headers || {}) },
  }), [actingHeaders])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false)
  const [isDeleteTeamDialogOpen, setIsDeleteTeamDialogOpen] = useState(false)
  const [isEditingTeam, setIsEditingTeam] = useState(false)
  const [isAddUserToTeamDialogOpen, setIsAddUserToTeamDialogOpen] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TourMember | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TourTeam | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<OrganizationPerson[]>([])
  const [onboardingTemplates, setOnboardingTemplates] = useState<OnboardingTemplate[]>([])
  const [assignmentMode, setAssignmentMode] = useState<"person" | "invite">("person")
  const [assignmentError, setAssignmentError] = useState("")
  const [teams, setTeams] = useState<TourTeam[]>([])
  const [workflowThreadId, setWorkflowThreadId] = useState<string | null>(null)
  const [workflowTasks, setWorkflowTasks] = useState<WorkflowTask[]>([])
  const [workflowMessages, setWorkflowMessages] = useState<WorkflowMessage[]>([])
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(false)
  const [workflowTaskTitle, setWorkflowTaskTitle] = useState("")
  const [workflowTaskPriority, setWorkflowTaskPriority] = useState<WorkflowTask["priority"]>("medium")
  const [workflowTaskAssigneeId, setWorkflowTaskAssigneeId] = useState("")
  const [workflowMessageBody, setWorkflowMessageBody] = useState("")
  const [inviteLink, setInviteLink] = useState("")
  const [newTeam, setNewTeam] = useState({
    name: '',
    role: '',
    description: ''
  })

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    status: 'pending' as const,
    arrival_date: '',
    departure_date: '',
    responsibilities: '',
    team_id: '',
    department: 'General',
    template_id: ''
  })

  const syncWorkflow = useCallback(async () => {
    if (!isActingReady) return
    setIsWorkflowLoading(true)
    try {
      const threadResponse = await fetch('/api/workflows/threads', adminRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope_type: 'tour',
          scope_id: tourId,
          title: 'Tour workflow',
        }),
      }))
      if (!threadResponse.ok) return
      const threadPayload = await threadResponse.json()
      const threadId = threadPayload?.thread?.id
      if (!threadId) return
      setWorkflowThreadId(threadId)

      const [tasksResponse, messagesResponse] = await Promise.all([
        fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/tasks`, adminRequest({ cache: 'no-store' })),
        fetch(`/api/workflows/threads/${encodeURIComponent(threadId)}/messages`, adminRequest({ cache: 'no-store' })),
      ])

      if (tasksResponse.ok) {
        const tasksPayload = await tasksResponse.json()
        setWorkflowTasks(tasksPayload?.tasks || [])
      }
      if (messagesResponse.ok) {
        const messagesPayload = await messagesResponse.json()
        setWorkflowMessages(messagesPayload?.messages || [])
      }
    } catch (error) {
      console.warn('[tour team manager] workflow sync skipped:', error)
    } finally {
      setIsWorkflowLoading(false)
    }
  }, [adminRequest, isActingReady, tourId])

  useEffect(() => {
    if (!isActingReady) {
      setTeams([])
      return
    }
    void syncWorkflow()
    void (async () => {
      const response = await fetch(`/api/admin/tours/teams?tour_id=${encodeURIComponent(tourId)}`, adminRequest())
      if (!response.ok) return
      const payload = await response.json()
      setTeams(payload.data || [])
    })()
  }, [actingContextKey, adminRequest, isActingReady, syncWorkflow, tourId])

  useEffect(() => {
    if (!isActingReady || !orgId) return
    let cancelled = false
    void (async () => {
      const [peopleResponse, templatesResponse] = await Promise.all([
        fetch(`/api/admin/workforce/people?tour_id=${encodeURIComponent(tourId)}&include_pending=true`, adminRequest({ cache: 'no-store' })),
        fetch(`/api/admin/onboarding/templates?entity_type=organization&entity_id=${encodeURIComponent(orgId)}`, adminRequest({ cache: 'no-store' })),
      ])
      const peoplePayload = await peopleResponse.json().catch(() => ({}))
      const templatesPayload = await templatesResponse.json().catch(() => ({}))
      if (cancelled) return
      if (peopleResponse.ok) setUserResults(peoplePayload.people || peoplePayload.members || [])
      if (templatesResponse.ok) {
        setOnboardingTemplates((templatesPayload.data || []).map((template: any) => ({
          id: template.id,
          name: template.name,
          isDefault: Boolean(template.is_default ?? template.isDefault),
        })))
      }
    })()
    return () => { cancelled = true }
  }, [adminRequest, isActingReady, orgId, tourId])

  useEffect(() => {
    setTeams(current => current.map(team => ({
      ...team,
      members: members.filter(member => member.team_id === team.id),
    })))
  }, [members])

  useEffect(() => {
    async function syncParticipants() {
      if (!workflowThreadId) return
      const eligibleMembers = members.filter((member) => member.user_id && isUuid(member.user_id))
      if (eligibleMembers.length === 0) return

      await Promise.all(
        eligibleMembers.map((member) =>
          fetch(`/api/workflows/threads/${encodeURIComponent(workflowThreadId)}/participants`, adminRequest({
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              user_id: member.user_id,
              role: member.role.toLowerCase().includes('manager') ? 'admin' : 'member',
              permissions: ['messages.write', 'tasks.manage'],
              status: member.status === 'declined' ? 'removed' : 'active',
            }),
          }))
        )
      )
    }

    void syncParticipants()
  }, [adminRequest, workflowThreadId, members])

  function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  }

  async function handleCreateWorkflowTask() {
    if (!workflowThreadId || !workflowTaskTitle.trim()) return
    try {
      const assigneeId = workflowTaskAssigneeId && isUuid(workflowTaskAssigneeId)
        ? workflowTaskAssigneeId
        : undefined

      const response = await fetch(`/api/workflows/threads/${encodeURIComponent(workflowThreadId)}/tasks`, adminRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: workflowTaskTitle.trim(),
          priority: workflowTaskPriority,
          assignee_id: assigneeId,
        }),
      }))

      if (!response.ok) throw new Error('Failed to create workflow task')
      setWorkflowTaskTitle("")
      await syncWorkflow()
      toast.success('Workflow task created')
    } catch {
      toast.error('Failed to create workflow task')
    }
  }

  async function handleSendWorkflowMessage() {
    if (!workflowThreadId || !workflowMessageBody.trim()) return
    try {
      const response = await fetch(`/api/workflows/threads/${encodeURIComponent(workflowThreadId)}/messages`, adminRequest({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body: workflowMessageBody.trim() }),
      }))
      if (!response.ok) throw new Error('Failed to send workflow message')
      setWorkflowMessageBody("")
      await syncWorkflow()
      toast.success('Workflow message sent')
    } catch {
      toast.error('Failed to send workflow message')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      role: '',
      email: '',
      phone: '',
      status: 'pending',
      arrival_date: '',
      departure_date: '',
      responsibilities: '',
      team_id: '',
      department: 'General',
      template_id: onboardingTemplates.find((template) => template.isDefault)?.id || onboardingTemplates[0]?.id || ''
    })
  }

  const handleAddMember = () => {
    resetForm()
    setAssignmentMode("person")
    setAssignmentError("")
    setIsInviteDialogOpen(true)
  }

  const openInviteDialog = () => {
    resetForm()
    setUserQuery('')
    setUserResults([])
    setInviteLink('')
    setAssignmentMode("invite")
    setAssignmentError("")
    setIsInviteDialogOpen(true)
  }

  const handleEditMember = (member: TourMember) => {
    setSelectedMember(member)
    setFormData({
      name: member.name,
      role: member.role,
      email: member.email,
      phone: member.phone || '',
      status: member.status as "pending",
      arrival_date: member.arrival_date || '',
      departure_date: member.departure_date || '',
      responsibilities: member.responsibilities || '',
      team_id: member.team_id || '',
      department: 'General',
      template_id: ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteMember = (member: TourMember) => {
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const openCreateTeam = () => {
    setSelectedTeam(null)
    setIsEditingTeam(false)
    setNewTeam({ name: '', role: '', description: '' })
    setIsCreateTeamDialogOpen(true)
  }

  const openEditTeam = (team: TourTeam) => {
    setSelectedTeam(team)
    setIsEditingTeam(true)
    setNewTeam({ name: team.name, role: team.role, description: team.description || '' })
    setIsCreateTeamDialogOpen(true)
  }

  const handleSaveTeam = async () => {
    if (newTeam.name && newTeam.role) {
      setIsSubmitting(true)
      try {
        const response = await fetch('/api/admin/tours/teams', adminRequest({
          method: isEditingTeam ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isEditingTeam ? { id: selectedTeam?.id } : { tour_id: tourId }),
            name: newTeam.name,
            role: newTeam.role,
            team_type: newTeam.role,
            description: newTeam.description || null,
          }),
        }))
        if (!response.ok) throw new Error(`Failed to ${isEditingTeam ? 'update' : 'create'} team`)
        const payload = await response.json()
        setTeams(current => isEditingTeam
          ? current.map(team => team.id === selectedTeam?.id ? { ...team, ...payload.data } : team)
          : [...current, payload.data])
        setNewTeam({ name: '', role: '', description: '' })
        setIsCreateTeamDialogOpen(false)
        toast.success(`Team ${isEditingTeam ? 'updated' : 'created'} successfully`)
      } catch {
        toast.error(`Failed to ${isEditingTeam ? 'update' : 'create'} team`)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return
    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/admin/tours/teams?id=${encodeURIComponent(selectedTeam.id)}&tour_id=${encodeURIComponent(tourId)}`,
        adminRequest({ method: 'DELETE' }),
      )
      if (!response.ok) throw new Error('Failed to delete team')
      setTeams(current => current.filter(team => team.id !== selectedTeam.id))
      onMembersUpdate(members.filter(member => member.team_id !== selectedTeam.id))
      setIsDeleteTeamDialogOpen(false)
      setSelectedTeam(null)
      toast.success('Team deleted')
    } catch {
      toast.error('Failed to delete team')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddUserToTeam = (team: TourTeam) => {
    setSelectedTeam(team)
    setIsAddUserToTeamDialogOpen(true)
  }

  const handleAssignUserToTeam = async (userId: string, teamId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/tours/team-members', adminRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_id: tourId, user_id: userId, team_id: teamId, role: 'member', status: 'pending' })
      }))
      if (!res.ok) throw new Error('Failed to assign user to team')
      const payload = await res.json()
      
      const newMember: TourMember = payload.data
      
      const updatedTeams = teams.map(team => 
        team.id === teamId 
          ? { ...team, members: [...team.members, newMember] }
          : team
      )
      setTeams(updatedTeams)
      onMembersUpdate([...members, newMember])
      
      toast.success('User assigned to team successfully')
      setIsAddUserToTeamDialogOpen(false)
    } catch {
      toast.error('Failed to assign user to team')
    } finally {
      setIsSubmitting(false)
    }
  }

  const searchExistingUsers = async () => {
    if (!userQuery || userQuery.trim().length < 2) {
      setUserResults([])
      return
    }
    try {
      setIsSearchLoading(true)
      const params = new URLSearchParams({ tour_id: tourId, include_pending: 'true', query: userQuery })
      const res = await fetch(`/api/admin/workforce/people?${params.toString()}`, adminRequest())
      if (res.ok) {
        const data = await res.json()
        setUserResults(data.people || data.members || [])
      } else setUserResults([])
    } catch {
      setUserResults([])
    } finally {
      setIsSearchLoading(false)
    }
  }

  const assignExistingUser = async (userId: string, role: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/tours/team-members', adminRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tour_id: tourId, user_id: userId, team_id: formData.team_id || undefined, role, status: 'pending', arrival_date: formData.arrival_date || undefined, departure_date: formData.departure_date || undefined, responsibilities: formData.responsibilities || undefined })
      }))
      if (!res.ok) throw await responseError(res, 'Failed to assign user')
      const data = await res.json()
      onMembersUpdate([...members, data.data])
      toast.success('User assigned to tour')
      setIsInviteDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign user'
      setAssignmentError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const inviteMember = async (payload: { name: string; email?: string; phone?: string; role: string }) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tours/${tourId}/invites`, adminRequest({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          phone: payload.phone,
          name: payload.name,
          role: payload.role,
          department: formData.department,
          template_id: formData.template_id,
          team_id: formData.team_id || undefined,
          arrival_date: formData.arrival_date || undefined,
          departure_date: formData.departure_date || undefined,
          responsibilities: formData.responsibilities || undefined,
          positionDetails: {
            title: payload.role,
            description: `Tour team invitation for ${payload.role}`
          }
        })
      }))
      if (!res.ok) throw await responseError(res, 'Failed to send invite')
      const result = await res.json()
      const link = result.acceptUrl
        ? new URL(result.acceptUrl, window.location.origin).toString()
        : ''
      setInviteLink(link)
      if (result.delivery?.delivered) {
        toast.success('Invitation delivered')
        setIsInviteDialogOpen(false)
      } else {
        toast.warning('Invitation created, but automatic delivery is unavailable. Share the link below.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invitation'
      setAssignmentError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (isEdit: boolean = false) => {
    setIsSubmitting(true)
    try {
      const url = '/api/admin/tours/team-members'
      
      const method = isEdit ? 'PATCH' : 'POST'
      
      const response = await fetch(url, adminRequest({
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          team_id: formData.team_id || undefined,
          ...(isEdit ? { id: selectedMember?.id } : { tour_id: tourId }),
        })
      }))

      if (!response.ok) {
        throw await responseError(response, 'Failed to save team member')
      }

      const result = await response.json()
      
      if (isEdit) {
        const updatedMembers = members.map(member => 
          member.id === selectedMember?.id ? result.data : member
        )
        onMembersUpdate(updatedMembers)
        toast.success('Team member updated successfully')
      } else {
        const newMembers = [...members, result.data]
        onMembersUpdate(newMembers)
        toast.success('Team member added successfully')
      }

      setIsEditDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving team member:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save team member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedMember) return

    setIsSubmitting(true)
    try {
      const response = await fetch(
        `/api/admin/tours/team-members?id=${encodeURIComponent(selectedMember.id)}`,
        adminRequest({ method: 'DELETE' }),
      )

      if (!response.ok) {
        throw new Error('Failed to delete team member')
      }

      const updatedMembers = members.filter(member => member.id !== selectedMember.id)
      onMembersUpdate(updatedMembers)
      toast.success('Team member removed successfully')
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error('Error deleting team member:', error)
      toast.error('Failed to delete team member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400'
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'declined': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'declined': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesStatus = filterStatus === 'all' || member.status === filterStatus
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })
  const visibleOrganizationPeople = useMemo(() => {
    const query = userQuery.trim().toLowerCase()
    if (!query) return userResults
    return userResults.filter((person) => [person.name, person.email, person.role]
      .some((value) => value?.toLowerCase().includes(query)))
  }, [userQuery, userResults])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="order-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tour Team</h2>
          <p className="text-slate-400">Manage team members for this tour</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreateTeam} variant="outline" className="border-slate-600 text-slate-300">
            <Building className="mr-2 h-4 w-4" />
            Create Team
          </Button>
          <Button onClick={openInviteDialog} variant="outline" className="border-slate-600 text-slate-300">
            Invite
          </Button>
          <Button onClick={handleAddMember} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="order-2 grid gap-3 sm:grid-cols-3">
        <WorkforceMetricCard label="Confirmed" value={members.filter((member) => member.status === "confirmed").length} icon={CheckCircle} accent="green" />
        <WorkforceMetricCard label="Pending" value={members.filter((member) => member.status === "pending").length} icon={Clock} accent="amber" />
        <WorkforceMetricCard label="Teams" value={teams.length} icon={Building} accent="purple" />
      </div>

      <Card className="order-6 bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Unified Tour Workflow</span>
            <Badge variant="secondary" className="bg-slate-800 text-slate-100">
              {workflowThreadId ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Tasks: {workflowTasks.length}</Badge>
            <Badge variant="outline">Messages: {workflowMessages.length}</Badge>
            <Badge variant="outline">Blocked: {workflowTasks.filter((task) => task.status === 'blocked').length}</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300"
              onClick={() => void syncWorkflow()}
              disabled={isWorkflowLoading}
            >
              {isWorkflowLoading ? 'Syncing...' : 'Sync'}
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-300">New workflow task</Label>
              <Input
                value={workflowTaskTitle}
                onChange={(event) => setWorkflowTaskTitle(event.target.value)}
                placeholder="Task title"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={workflowTaskPriority}
                  onValueChange={(value) => setWorkflowTaskPriority(value as WorkflowTask["priority"])}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={workflowTaskAssigneeId}
                  onChange={(event) => setWorkflowTaskAssigneeId(event.target.value)}
                  placeholder="Assignee user UUID"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Button
                type="button"
                onClick={() => void handleCreateWorkflowTask()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create task
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Thread message</Label>
              <Textarea
                value={workflowMessageBody}
                onChange={(event) => setWorkflowMessageBody(event.target.value)}
                placeholder="Share update with the tour thread"
                className="bg-slate-800 border-slate-700 text-white"
                rows={3}
              />
              <Button
                type="button"
                onClick={() => void handleSendWorkflowMessage()}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Send message
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-400">Latest workflow tasks</Label>
              <div className="space-y-2">
                {workflowTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2">
                    <div className="text-sm text-white">{task.title}</div>
                    <div className="text-xs text-slate-400">
                      {task.status} · {task.priority} {task.due_at ? `· due ${formatSafeDate(task.due_at)}` : ''}
                    </div>
                  </div>
                ))}
                {workflowTasks.length === 0 ? (
                  <div className="text-xs text-slate-500">No workflow tasks yet.</div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-400">Latest workflow messages</Label>
              <div className="space-y-2">
                {workflowMessages.slice(-5).reverse().map((message) => (
                  <div key={message.id} className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2">
                    <div className="text-sm text-white">{message.body}</div>
                    <div className="text-xs text-slate-400">{formatSafeDate(message.created_at)}</div>
                  </div>
                ))}
                {workflowMessages.length === 0 ? (
                  <div className="text-xs text-slate-500">No workflow messages yet.</div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Section */}
      {teams.length > 0 && (
        <div className="order-3 space-y-4">
          <h3 className="text-lg font-semibold text-white">Teams</h3>
          <div className="grid gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Building className="h-5 w-5 text-blue-400" />
                        <h4 className="font-medium text-white">{team.name}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {team.role}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {team.members.length} members
                        </Badge>
                      </div>
                      {team.description && (
                        <p className="text-sm text-slate-400">{team.description}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditTeam(team)}
                        className="text-slate-400 hover:text-white"
                        aria-label={`Edit ${team.name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUserToTeam(team)}
                        className="border-slate-600 text-slate-300"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add User
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTeam(team)
                          setIsDeleteTeamDialogOpen(true)
                        }}
                        className="text-red-400 hover:text-red-300"
                        aria-label={`Delete ${team.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Team Members */}
                  {team.members.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-700">
                      <div className="flex flex-wrap gap-2">
                        {team.members.map((member) => (
                          <Badge key={member.id} variant="outline" className="text-xs">
                            {member.name || member.email}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="order-4">
        <AdminFilterBar
          searchPlaceholder="Search tour team…"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          statusValue={filterStatus}
          onStatusChange={setFilterStatus}
          statusOptions={[
            { value: "all", label: "All statuses" },
            { value: "confirmed", label: "Confirmed" },
            { value: "pending", label: "Pending" },
            { value: "declined", label: "Declined" },
          ]}
        />
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length > 0 ? (
      <WorkforcePanel className="order-5 p-3 sm:p-4">
      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="bg-slate-900/50 border-slate-700/50 hover:bg-slate-900/70 transition-colors">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{member.name}</h4>
                    <p className="text-sm text-slate-400">{member.role}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3 text-slate-500" />
                        <span className="text-xs text-slate-500">{member.email}</span>
                      </div>
                      {member.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">{member.phone}</span>
                        </div>
                      )}
                      {member.arrival_date && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          <span className="text-xs text-slate-500">
                            Arrives: {formatSafeDate(member.arrival_date)}
                          </span>
                        </div>
                      )}
                    </div>
                    {member.responsibilities && (
                      <p className="text-xs text-slate-500 mt-1">{member.responsibilities}</p>
                    )}
                    {member.team_id && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">
                          Team: {teams.find(t => t.id === member.team_id)?.name || 'Unknown'}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Badge className={getStatusColor(member.status)}>
                    {getStatusIcon(member.status)}
                    <span className="ml-1 capitalize">{member.status}</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditMember(member)}
                    className="text-slate-400 hover:text-white"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteMember(member)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      </WorkforcePanel>
      ) : null}

      {filteredMembers.length === 0 && (
        <WorkforceEmptyState
          className="order-5"
          icon={Users}
          title={members.length ? "No matching team members" : "No tour team yet"}
          description={members.length ? "Adjust the search or status filter." : "Add an organization person or send a staffing invitation."}
          action={!members.length ? <Button onClick={handleAddMember}><Plus className="mr-2 h-4 w-4" />Add first member</Button> : undefined}
        />
      )}

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn(detailSurfacePattern.dialogContent, "max-w-md")}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={detailSurfacePattern.label}>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={detailSurfacePattern.input}
                />
              </div>
              <div>
                <Label className={detailSurfacePattern.label}>Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className={detailSurfacePattern.input}
                />
              </div>
            </div>
            
            <div>
              <Label className={detailSurfacePattern.label}>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={detailSurfacePattern.input}
              />
            </div>

            <div>
              <Label className={detailSurfacePattern.label}>Phone (Optional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={detailSurfacePattern.input}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className={detailSurfacePattern.label}>Arrival Date</Label>
                <Input
                  type="date"
                  value={formData.arrival_date}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  className={detailSurfacePattern.input}
                />
              </div>
              <div>
                <Label className={detailSurfacePattern.label}>Departure Date</Label>
                <Input
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  className={detailSurfacePattern.input}
                />
              </div>
            </div>

            <div>
              <Label className={detailSurfacePattern.label}>Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={detailSurfacePattern.label}>Team (Optional)</Label>
              <Select value={formData.team_id} onValueChange={(value: any) => setFormData({ ...formData, team_id: value })}>
                <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>{team.name} - {team.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className={detailSurfacePattern.label}>Responsibilities (Optional)</Label>
              <Textarea
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                className={detailSurfacePattern.textarea}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className={detailSurfacePattern.btnOutline}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className={detailSurfacePattern.btnPrimary}
              >
                {isSubmitting ? 'Updating...' : 'Update Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={cn(detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <AlertDialogHeader>
            <AlertDialogTitle className={detailSurfacePattern.title}>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className={detailSurfacePattern.description}>
              Are you sure you want to remove &ldquo;{selectedMember?.name}&rdquo; from the tour team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={detailSurfacePattern.btnOutline}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className={detailSurfacePattern.btnDestructive}
            >
              {isSubmitting ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteTeamDialogOpen} onOpenChange={setIsDeleteTeamDialogOpen}>
        <AlertDialogContent className={cn(detailSurfacePattern.dialogContent)}>
          <div className={detailSurfacePattern.topAccent} />
          <AlertDialogHeader>
            <AlertDialogTitle className={detailSurfacePattern.title}>Delete Team</AlertDialogTitle>
            <AlertDialogDescription className={detailSurfacePattern.description}>
              Delete &ldquo;{selectedTeam?.name}&rdquo; and remove its {selectedTeam?.members.length || 0} members from this tour? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={detailSurfacePattern.btnOutline}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeam} disabled={isSubmitting} className={detailSurfacePattern.btnDestructive}>
              {isSubmitting ? 'Deleting...' : 'Delete Team'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className={cn(detailSurfacePattern.dialogContent, "max-w-md")}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>{isEditingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={detailSurfacePattern.label}>Team Name</Label>
              <Input
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                placeholder="e.g., Sound Crew, Lighting Team"
                className={detailSurfacePattern.input}
              />
            </div>
            
            <div>
              <Label className={detailSurfacePattern.label}>Team Role</Label>
              <Input
                value={newTeam.role}
                onChange={(e) => setNewTeam({ ...newTeam, role: e.target.value })}
                placeholder="e.g., Technical Support, Stage Management"
                className={detailSurfacePattern.input}
              />
            </div>

            <div>
              <Label className={detailSurfacePattern.label}>Description (Optional)</Label>
              <Textarea
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                placeholder="Describe the team's responsibilities..."
                className={detailSurfacePattern.textarea}
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateTeamDialogOpen(false)}
                className={detailSurfacePattern.btnOutline}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTeam}
                disabled={!newTeam.name || !newTeam.role || isSubmitting}
                className={detailSurfacePattern.btnPrimary}
              >
                {isSubmitting ? 'Saving...' : isEditingTeam ? 'Save Team' : 'Create Team'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User to Team Dialog */}
      <Dialog open={isAddUserToTeamDialogOpen} onOpenChange={setIsAddUserToTeamDialogOpen}>
        <DialogContent className={cn(detailSurfacePattern.dialogContent, "max-w-md")}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Add User to {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className={detailSurfacePattern.label}>Search existing users (email)</Label>
              <div className="flex gap-2">
                <Input 
                  value={userQuery} 
                  onChange={(e) => setUserQuery(e.target.value)} 
                  placeholder="jane@company.com" 
                  className={detailSurfacePattern.input} 
                />
                <Button variant="outline" onClick={searchExistingUsers} className={detailSurfacePattern.btnOutline}>
                  {isSearchLoading ? '...' : 'Search'}
                </Button>
              </div>
              {userResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-600">
                  {userResults.map(u => (
                    <div key={u.userId} className="flex items-center justify-between px-3 py-2 text-sm text-slate-200">
                      <div>
                        <div className="font-medium">{u.name || u.email}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleAssignUserToTeam(u.userId, selectedTeam!.id)}
                        className={detailSurfacePattern.btnPrimary}
                      >
                        Add to Team
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddUserToTeamDialogOpen(false)} className={detailSurfacePattern.btnOutline}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className={cn(detailSurfacePattern.dialogContent, "max-h-[90vh] max-w-2xl overflow-y-auto")}>
          <div className={detailSurfacePattern.topAccent} />
          <DialogHeader>
            <DialogTitle className={detailSurfacePattern.title}>Add a tour team member</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {assignmentError ? (
              <Alert variant="destructive" aria-live="polite">
                <AlertDescription>{assignmentError}</AlertDescription>
              </Alert>
            ) : null}

            <Tabs value={assignmentMode} onValueChange={(value) => { setAssignmentMode(value as "person" | "invite"); setAssignmentError("") }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="person">Organization people</TabsTrigger>
                <TabsTrigger value="invite">Invite someone</TabsTrigger>
              </TabsList>

              <TabsContent value="person" className="space-y-3 pt-3">
                <div>
                  <Label htmlFor="tour-person-search" className={detailSurfacePattern.label}>Search people</Label>
                  <div className="flex gap-2">
                    <Input id="tour-person-search" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Name, email, or role" className={detailSurfacePattern.input} />
                    <Button type="button" variant="outline" onClick={searchExistingUsers} className={detailSurfacePattern.btnOutline} disabled={isSearchLoading}>
                      {isSearchLoading ? 'Searching…' : 'Search'}
                    </Button>
                  </div>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto" role="list">
                  {visibleOrganizationPeople.map((person) => (
                    <div key={person.userId} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between" role="listitem">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{person.name}</div>
                        <div className="truncate text-xs text-muted-foreground">{person.email || person.role || 'Organization member'}</div>
                      </div>
                      <Button type="button" size="sm" onClick={() => assignExistingUser(person.userId, formData.role || person.role || 'Crew')} disabled={isSubmitting} className={detailSurfacePattern.btnPrimary}>
                        {isSubmitting ? 'Adding…' : 'Add to tour'}
                      </Button>
                    </div>
                  ))}
                  {visibleOrganizationPeople.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No connected organization people match this search.</div>
                  ) : null}
                </div>
              </TabsContent>

              <TabsContent value="invite" className="space-y-4 pt-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="tour-invite-name" className={detailSurfacePattern.label}>Name</Label>
                    <Input id="tour-invite-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={detailSurfacePattern.input} />
                  </div>
                  <div>
                    <Label htmlFor="tour-invite-role" className={detailSurfacePattern.label}>Role</Label>
                    <Input id="tour-invite-role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className={detailSurfacePattern.input} />
                  </div>
                  <div>
                    <Label htmlFor="tour-invite-email" className={detailSurfacePattern.label}>Email</Label>
                    <Input id="tour-invite-email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={detailSurfacePattern.input} />
                  </div>
                  <div>
                    <Label htmlFor="tour-invite-phone" className={detailSurfacePattern.label}>Verified phone</Label>
                    <Input id="tour-invite-phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className={detailSurfacePattern.input} />
                  </div>
                  <div>
                    <Label htmlFor="tour-invite-department" className={detailSurfacePattern.label}>Department</Label>
                    <Input id="tour-invite-department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className={detailSurfacePattern.input} />
                  </div>
                  <div>
                    <Label className={detailSurfacePattern.label}>Onboarding packet</Label>
                    <Select value={formData.template_id} onValueChange={(value) => setFormData({ ...formData, template_id: value })}>
                      <SelectTrigger className={detailSurfacePattern.selectTrigger}><SelectValue placeholder="Select a packet" /></SelectTrigger>
                      <SelectContent>
                        {onboardingTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}{template.isDefault ? ' · Default' : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className={detailSurfacePattern.label}>Team</Label>
                <Select value={formData.team_id || "unassigned"} onValueChange={(value) => setFormData({ ...formData, team_id: value === "unassigned" ? "" : value })}>
                  <SelectTrigger className={detailSurfacePattern.selectTrigger}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Default Crew team</SelectItem>
                    {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={detailSurfacePattern.label}>Role override</Label>
                <Input value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="Crew" className={detailSurfacePattern.input} />
              </div>
              <div>
                <Label className={detailSurfacePattern.label}>Arrival</Label>
                <Input type="date" value={formData.arrival_date} onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })} className={detailSurfacePattern.input} />
              </div>
              <div>
                <Label className={detailSurfacePattern.label}>Departure</Label>
                <Input type="date" value={formData.departure_date} onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })} className={detailSurfacePattern.input} />
              </div>
            </div>
            <div>
              <Label className={detailSurfacePattern.label}>Responsibilities</Label>
              <Textarea value={formData.responsibilities} onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })} className={detailSurfacePattern.textarea} rows={3} />
            </div>

            {inviteLink ? (
              <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
                <Label className="text-amber-200">Shareable acceptance link</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className={detailSurfacePattern.input} />
                  <Button
                    type="button"
                    variant="outline"
                    className={detailSurfacePattern.btnOutline}
                    onClick={() => {
                      void navigator.clipboard.writeText(inviteLink)
                      toast.success('Invitation link copied')
                    }}
                    aria-label="Copy invitation link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} className={detailSurfacePattern.btnOutline}>Cancel</Button>
              {assignmentMode === "invite" ? (
                <Button
                  onClick={() => inviteMember({ name: formData.name, email: formData.email || undefined, phone: formData.phone || undefined, role: formData.role })}
                  disabled={isSubmitting || !formData.name.trim() || !formData.role.trim() || !(formData.email.trim() || formData.phone.trim()) || !formData.template_id}
                  className={detailSurfacePattern.btnPrimary}
                >
                  {isSubmitting ? 'Creating…' : 'Send invitation'}
                </Button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
