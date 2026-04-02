"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  usePermissions, 
  useRoleManagement, 
  useRolesAndPermissions,
  usePermissionGuard
} from '@/hooks/use-rbac'
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Settings,
  Eye,
  Lock,
  Unlock,
  Crown,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Star,
  Award,
  Building2,
  Calendar,
  DollarSign,
  MessageSquare,
  BarChart3,
  Truck,
  Music
} from 'lucide-react'
import { PERMISSIONS } from '@/types/rbac'
import type { 
  SystemRole, 
  Permission, 
  TourManagementRole, 
  TourManagementPermission
} from '@/types/rbac'

// Permission category icons
const CATEGORY_ICONS = {
  tour_management: Calendar,
  event_management: Star,
  staff_management: Users,
  financial_management: DollarSign,
  logistics_management: Truck,
  communications: MessageSquare,
  analytics: BarChart3,
  administration: Shield
}

// Role color mapping
const ROLE_COLORS = {
  super_admin: 'from-red-500 to-pink-600',
  tour_manager: 'from-purple-500 to-indigo-600',
  artist: 'from-blue-500 to-cyan-600',
  crew_chief: 'from-green-500 to-emerald-600',
  crew_member: 'from-yellow-500 to-orange-600',
  vendor: 'from-gray-500 to-slate-600',
  venue_coordinator: 'from-pink-500 to-rose-600',
  financial_manager: 'from-emerald-500 to-teal-600'
}

export default function RBACManagementPage() {
  const { toast } = useToast()
  const { roles, permissions, loading, error, refreshData } = useRolesAndPermissions()
  const { assignRole, removeRole } = useRoleManagement()
  const { isAllowed } = usePermissionGuard([PERMISSIONS.ADMIN_ROLES])
  
  const [selectedRole, setSelectedRole] = useState<TourManagementRole | null>(null)
  const [showCreateRole, setShowCreateRole] = useState(false)
  const [showAssignRole, setShowAssignRole] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedTour, setSelectedTour] = useState('')
  const [newRole, setNewRole] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: [] as string[]
  })

  // Permission management state
  const [editingPermissions, setEditingPermissions] = useState(false)
  const [tempPermissions, setTempPermissions] = useState<string[]>([])

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = []
    }
    acc[permission.category].push(permission)
    return acc
  }, {} as Record<string, TourManagementPermission[]>)

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.display_name.trim()) {
      toast({ title: "Error", description: "Name and display name are required.", variant: "destructive" })
      return
    }

    try {
      const res = await fetch('/api/admin/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRole.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: newRole.display_name,
          description: newRole.description,
          scope_type: 'entity',
          permission_ids: newRole.permissions,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create role')
      }

      toast({
        title: "Role Created",
        description: `Role "${newRole.display_name}" has been created successfully.`,
      })
      setShowCreateRole(false)
      setNewRole({ name: '', display_name: '', description: '', permissions: [] })
      await refreshData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to create role. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle role assignment
  const handleAssignRole = async () => {
    if (!selectedRole || !selectedUser) return

    try {
      await assignRole(selectedUser, selectedRole.name as SystemRole, selectedTour || undefined)
      toast({
        title: "Role Assigned",
        description: `Role "${selectedRole.display_name}" has been assigned successfully.`,
      })
      setShowAssignRole(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign role. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getPermissionCount = (role: TourManagementRole) => {
    return (role as any).permission_count ?? 0
  }

  const getActiveUsers = (role: TourManagementRole) => {
    return (role as any).active_users ?? 0
  }

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access role management features.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Role & Permission Management
          </h1>
          <p className="text-slate-400 mt-1">Manage user roles and permissions for tour/event management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            onClick={() => setShowAssignRole(true)}
            className="bg-slate-800/50 border-slate-600 backdrop-blur-sm transition-all duration-200"
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Assign Roles
          </Button>
          <Button 
            onClick={() => setShowCreateRole(true)} 
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
          <TabsTrigger value="roles" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">
            <Crown className="h-4 w-4 mr-2" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="matrix" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm">
            <Settings className="h-4 w-4 mr-2" />
            Permission Matrix
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => {
              const IconComponent = CATEGORY_ICONS.administration
              const gradient = ROLE_COLORS[role.name as keyof typeof ROLE_COLORS] || 'from-gray-500 to-slate-600'
              
              return (
                <Card 
                  key={role.id} 
                  className="bg-slate-800/50 border-slate-700 hover:border-purple-500/40 transition-all duration-300 cursor-pointer group"
                  onClick={() => setSelectedRole(role)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-sm bg-gradient-to-r shadow-lg ${gradient}`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex items-center space-x-2">
                        {role.is_system_role && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRole(role)
                            setEditingPermissions(true)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-white">{role.display_name}</CardTitle>
                      <CardDescription className="text-slate-400">
                        {role.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Permission Count */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Permissions</span>
                        <Badge variant="outline" className="text-purple-400 border-purple-400">
                          {getPermissionCount(role)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Active Users</span>
                        <span className="text-slate-200 font-medium">
                          {getActiveUsers(role)}
                        </span>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex space-x-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs border-slate-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRole(role)
                            setShowAssignRole(true)
                          }}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs border-slate-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedRole(role)
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => {
            const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Shield
            
            return (
              <Card key={category} className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center text-white">
                    <IconComponent className="h-5 w-5 mr-2 text-purple-400" />
                    {category.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </CardTitle>
                  <CardDescription>
                    {categoryPermissions.length} permissions in this category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryPermissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="p-3 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-700 hover:border-purple-500/40 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-white text-sm">
                            {permission.display_name}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {permission.name.split('.')[1]}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2">
                          {permission.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Permission Matrix Tab */}
        <TabsContent value="matrix" className="space-y-4">
          <Card className="rounded-sm bg-slate-900/60 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Permission Matrix</CardTitle>
              <CardDescription>
                Overview of which roles have which permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium sticky left-0 bg-slate-800/50">Permission</th>
                      {roles.map((role) => (
                        <th key={role.id} className="text-center py-2 px-2 text-slate-400 font-medium min-w-[80px]">
                          <span className="text-xs">{role.display_name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(permissionsByCategory).map(([category, catPerms]) => (
                      <>
                        <tr key={`cat-${category}`} className="bg-slate-900/30">
                          <td colSpan={roles.length + 1} className="py-1.5 px-3 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                            {category.replace(/_/g, ' ')}
                          </td>
                        </tr>
                        {catPerms.map((perm) => (
                          <tr key={perm.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-1.5 px-3 text-slate-300 text-xs sticky left-0 bg-slate-800/50">{perm.display_name}</td>
                            {roles.map((role) => {
                              const hasPermission = (role as any).permissions?.includes(perm.id) ||
                                (role as any).permission_count > 0
                              return (
                                <td key={role.id} className="text-center py-1.5 px-2">
                                  <div className={`mx-auto h-4 w-4 rounded-sm ${hasPermission ? 'bg-purple-500/30' : ''} flex items-center justify-center`}>
                                    {hasPermission && <CheckCircle className="h-3 w-3 text-purple-400" />}
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-slate-300">Role Name (Internal)</Label>
              <Input
                id="name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="e.g., custom_role"
              />
            </div>
            
            <div>
              <Label htmlFor="display_name" className="text-slate-300">Display Name</Label>
              <Input
                id="display_name"
                value={newRole.display_name}
                onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="e.g., Custom Role"
              />
            </div>
            
            <div>
              <Label htmlFor="description" className="text-slate-300">Description</Label>
              <Input
                id="description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Describe what this role can do..."
              />
            </div>

            {/* Permission Selection */}
            <div>
              <Label className="text-slate-300 text-base font-semibold">Permissions</Label>
              <div className="mt-3 max-h-64 overflow-y-auto space-y-4">
                {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                  <div key={category}>
                    <div className="text-sm font-medium text-slate-300 mb-2 capitalize">
                      {category.replace('_', ' ')}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryPermissions.map((permission) => (
                        <div key={permission.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={permission.id}
                            checked={newRole.permissions.includes(permission.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewRole({
                                  ...newRole,
                                  permissions: [...newRole.permissions, permission.id]
                                })
                              } else {
                                setNewRole({
                                  ...newRole,
                                  permissions: newRole.permissions.filter(p => p !== permission.id)
                                })
                              }
                            }}
                          />
                          <Label 
                            htmlFor={permission.id} 
                            className="text-sm text-slate-300 cursor-pointer"
                          >
                            {permission.display_name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowCreateRole(false)}
                className="border-slate-600 backdrop-blur-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateRole} 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
              >
                Create Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignRole} onOpenChange={setShowAssignRole}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="user" className="text-slate-300">User</Label>
              <Input
                id="user"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Enter user ID or email"
              />
            </div>
            
            <div>
              <Label htmlFor="role-select" className="text-slate-300">Role</Label>
              <Select value={selectedRole?.id || ''} onValueChange={(value) => {
                const role = roles.find(r => r.id === value)
                setSelectedRole(role || null)
              }}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id} className="text-white">
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tour" className="text-slate-300">Tour (Optional)</Label>
              <Input
                id="tour"
                value={selectedTour}
                onChange={(e) => setSelectedTour(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white"
                placeholder="Leave empty for global role"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAssignRole(false)}
                className="border-slate-600 backdrop-blur-sm transition-all duration-200"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAssignRole} 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                disabled={!selectedRole || !selectedUser}
              >
                Assign Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 