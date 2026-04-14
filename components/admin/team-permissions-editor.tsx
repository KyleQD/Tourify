"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Shield,
  Users,
  Edit,
  Save,
  X,
  Search,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Settings,
  Calendar,
  BarChart3,
  FileText,
  UserPlus,
  Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TeamMember {
  id: string
  user_id?: string
  venue_id?: string
  role: string
  permissions: Record<string, boolean>
  status: string
  created_at: string
  profiles?: {
    id: string
    full_name?: string
    email?: string
    avatar_url?: string
  }
}

interface TeamPermissionsEditorProps {
  venueId?: string
}

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'manager', label: 'Manager', description: 'Manage events, bookings, and team' },
  { value: 'coordinator', label: 'Coordinator', description: 'Coordinate events and logistics' },
  { value: 'staff', label: 'Staff', description: 'View assigned tasks and schedules' },
  { value: 'member', label: 'Member', description: 'Basic read access' },
]

const PERMISSION_GROUPS = [
  {
    label: 'Bookings & Events',
    icon: Calendar,
    permissions: [
      { key: 'manage_bookings', label: 'Manage Bookings', description: 'Create, edit, and cancel bookings' },
      { key: 'manage_events', label: 'Manage Events', description: 'Create and modify events' },
    ]
  },
  {
    label: 'Analytics & Reporting',
    icon: BarChart3,
    permissions: [
      { key: 'view_analytics', label: 'View Analytics', description: 'Access dashboards and reports' },
    ]
  },
  {
    label: 'Team Management',
    icon: Users,
    permissions: [
      { key: 'manage_team', label: 'Manage Team', description: 'Add, remove, and edit team members' },
    ]
  },
  {
    label: 'Documents & Files',
    icon: FileText,
    permissions: [
      { key: 'manage_documents', label: 'Manage Documents', description: 'Upload and manage files' },
    ]
  },
  {
    label: 'Logistics',
    icon: Settings,
    permissions: [
      { key: 'manage_logistics', label: 'Manage Logistics', description: 'Transportation, equipment, catering' },
      { key: 'manage_inventory', label: 'Manage Inventory', description: 'Equipment and asset tracking' },
    ]
  },
  {
    label: 'Financial',
    icon: BarChart3,
    permissions: [
      { key: 'view_financials', label: 'View Financials', description: 'View revenue and expenses' },
      { key: 'manage_financials', label: 'Manage Financials', description: 'Process payments and invoices' },
    ]
  },
]

const ROLE_PERMISSION_PRESETS: Record<string, Record<string, boolean>> = {
  admin: {
    manage_bookings: true,
    manage_events: true,
    view_analytics: true,
    manage_team: true,
    manage_documents: true,
    manage_logistics: true,
    manage_inventory: true,
    view_financials: true,
    manage_financials: true,
  },
  manager: {
    manage_bookings: true,
    manage_events: true,
    view_analytics: true,
    manage_team: false,
    manage_documents: true,
    manage_logistics: true,
    manage_inventory: true,
    view_financials: true,
    manage_financials: false,
  },
  coordinator: {
    manage_bookings: true,
    manage_events: true,
    view_analytics: true,
    manage_team: false,
    manage_documents: false,
    manage_logistics: true,
    manage_inventory: false,
    view_financials: false,
    manage_financials: false,
  },
  staff: {
    manage_bookings: false,
    manage_events: false,
    view_analytics: false,
    manage_team: false,
    manage_documents: false,
    manage_logistics: false,
    manage_inventory: false,
    view_financials: false,
    manage_financials: false,
  },
  member: {
    manage_bookings: false,
    manage_events: false,
    view_analytics: false,
    manage_team: false,
    manage_documents: false,
    manage_logistics: false,
    manage_inventory: false,
    view_financials: false,
    manage_financials: false,
  },
}

export function TeamPermissionsEditor({ venueId }: TeamPermissionsEditorProps) {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editedRole, setEditedRole] = useState("")
  const [editedPermissions, setEditedPermissions] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (venueId) params.set('venue_id', venueId)

      const res = await fetch(`/api/admin/team-members?${params}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members || [])
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to load team members', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [venueId, toast])

  useState(() => { fetchMembers() })

  const openEditor = (member: TeamMember) => {
    setEditingMember(member)
    setEditedRole(member.role)
    setEditedPermissions({ ...member.permissions })
  }

  const handleRoleChange = (role: string) => {
    setEditedRole(role)
    const preset = ROLE_PERMISSION_PRESETS[role]
    if (preset) setEditedPermissions({ ...preset })
  }

  const togglePermission = (key: string) => {
    setEditedPermissions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const savePermissions = async () => {
    if (!editingMember) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/team-members', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingMember.id,
          role: editedRole,
          permissions: editedPermissions,
        }),
      })

      if (!res.ok) throw new Error('Failed to save')

      toast({ title: 'Permissions Updated', description: `Updated permissions for ${editingMember.profiles?.full_name || 'team member'}` })
      setEditingMember(null)
      await fetchMembers()
    } catch {
      toast({ title: 'Save Failed', description: 'Could not update permissions', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateMemberStatus = async (memberId: string, status: string) => {
    try {
      const res = await fetch('/api/admin/team-members', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, status }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Status Updated', description: `Member status changed to ${status}` })
      await fetchMembers()
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' })
    }
  }

  const filteredMembers = members.filter(m => {
    const name = m.profiles?.full_name || ''
    const email = m.profiles?.email || ''
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || email.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const getPermissionCount = (perms: Record<string, boolean>) => {
    return Object.values(perms || {}).filter(Boolean).length
  }

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-purple-500 mr-2" />
          <span className="text-slate-400">Loading team members...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Shield className="h-5 w-5 mr-2 text-purple-500" />
            Team Roles & Permissions
          </h3>
          <p className="text-sm text-slate-400 mt-1">{filteredMembers.length} team members</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 w-56"
            />
          </div>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Team Members</h3>
            <p className="text-slate-400">Add team members to manage their roles and permissions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map(member => (
            <Card key={member.id} className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback className="bg-slate-700 text-purple-400">
                        {(member.profiles?.full_name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="text-sm font-medium text-white">{member.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-400">{member.profiles?.email || ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className={
                      member.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      member.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                      member.role === 'coordinator' ? 'bg-green-500/20 text-green-400' :
                      'bg-slate-500/20 text-slate-400'
                    }>
                      {member.role}
                    </Badge>

                    <Badge variant="outline" className="text-xs">
                      {getPermissionCount(member.permissions)} permissions
                    </Badge>

                    <Badge className={
                      member.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      member.status === 'inactive' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }>
                      {member.status}
                    </Badge>

                    <Button variant="ghost" size="sm" onClick={() => openEditor(member)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Permissions
                    </Button>

                    {member.status === 'active' ? (
                      <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => updateMemberStatus(member.id, 'inactive')}>
                        Deactivate
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-green-400" onClick={() => updateMemberStatus(member.id, 'active')}>
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Permission Editor Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => { if (!open) setEditingMember(null) }}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Shield className="h-5 w-5 mr-2 text-purple-500" />
              Edit Permissions: {editingMember?.profiles?.full_name || 'Team Member'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Role Selection */}
            <div>
              <Label className="text-sm text-slate-300 mb-2 block">Role</Label>
              <Select value={editedRole} onValueChange={handleRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-slate-400 ml-2">{r.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                Changing the role applies a permission preset. You can customize individual permissions below.
              </p>
            </div>

            <Separator className="bg-slate-700" />

            {/* Permission Groups */}
            {PERMISSION_GROUPS.map(group => (
              <div key={group.label}>
                <h4 className="text-sm font-medium text-slate-200 flex items-center mb-3">
                  <group.icon className="h-4 w-4 mr-2 text-purple-400" />
                  {group.label}
                </h4>
                <div className="space-y-3">
                  {group.permissions.map(perm => (
                    <div key={perm.key} className="flex items-center justify-between p-3 rounded-md bg-slate-800/50 border border-slate-700/50">
                      <div>
                        <p className="text-sm text-white">{perm.label}</p>
                        <p className="text-xs text-slate-400">{perm.description}</p>
                      </div>
                      <Switch
                        checked={editedPermissions[perm.key] || false}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t border-slate-700 mt-4">
            <Button variant="outline" onClick={() => setEditingMember(null)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save Permissions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
