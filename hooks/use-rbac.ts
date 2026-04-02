import { useState, useEffect, useCallback, useMemo } from 'react'
import { rbacService } from '@/lib/services/rbac.service'
import { useAuth } from '@/contexts/auth-context'
import {
  PERMISSIONS
} from '@/types/rbac'
import type {
  Permission,
  SystemRole,
  UserPermissionContext,
  PermissionChecker,
  DataIsolationContext,
  UserTourAccess,
  TourManagementRole,
  TourManagementPermission
} from '@/types/rbac'

// Hook for checking user permissions
export function usePermissions(tourId?: string) {
  const { user } = useAuth()
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null)
  const [context, setContext] = useState<UserPermissionContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissionChecker(null)
      setContext(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [checker, ctx] = await Promise.all([
        rbacService.createPermissionChecker(user.id, tourId),
        rbacService.getUserPermissionContext(user.id, tourId)
      ])

      setPermissionChecker(checker)
      setContext(ctx)
    } catch (err) {
      console.error('Error loading permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }, [user?.id, tourId])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const hasPermission = useCallback(
    (permission: Permission, specificTourId?: string) => {
      return permissionChecker?.hasPermission(permission, specificTourId) ?? false
    },
    [permissionChecker]
  )

  const hasAnyPermission = useCallback(
    (permissions: Permission[], specificTourId?: string) => {
      return permissionChecker?.hasAnyPermission(permissions, specificTourId) ?? false
    },
    [permissionChecker]
  )

  const hasAllPermissions = useCallback(
    (permissions: Permission[], specificTourId?: string) => {
      return permissionChecker?.hasAllPermissions(permissions, specificTourId) ?? false
    },
    [permissionChecker]
  )

  const hasRole = useCallback(
    (role: SystemRole, specificTourId?: string) => {
      return permissionChecker?.hasRole(role, specificTourId) ?? false
    },
    [permissionChecker]
  )

  const canAccessTour = useCallback(
    (tourId: string) => {
      return permissionChecker?.canAccessTour(tourId) ?? false
    },
    [permissionChecker]
  )

  const refreshPermissions = useCallback(() => {
    rbacService.clearCache()
    loadPermissions()
  }, [loadPermissions])

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    canAccessTour,
    context,
    loading,
    error,
    refreshPermissions
  }
}

// Hook for managing user roles
export function useRoleManagement() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignRole = useCallback(
    async (userId: string, roleName: SystemRole, tourId?: string) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      try {
        setLoading(true)
        setError(null)

        await rbacService.assignRole({
          userId,
          roleName,
          tourId,
          assignedBy: user.id
        })

        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to assign role'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [user?.id]
  )

  const removeRole = useCallback(
    async (userId: string, roleName: SystemRole, tourId?: string) => {
      try {
        setLoading(true)
        setError(null)

        await rbacService.removeRole(userId, roleName, tourId)
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove role'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    assignRole,
    removeRole,
    loading,
    error
  }
}

// Hook for data isolation
export function useDataIsolation() {
  const { user } = useAuth()
  const [context, setContext] = useState<DataIsolationContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContext = useCallback(async () => {
    if (!user?.id) {
      setContext(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const isolationContext = await rbacService.getDataIsolationContext(user.id)
      setContext(isolationContext)
    } catch (err) {
      console.error('Error loading data isolation context:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data isolation context')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadContext()
  }, [loadContext])

  const canAccessTour = useCallback(
    (tourId: string) => {
      return context?.accessibleTours.includes(tourId) ?? false
    },
    [context]
  )

  const getAccessibleTours = useCallback(() => {
    return context?.accessibleTours ?? []
  }, [context])

  const hasGlobalPermission = useCallback(
    (permission: Permission) => {
      return context?.globalPermissions.includes(permission) ?? false
    },
    [context]
  )

  const hasTourPermission = useCallback(
    (permission: Permission, tourId: string) => {
      return context?.tourSpecificPermissions[tourId]?.includes(permission) ?? false
    },
    [context]
  )

  return {
    context,
    canAccessTour,
    getAccessibleTours,
    hasGlobalPermission,
    hasTourPermission,
    loading,
    error,
    refreshContext: loadContext
  }
}

// Hook for tour access
export function useTourAccess(tourId?: string) {
  const { user } = useAuth()
  const [access, setAccess] = useState<UserTourAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAccess = useCallback(async () => {
    if (!user?.id || !tourId) {
      setAccess(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const tourAccess = await rbacService.getUserTourAccess(user.id, tourId)
      setAccess(tourAccess)
    } catch (err) {
      console.error('Error loading tour access:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tour access')
    } finally {
      setLoading(false)
    }
  }, [user?.id, tourId])

  useEffect(() => {
    loadAccess()
  }, [loadAccess])

  const hasAccess = useMemo(() => {
    return access?.accessLevel !== 'none'
  }, [access])

  const canEdit = useMemo(() => {
    return access?.accessLevel === 'edit' || access?.accessLevel === 'manage' || access?.accessLevel === 'admin'
  }, [access])

  const canManage = useMemo(() => {
    return access?.accessLevel === 'manage' || access?.accessLevel === 'admin'
  }, [access])

  const canAdminister = useMemo(() => {
    return access?.accessLevel === 'admin'
  }, [access])

  return {
    access,
    hasAccess,
    canEdit,
    canManage,
    canAdminister,
    loading,
    error,
    refreshAccess: loadAccess
  }
}

// Hook for loading roles and permissions - fetches from the unified /api/admin/rbac/roles API
export function useRolesAndPermissions() {
  const [roles, setRoles] = useState<TourManagementRole[]>([])
  const [permissions, setPermissions] = useState<TourManagementPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [apiRolesRes, permissionsData] = await Promise.allSettled([
        fetch('/api/admin/rbac/roles', { credentials: 'include' }).then(r => r.json()),
        rbacService.getAllPermissions(),
      ])

      if (apiRolesRes.status === 'fulfilled' && apiRolesRes.value?.roles) {
        const mapped = apiRolesRes.value.roles.map((r: any) => ({
          id: r.id,
          name: r.name,
          display_name: r.display_name || r.name,
          description: r.description || '',
          is_system_role: r.is_system_role ?? false,
          permission_count: r.permission_count ?? 0,
          active_users: r.active_users ?? 0,
          category: r.scope_type || 'entity',
          created_at: r.created_at,
          updated_at: r.updated_at,
        }))
        setRoles(mapped)
      } else {
        const fallbackRoles = await rbacService.getAllRoles()
        setRoles(fallbackRoles)
      }

      if (permissionsData.status === 'fulfilled') {
        setPermissions(permissionsData.value)
      }
    } catch (err) {
      console.error('Error loading roles and permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load roles and permissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const getRoleById = useCallback(
    (roleId: string) => {
      return roles.find(r => r.id === roleId)
    },
    [roles]
  )

  const getPermissionById = useCallback(
    (permissionId: string) => {
      return permissions.find(p => p.id === permissionId)
    },
    [permissions]
  )

  const getPermissionsByCategory = useCallback(
    (category: string) => {
      return permissions.filter(p => p.category === category)
    },
    [permissions]
  )

  return {
    roles,
    permissions,
    loading,
    error,
    getRoleById,
    getPermissionById,
    getPermissionsByCategory,
    refreshData: loadData
  }
}

// Hook for checking specific permissions with UI feedback
export function usePermissionGuard(
  requiredPermissions: Permission[],
  tourId?: string
) {
  const { hasAllPermissions, loading, error } = usePermissions(tourId)
  
  const isAllowed = useMemo(() => {
    return hasAllPermissions(requiredPermissions, tourId)
  }, [hasAllPermissions, requiredPermissions, tourId])

  const checkPermission = useCallback(
    (permission: Permission, specificTourId?: string) => {
      return hasAllPermissions([permission], specificTourId)
    },
    [hasAllPermissions]
  )

  return {
    isAllowed,
    checkPermission,
    loading,
    error
  }
}

// Hook for managing role permissions
export function useRolePermissions(roleId?: string) {
  const [permissions, setPermissions] = useState<TourManagementPermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPermissions = useCallback(async () => {
    if (!roleId) {
      setPermissions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const rolePermissions = await rbacService.getRolePermissions(roleId)
      setPermissions(rolePermissions)
    } catch (err) {
      console.error('Error loading role permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load role permissions')
    } finally {
      setLoading(false)
    }
  }, [roleId])

  useEffect(() => {
    loadPermissions()
  }, [loadPermissions])

  const updatePermissions = useCallback(
    async (permissionIds: string[]) => {
      if (!roleId) return false

      try {
        setLoading(true)
        setError(null)

        await rbacService.updateRolePermissions(roleId, permissionIds)
        await loadPermissions() // Reload permissions
        return true
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update permissions'
        setError(errorMessage)
        throw new Error(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [roleId, loadPermissions]
  )

  const hasPermission = useCallback(
    (permissionId: string) => {
      return permissions.some(p => p.id === permissionId)
    },
    [permissions]
  )

  return {
    permissions,
    loading,
    error,
    updatePermissions,
    hasPermission,
    refreshPermissions: loadPermissions
  }
}

// Permission checking utilities
export const PermissionUtils = {
  // Check if user can manage tours
  canManageTours: (checker: PermissionChecker, tourId?: string) => {
    return checker.hasAnyPermission([
      PERMISSIONS.TOURS_CREATE,
      PERMISSIONS.TOURS_EDIT,
      PERMISSIONS.TOURS_DELETE,
      PERMISSIONS.TOURS_MANAGE_STAFF
    ], tourId)
  },

  // Check if user can manage events
  canManageEvents: (checker: PermissionChecker, tourId?: string) => {
    return checker.hasAnyPermission([
      PERMISSIONS.EVENTS_CREATE,
      PERMISSIONS.EVENTS_EDIT,
      PERMISSIONS.EVENTS_DELETE,
      PERMISSIONS.EVENTS_MANAGE_LOGISTICS
    ], tourId)
  },

  // Check if user can manage finances
  canManageFinances: (checker: PermissionChecker, tourId?: string) => {
    return checker.hasAnyPermission([
      PERMISSIONS.FINANCES_VIEW,
      PERMISSIONS.FINANCES_EDIT,
      PERMISSIONS.FINANCES_APPROVE,
      PERMISSIONS.FINANCES_REPORTS
    ], tourId)
  },

  // Check if user can manage staff
  canManageStaff: (checker: PermissionChecker, tourId?: string) => {
    return checker.hasAnyPermission([
      PERMISSIONS.STAFF_VIEW,
      PERMISSIONS.STAFF_INVITE,
      PERMISSIONS.STAFF_MANAGE,
      PERMISSIONS.STAFF_REMOVE
    ], tourId)
  },

  // Check if user is admin
  isAdmin: (checker: PermissionChecker, tourId?: string) => {
    return checker.hasAnyPermission([
      PERMISSIONS.ADMIN_USERS,
      PERMISSIONS.ADMIN_ROLES,
      PERMISSIONS.ADMIN_SETTINGS
    ], tourId)
  }
} 