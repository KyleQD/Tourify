'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  UserPlus, 
  Shield, 
  Users, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react'
import { 
  VenueRole, 
  VenueUserRole, 
  UserWithRoles,
  VenuePermission,
  PermissionName
} from '@/types/database.types'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface UserRoleAssignmentProps {
  venueId: string
}

interface AssignRoleFormData {
  userId: string
  roleId: string
  expiresAt: string
  notes: string
}

export function UserRoleAssignment({ venueId }: UserRoleAssignmentProps) {
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRoles[]>([])
  const [roles, setRoles] = useState<VenueRole[]>([])
  const [permissions, setPermissions] = useState<VenuePermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAssigning, setIsAssigning] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null)
  const [formData, setFormData] = useState<AssignRoleFormData>({
    userId: '',
    roleId: '',
    expiresAt: '',
    notes: ''
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('assignments')
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [venueId])

  const fetchData = async () => {
    try {
      const [usersResponse, rolesResponse, permissionsResponse] = await Promise.all([
        fetch(`/api/venue/user-roles?venueId=${venueId}`),
        fetch(`/api/venue/roles?venueId=${venueId}`),
        fetch('/api/venue/permissions')
      ])

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        setUsersWithRoles(usersData.usersWithRoles || [])
      }

      if (rolesResponse.ok) {
        const rolesData = await rolesResponse.json()
        setRoles(rolesData.roles || [])
      }

      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json()
        setPermissions(permissionsData.permissions || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssignRole = async () => {
    if (!formData.userId || !formData.roleId) {
      toast({
        title: 'Error',
        description: 'User and role are required',
        variant: 'destructive'
      })
      return
    }

    setIsAssigning(true)
    try {
      const response = await fetch('/api/venue/user-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venueId,
          userId: formData.userId,
          roleId: formData.roleId,
          expiresAt: formData.expiresAt || null,
          notes: formData.notes || null
        })
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Role assigned successfully'
        })
        setIsDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign role')
      }
    } catch (error) {
      console.error('Error assigning role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign role',
        variant: 'destructive'
      })
    } finally {
      setIsAssigning(false)
    }
  }

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!confirm('Are you sure you want to remove this role assignment?')) return

    try {
      const response = await fetch(`/api/venue/user-roles/${userId}/${roleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Role removed successfully'
        })
        fetchData()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove role')
      }
    } catch (error) {
      console.error('Error removing role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove role',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      userId: '',
      roleId: '',
      expiresAt: '',
      notes: ''
    })
  }

  const filteredUsers = usersWithRoles.filter(user => 
    user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.roles.some(role => role.venue_roles?.role_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getPermissionLabel = (permissionName: string) => {
    return permissionName.replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getPermissionCategory = (permissionName: string) => {
    const permission = permissions.find(p => p.permission_name === permissionName)
    return permission?.permission_category || 'unknown'
  }

  const getPermissionCategoryColor = (category: string) => {
    switch (category) {
      case 'staff': return 'bg-blue-100 text-blue-800'
      case 'events': return 'bg-green-100 text-green-800'
      case 'bookings': return 'bg-purple-100 text-purple-800'
      case 'analytics': return 'bg-orange-100 text-orange-800'
      case 'settings': return 'bg-gray-100 text-gray-800'
      case 'documents': return 'bg-indigo-100 text-indigo-800'
      case 'payroll': return 'bg-yellow-100 text-yellow-800'
      case 'communications': return 'bg-pink-100 text-pink-800'
      case 'admin': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
          <CardTitle>User Role Assignment</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Role Assignment</h2>
          <p className="text-muted-foreground">
            Assign roles to users and manage their permissions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role to User</DialogTitle>
              <DialogDescription>
                Assign a role to a user with optional expiration date and notes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                  placeholder="Enter user ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleId">Role</Label>
                <Select
                  value={formData.roleId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, roleId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.role_name} (Level {role.role_level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add notes about this assignment"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignRole} 
                  disabled={isAssigning || !formData.userId || !formData.roleId}
                >
                  {isAssigning ? 'Assigning...' : 'Assign Role'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users or roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assignments">Role Assignments</TabsTrigger>
          <TabsTrigger value="permissions">User Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Role Assignments</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm ? 'No users found matching your search' : 'No users have been assigned roles yet'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Assign First Role
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map(user => (
                <Card key={user.user_id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${user.user_id}`} />
                        <AvatarFallback>
                          {user.user_id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">User {user.user_id.substring(0, 8)}...</CardTitle>
                        <CardDescription>
                          {user.roles.length} role{user.roles.length !== 1 ? 's' : ''} assigned
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {user.roles.map(role => (
                      <div key={role.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge className={getRoleLevelColor(role.venue_roles?.role_level || 1)}>
                              {role.venue_roles?.role_name}
                            </Badge>
                            {role.expires_at && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="mr-1 h-3 w-3" />
                                Expires {formatSafeDate(role.expires_at)}
                              </Badge>
                            )}
                          </div>
                          {role.notes && (
                            <p className="text-sm text-muted-foreground">{role.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRole(user.user_id, role.role_id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
                <p className="text-muted-foreground text-center">
                  No users have been assigned roles yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map(user => (
                <Card key={user.user_id}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${user.user_id}`} />
                        <AvatarFallback>
                          {user.user_id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>User {user.user_id.substring(0, 8)}...</CardTitle>
                        <CardDescription>
                          {user.permissions.length} permission{user.permissions.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {user.permissions.map(permission => {
                        const category = getPermissionCategory(permission)
                        return (
                          <Badge 
                            key={permission} 
                            className={getPermissionCategoryColor(category)}
                            variant="secondary"
                          >
                            {getPermissionLabel(permission)}
                          </Badge>
                        )
                      })}
                    </div>
                    {user.permissions.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No permissions assigned
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 