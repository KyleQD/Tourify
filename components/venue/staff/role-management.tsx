'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { detailSurfacePattern } from '@/components/dashboard/detail-surface-pattern'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Users, 
  Settings, 
  Calendar, 
  BarChart3, 
  FileText, 
  DollarSign, 
  MessageSquare,
  UserCheck,
  UserX
} from 'lucide-react'
import { 
  VenueRole, 
  VenuePermission, 
  PermissionCategory, 
  RoleLevel,
  SystemRoleName,
  PermissionName
} from '@/types/database.types'

interface RoleManagementProps {
  venueId: string
}

interface CreateRoleFormData {
  roleName: string
  roleDescription: string
  roleLevel: number
  permissions: string[]
}

export function RoleManagement({ venueId }: RoleManagementProps) {
  const [roles, setRoles] = useState<VenueRole[]>([])
  const [permissions, setPermissions] = useState<VenuePermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState<VenueRole | null>(null)
  const [formData, setFormData] = useState<CreateRoleFormData>({
    roleName: '',
    roleDescription: '',
    roleLevel: 1,
    permissions: []
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Permission categories for organization
  const permissionCategories = [
    { key: 'staff', label: 'Staff Management', icon: Users },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'bookings', label: 'Bookings', icon: Calendar },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'payroll', label: 'Payroll', icon: DollarSign },
    { key: 'communications', label: 'Communications', icon: MessageSquare },
    { key: 'admin', label: 'Administration', icon: Shield }
  ]

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [venueId])

  const fetchRoles = async () => {
    try {
      const response = await fetch(`/api/venue/roles?venueId=${venueId}`)
      if (response.ok) {
        const data = await response.json()
        setRoles(data.roles || [])
      }
    } catch (error) {
      console.error('Error fetching roles:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch roles',
        variant: 'destructive'
      })
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/venue/permissions')
      if (response.ok) {
        const data = await response.json()
        setPermissions(data.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch permissions',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRole = async () => {
    if (!formData.roleName.trim()) {
      toast({
        title: 'Error',
        description: 'Role name is required',
        variant: 'destructive'
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/venue/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId,
          roleName: formData.roleName,
          roleDescription: formData.roleDescription,
          roleLevel: formData.roleLevel,
          permissions: formData.permissions
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Role created successfully'
        })
        setIsDialogOpen(false)
        resetForm()
        fetchRoles()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create role',
        variant: 'destructive'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditRole = (role: VenueRole) => {
    setSelectedRole(role)
    setFormData({
      roleName: role.role_name,
      roleDescription: role.role_description || '',
      roleLevel: role.role_level,
      permissions: []
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return

    try {
      const response = await fetch(`/api/venue/roles/${roleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Role deleted successfully'
        })
        fetchRoles()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete role',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      roleName: '',
      roleDescription: '',
      roleLevel: 1,
      permissions: []
    })
    setSelectedRole(null)
    setIsEditing(false)
  }

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(id => id !== permissionId)
        : [...prev.permissions, permissionId]
    }))
  }

  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(p => p.permission_category === category)
  }

  const getRoleLevelLabel = (level: number) => {
    switch (level) {
      case 1: return 'Entry Level'
      case 2: return 'Mid Level'
      case 3: return 'Senior Level'
      case 4: return 'Manager Level'
      case 5: return 'Admin Level'
      default: return 'Unknown'
    }
  }

  const getRoleLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-gray-100 text-gray-800'
      case 2: return 'bg-blue-100 text-blue-800'
      case 3: return 'bg-green-100 text-green-800'
      case 4: return 'bg-purple-100 text-purple-800'
      case 5: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>Loading roles...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Role Management</h2>
          <p className="text-muted-foreground">
            Create and manage roles with specific permissions for your venue staff
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto", detailSurfacePattern.dialogContent)}>
            <div className={detailSurfacePattern.topAccent} />
            <DialogHeader>
              <DialogTitle className={detailSurfacePattern.title}>
                {isEditing ? 'Edit Role' : 'Create New Role'}
              </DialogTitle>
              <DialogDescription className={detailSurfacePattern.description}>
                Define a new role with specific permissions for your venue staff
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic Role Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roleName" className={detailSurfacePattern.label}>Role Name</Label>
                  <Input
                    id="roleName"
                    value={formData.roleName}
                    onChange={(e) => setFormData(prev => ({ ...prev, roleName: e.target.value }))}
                    placeholder="e.g., Event Coordinator"
                    className={detailSurfacePattern.input}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roleLevel" className={detailSurfacePattern.label}>Role Level</Label>
                  <Select
                    value={formData.roleLevel.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, roleLevel: parseInt(value) }))}
                  >
                    <SelectTrigger className={detailSurfacePattern.selectTrigger}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10">
                      <SelectItem value="1">Entry Level</SelectItem>
                      <SelectItem value="2">Mid Level</SelectItem>
                      <SelectItem value="3">Senior Level</SelectItem>
                      <SelectItem value="4">Manager Level</SelectItem>
                      <SelectItem value="5">Admin Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleDescription" className={detailSurfacePattern.label}>Description</Label>
                <Textarea
                  id="roleDescription"
                  value={formData.roleDescription}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleDescription: e.target.value }))}
                  placeholder="Describe the responsibilities and scope of this role..."
                  rows={3}
                  className={detailSurfacePattern.textarea}
                />
              </div>

              {/* Permissions Selection */}
              <div className="space-y-4">
                <Label>Permissions</Label>
                <Tabs defaultValue="staff" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    {permissionCategories.slice(0, 5).map(category => (
                      <TabsTrigger key={category.key} value={category.key}>
                        <category.icon className="mr-2 h-4 w-4" />
                        {category.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-4 mt-2">
                    {permissionCategories.slice(5).map(category => (
                      <TabsTrigger key={category.key} value={category.key}>
                        <category.icon className="mr-2 h-4 w-4" />
                        {category.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {permissionCategories.map(category => (
                    <TabsContent key={category.key} value={category.key} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {getPermissionsByCategory(category.key).map(permission => (
                          <div key={permission.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissions.includes(permission.id)}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                            />
                            <div className="flex-1">
                              <Label htmlFor={permission.id} className="font-medium">
                                {permission.permission_name.replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Label>
                              {permission.permission_description && (
                                <p className="text-sm text-muted-foreground">
                                  {permission.permission_description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className={detailSurfacePattern.btnOutline}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateRole} 
                  disabled={isCreating || !formData.roleName.trim()}
                  className={detailSurfacePattern.btnPrimary}
                >
                  {isCreating ? 'Creating...' : (isEditing ? 'Update Role' : 'Create Role')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{role.role_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {role.role_description || 'No description provided'}
                  </CardDescription>
                </div>
                <Badge className={getRoleLevelColor(role.role_level)}>
                  {getRoleLevelLabel(role.role_level)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {role.is_system_role && (
                    <Badge variant="secondary" className="text-xs">
                      System Role
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    Level {role.role_level}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  {!role.is_system_role && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditRole(role)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Roles Created</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first role to start managing permissions for your venue staff
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Role
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 