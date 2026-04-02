"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, CheckCircle, Clock, XCircle, Users, Mail, Phone, Calendar, User, UserPlus, Building } from "lucide-react"
import { toast } from "sonner"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface TourMember {
  id: string
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

export function TourTeamManager({ tourId, members, onMembersUpdate }: TourTeamManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isCreateTeamDialogOpen, setIsCreateTeamDialogOpen] = useState(false)
  const [isAddUserToTeamDialogOpen, setIsAddUserToTeamDialogOpen] = useState(false)
  const [isSearchLoading, setIsSearchLoading] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TourMember | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<TourTeam | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [userResults, setUserResults] = useState<Array<{ id: string; email: string; display_name?: string }>>([])
  const [teams, setTeams] = useState<TourTeam[]>([])
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
    team_id: ''
  })

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
      team_id: ''
    })
  }

  const handleAddMember = () => {
    resetForm()
    setIsAddDialogOpen(true)
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
      team_id: member.team_id || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleDeleteMember = (member: TourMember) => {
    setSelectedMember(member)
    setIsDeleteDialogOpen(true)
  }

  const handleCreateTeam = () => {
    if (newTeam.name && newTeam.role) {
      const team: TourTeam = {
        id: Date.now().toString(),
        name: newTeam.name,
        role: newTeam.role,
        description: newTeam.description,
        members: [],
        created_at: new Date().toISOString()
      }
      setTeams([...teams, team])
      setNewTeam({ name: '', role: '', description: '' })
      setIsCreateTeamDialogOpen(false)
      toast.success('Team created successfully')
    }
  }

  const handleAddUserToTeam = (team: TourTeam) => {
    setSelectedTeam(team)
    setIsAddUserToTeamDialogOpen(true)
  }

  const handleAssignUserToTeam = async (userId: string, teamId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tours/${tourId}/assign-user-to-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, teamId })
      })
      if (!res.ok) throw new Error('Failed to assign user to team')
      
      // Update local state
      const user = userResults.find(u => u.id === userId)
      if (!user) return
      
      const newMember: TourMember = {
        id: user.id,
        name: user.display_name || user.email.split('@')[0],
        role: 'member',
        email: user.email,
        status: 'confirmed'
      }
      
      const updatedTeams = teams.map(team => 
        team.id === teamId 
          ? { ...team, members: [...team.members, newMember] }
          : team
      )
      setTeams(updatedTeams)
      
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
      // Lightweight email search via public profiles view if available; fallback to admin API
      const params = new URLSearchParams({ query: userQuery })
      const res = await fetch(`/api/admin/users/search?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setUserResults(data.users || [])
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
      const res = await fetch(`/api/tours/${tourId}/assign-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, status: 'confirmed' })
      })
      if (!res.ok) throw new Error('Failed to assign user')
      const data = await res.json()
      onMembersUpdate([...members, data.member])
      toast.success('User assigned to tour')
      setIsInviteDialogOpen(false)
    } catch {
      toast.error('Failed to assign user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inviteMember = async (payload: { email?: string; phone?: string; role: string }) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/tours/${tourId}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: payload.email,
          phone: payload.phone,
          role: payload.role,
          positionDetails: {
            title: payload.role,
            description: `Tour team invitation for ${payload.role}`
          }
        })
      })
      if (!res.ok) throw new Error('Failed to send invite')
      toast.success('Invitation sent')
      setIsInviteDialogOpen(false)
    } catch (e) {
      toast.error('Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (isEdit: boolean = false) => {
    setIsSubmitting(true)
    try {
      const url = isEdit 
        ? `/api/tours/${tourId}/team/${selectedMember?.id}`
        : `/api/tours/${tourId}/team`
      
      const method = isEdit ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to save team member')
      }

      const result = await response.json()
      
      if (isEdit) {
        const updatedMembers = members.map(member => 
          member.id === selectedMember?.id ? result.member : member
        )
        onMembersUpdate(updatedMembers)
        toast.success('Team member updated successfully')
      } else {
        const newMembers = [...members, result.member]
        onMembersUpdate(newMembers)
        toast.success('Team member added successfully')
      }

      setIsAddDialogOpen(false)
      setIsEditDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error('Error saving team member:', error)
      toast.error('Failed to save team member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedMember) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tours/${tourId}/team/${selectedMember.id}`, {
        method: 'DELETE'
      })

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tour Team</h2>
          <p className="text-slate-400">Manage team members for this tour</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateTeamDialogOpen(true)} variant="outline" className="border-slate-600 text-slate-300">
            <Building className="mr-2 h-4 w-4" />
            Create Team
          </Button>
          <Button onClick={() => setIsInviteDialogOpen(true)} variant="outline" className="border-slate-600 text-slate-300">
            Invite
          </Button>
          <Button onClick={handleAddMember} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Teams Section */}
      {teams.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Teams</h3>
          <div className="grid gap-4">
            {teams.map((team) => (
              <Card key={team.id} className="bg-slate-900/50 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
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
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddUserToTeam(team)}
                        className="border-slate-600 text-slate-300"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add User
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
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search team members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800/50 border-slate-700 text-white"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Team Members Grid */}
      <div className="grid gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.id} className="bg-slate-900/50 border-slate-700/50 hover:bg-slate-900/70 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-white">{member.name}</h4>
                    <p className="text-sm text-slate-400">{member.role}</p>
                    <div className="flex items-center space-x-4 mt-1">
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
                <div className="flex items-center space-x-2">
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

      {filteredMembers.length === 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Team Members Found</h3>
            <p className="text-slate-400 mb-6">
              {searchTerm || filterStatus !== 'all' 
                ? 'No team members match your current filters'
                : 'Get started by adding your first team member to this tour'
              }
            </p>
            <Button onClick={handleAddMember} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="mr-2 h-4 w-4" />
              Add First Member
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Phone (Optional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Arrival Date</Label>
                <Input
                  type="date"
                  value={formData.arrival_date}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Departure Date</Label>
                <Input
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
              <Label className="text-slate-300">Team (Optional)</Label>
              <Select value={formData.team_id} onValueChange={(value: any) => setFormData({ ...formData, team_id: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
              <Label className="text-slate-300">Responsibilities (Optional)</Label>
              <Textarea
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Role</Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Phone (Optional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Arrival Date</Label>
                <Input
                  type="date"
                  value={formData.arrival_date}
                  onChange={(e) => setFormData({ ...formData, arrival_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-300">Departure Date</Label>
                <Input
                  type="date"
                  value={formData.departure_date}
                  onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
              <Label className="text-slate-300">Team (Optional)</Label>
              <Select value={formData.team_id} onValueChange={(value: any) => setFormData({ ...formData, team_id: value })}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
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
              <Label className="text-slate-300">Responsibilities (Optional)</Label>
              <Textarea
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? 'Updating...' : 'Update Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              Are you sure you want to remove "{selectedMember?.name}" from the tour team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Removing...' : 'Remove Member'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Team Dialog */}
      <Dialog open={isCreateTeamDialogOpen} onOpenChange={setIsCreateTeamDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Team Name</Label>
              <Input
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                placeholder="e.g., Sound Crew, Lighting Team"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <Label className="text-slate-300">Team Role</Label>
              <Input
                value={newTeam.role}
                onChange={(e) => setNewTeam({ ...newTeam, role: e.target.value })}
                placeholder="e.g., Technical Support, Stage Management"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Description (Optional)</Label>
              <Textarea
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                placeholder="Describe the team's responsibilities..."
                className="bg-slate-700 border-slate-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateTeamDialogOpen(false)}
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTeam}
                disabled={!newTeam.name || !newTeam.role}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add User to Team Dialog */}
      <Dialog open={isAddUserToTeamDialogOpen} onOpenChange={setIsAddUserToTeamDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add User to {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Search existing users (email)</Label>
              <div className="flex gap-2">
                <Input 
                  value={userQuery} 
                  onChange={(e) => setUserQuery(e.target.value)} 
                  placeholder="jane@company.com" 
                  className="bg-slate-700 border-slate-600 text-white" 
                />
                <Button variant="outline" onClick={searchExistingUsers} className="border-slate-600 text-slate-300">
                  {isSearchLoading ? '...' : 'Search'}
                </Button>
              </div>
              {userResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-600">
                  {userResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm text-slate-200">
                      <div>
                        <div className="font-medium">{u.display_name || u.email}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleAssignUserToTeam(u.id, selectedTeam!.id)} 
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Add to Team
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddUserToTeamDialogOpen(false)} className="border-slate-600 text-slate-300">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Search existing users (email)</Label>
              <div className="flex gap-2">
                <Input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="jane@company.com" className="bg-slate-700 border-slate-600 text-white" />
                <Button variant="outline" onClick={searchExistingUsers} className="border-slate-600 text-slate-300">
                  {isSearchLoading ? '...' : 'Search'}
                </Button>
              </div>
              {userResults.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-slate-600">
                  {userResults.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 text-sm text-slate-200">
                      <div>
                        <div className="font-medium">{u.display_name || u.email}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </div>
                      <Button size="sm" onClick={() => assignExistingUser(u.id, formData.role || 'Member')} className="bg-purple-600 hover:bg-purple-700">Assign</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Invite Email</Label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div>
                <Label className="text-slate-300">Role</Label>
                <Input value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} className="border-slate-600 text-slate-300">Cancel</Button>
              <Button onClick={() => inviteMember({ email: formData.email, role: formData.role })} disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">Send Invite</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 