'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  Calendar,
  Edit,
  FileText,
  MessageSquare,
  Plus,
  Settings,
  Shield,
  DollarSign,
  Trash2,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import type { VenuePermission } from '@/types/database.types'

/**
 * VEN-125 — RoleManagement rewritten against the canonical entity-RBAC APIs.
 *
 * - Roles come from /api/venue/roles (rbac_roles projection): system roles are
 *   immutable; venue-owned custom roles support real Edit (PATCH) and Delete.
 * - Permissions come from /api/venue/permissions (rbac_permissions projection).
 * - Toggles submit a permission-name → boolean map; Edit prefills the role's
 *   current permission set instead of silently dropping it (previous behavior).
 */

interface RoleDto {
  id: string
  key: string
  label: string
  description: string | null
  is_system_role: boolean
  is_active: boolean
  owner_entity_type: string | null
  owner_entity_id: string | null
  source: 'rbac_roles'
  permissions?: string[]
}

interface RoleManagementProps {
  venueId: string
}

interface RoleFormState {
  label: string
  description: string
  permissions: Record<string, boolean>
}

const EMPTY_FORM: RoleFormState = { label: '', description: '', permissions: {} }

function slugifyKey(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'role'
  )
}

export function RoleManagement({ venueId }: RoleManagementProps) {
  const [roles, setRoles] = useState<RoleDto[]>([])
  const [permissions, setPermissions] = useState<VenuePermission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleDto | null>(null)
  const [formData, setFormData] = useState<RoleFormState>(EMPTY_FORM)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // UI categories (projected by /api/venue/permissions from canonical categories)
  const permissionCategories = [
    { key: 'bookings', label: 'Bookings', icon: Calendar },
    { key: 'events', label: 'Events', icon: Calendar },
    { key: 'staff', label: 'Staff', icon: Users },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'payroll', label: 'Finance', icon: DollarSign },
    { key: 'settings', label: 'Settings', icon: Settings },
    { key: 'communications', label: 'Communications', icon: MessageSquare },
    { key: 'admin', label: 'Administration', icon: Shield },
  ]

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [rolesRes, permsRes] = await Promise.all([
          fetch(`/api/venue/roles?venueId=${encodeURIComponent(venueId)}`),
          fetch('/api/venue/permissions'),
        ])
        if (!rolesRes.ok || !permsRes.ok) throw new Error('Failed to load roles or permissions')
        const rolesData = await rolesRes.json()
        const permsData = await permsRes.json()
        if (cancelled) return
        setRoles(rolesData.roles || [])
        setPermissions(permsData.permissions || [])
      } catch (err) {
        console.error('Error loading roles/permissions:', err)
        if (!cancelled) {
          setError('Roles could not be loaded right now.')
          toast({
            title: 'Error',
            description: 'Failed to fetch roles and permissions',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [venueId, toast])

  const openCreate = () => {
    setEditingRole(null)
    setFormData(EMPTY_FORM)
    setIsDialogOpen(true)
  }

  const openEdit = (role: RoleDto) => {
    if (role.is_system_role) return
    setEditingRole(role)
    const permMap: Record<string, boolean> = {}
    for (const name of role.permissions ?? []) permMap[name] = true
    setFormData({
      label: role.label,
      description: role.description ?? '',
      permissions: permMap,
    })
    setIsDialogOpen(true)
  }

  const handleTogglePermission = (permissionName: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permissionName]: !prev.permissions[permissionName],
      },
    }))
  }

  const handleSubmit = async () => {
    if (!formData.label.trim()) {
      toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      if (editingRole) {
        // Real update via PATCH (VEN-125: Edit must actually edit).
        const response = await fetch(`/api/venue/roles/${editingRole.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: formData.label.trim(),
            description: formData.description.trim() || undefined,
            permissions: formData.permissions,
          }),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to update role' }))
          throw new Error(data.error || 'Failed to update role')
        }
        const data = await response.json()
        setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? { ...r, ...data.role } : r)))
        toast({ title: 'Success', description: 'Role updated successfully' })
      } else {
        const response = await fetch('/api/venue/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venue_id: venueId,
            key: slugifyKey(formData.label),
            label: formData.label.trim(),
            permissions: formData.permissions,
          }),
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: 'Failed to create role' }))
          throw new Error(data.error || 'Failed to create role')
        }
        const data = await response.json()
        setRoles((prev) => [...prev, data.role])
        toast({ title: 'Success', description: 'Role created successfully' })
      }
      setIsDialogOpen(false)
      setEditingRole(null)
      setFormData(EMPTY_FORM)
    } catch (error) {
      console.error('Error saving role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save role',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async (role: RoleDto) => {
    if (role.is_system_role) return
    if (!confirm(`Delete the "${role.label}" role? This cannot be undone.`)) return

    try {
      const response = await fetch(`/api/venue/roles/${role.id}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to delete role' }))
        throw new Error(data.error || 'Failed to delete role')
      }
      setRoles((prev) => prev.filter((r) => r.id !== role.id))
      toast({ title: 'Success', description: 'Role deleted' })
    } catch (error) {
      console.error('Error deleting role:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete role',
        variant: 'destructive',
      })
    }
  }

  const getPermissionsByCategory = (category: string) =>
    permissions.filter((p) => p.permission_category === category)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>Loading roles…</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (error && roles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
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
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? `Edit ${editingRole.label}` : 'Create New Role'}</DialogTitle>
              <DialogDescription>
                Define a role with specific permissions for your venue staff
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="role-label">Role Name</Label>
                <Input
                  id="role-label"
                  value={formData.label}
                  onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
                  placeholder="e.g., Head of Door"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role-description">Description</Label>
                <Textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the responsibilities and scope of this role…"
                  rows={3}
                />
              </div>

              {/* Permissions Selection */}
              <div className="space-y-4">
                <Label>Permissions</Label>
                <Tabs defaultValue={permissionCategories[0]?.key} className="w-full">
                  <TabsList className="flex flex-wrap h-auto gap-1">
                    {permissionCategories.map((category) => (
                      <TabsTrigger key={category.key} value={category.key}>
                        <category.icon className="mr-2 h-4 w-4" />
                        {category.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {permissionCategories.map((category) => (
                    <TabsContent key={category.key} value={category.key} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3">
                        {getPermissionsByCategory(category.key).length === 0 ? (
                          <p className="text-sm text-muted-foreground p-3 border rounded-lg">
                            No permissions in this category yet.
                          </p>
                        ) : (
                          getPermissionsByCategory(category.key).map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center space-x-3 p-3 border rounded-lg"
                            >
                              <Checkbox
                                id={`perm-${permission.id}`}
                                checked={Boolean(formData.permissions[permission.permission_name])}
                                onCheckedChange={() => handleTogglePermission(permission.permission_name)}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`perm-${permission.id}`} className="font-medium capitalize">
                                  {permission.permission_name.replace(/[_.]/g, ' ')}
                                </Label>
                                {permission.permission_description && (
                                  <p className="text-sm text-muted-foreground">
                                    {permission.permission_description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSaving || !formData.label.trim()}>
                  {isSaving ? 'Saving…' : editingRole ? 'Update Role' : 'Create Role'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <Card key={role.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{role.label}</CardTitle>
                  <CardDescription className="mt-1 line-clamp-2">
                    {role.description || 'No description provided'}
                  </CardDescription>
                </div>
                <Badge variant={role.is_system_role ? 'secondary' : 'outline'}>
                  {role.is_system_role ? 'System' : 'Custom'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {(role.permissions?.length ?? 0)} permission
                  {(role.permissions?.length ?? 0) === 1 ? '' : 's'}
                </span>
                {!role.is_system_role && (
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(role)} aria-label={`Edit ${role.label}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRole(role)}
                      aria-label={`Delete ${role.label}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Roles Available</h3>
            <p className="text-muted-foreground text-center mb-4">
              Default venue roles appear here once the RBAC catalog is provisioned, or you can
              create your first custom role.
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Role
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
