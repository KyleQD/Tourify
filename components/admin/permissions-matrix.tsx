"use client"

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, CheckCircle, Circle, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface Role {
  id: string
  name: string
  display_name?: string
  permission_count?: number
}

interface Capability {
  id: string
  name: string
  display_name?: string
  category?: string
}

interface RolePermission {
  role_id: string
  permission_id: string
}

export function PermissionsMatrix() {
  const [roles, setRoles] = useState<Role[]>([])
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [rolePerms, setRolePerms] = useState<RolePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, Set<string>>>({}) // roleId -> Set of capabilityIds to ADD
  const [pendingRemovals, setPendingRemovals] = useState<Record<string, Set<string>>>({}) // roleId -> Set of capabilityIds to REMOVE

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesRes, capsRes] = await Promise.allSettled([
        fetch('/api/admin/rbac/roles', { credentials: 'include' }),
        fetch('/api/admin/capabilities', { credentials: 'include' }),
      ])

      let roleList: Role[] = []
      let capList: Capability[] = []
      const rpList: RolePermission[] = []

      if (rolesRes.status === 'fulfilled' && rolesRes.value.ok) {
        const d = await rolesRes.value.json()
        roleList = d.roles || []
        setRoles(roleList)
      }

      if (capsRes.status === 'fulfilled' && capsRes.value.ok) {
        const d = await capsRes.value.json()
        capList = d.capabilities || d.permissions || []
        setCapabilities(capList)
      }

      // Load role-permission associations for all roles
      if (roleList.length > 0) {
        // Try to load rbac_role_permissions from the RBAC API or embedded in roles
        for (const role of roleList) {
          const perms = (role as any).permissions || []
          for (const p of perms) {
            rpList.push({ role_id: role.id, permission_id: typeof p === 'string' ? p : p.id })
          }
        }
      }

      setRolePerms(rpList)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchData() }, [fetchData])

  function hasPermission(roleId: string, capId: string): boolean {
    const added = pendingChanges[roleId]?.has(capId) ?? false
    const removed = pendingRemovals[roleId]?.has(capId) ?? false
    if (added) return true
    if (removed) return false
    return rolePerms.some(rp => rp.role_id === roleId && rp.permission_id === capId)
  }

  function togglePermission(roleId: string, capId: string) {
    const current = hasPermission(roleId, capId)
    if (current) {
      // Remove
      setPendingChanges(prev => {
        const s = new Set(prev[roleId] || [])
        s.delete(capId)
        return { ...prev, [roleId]: s }
      })
      setPendingRemovals(prev => {
        const s = new Set(prev[roleId] || [])
        s.add(capId)
        return { ...prev, [roleId]: s }
      })
    } else {
      // Add
      setPendingRemovals(prev => {
        const s = new Set(prev[roleId] || [])
        s.delete(capId)
        return { ...prev, [roleId]: s }
      })
      setPendingChanges(prev => {
        const s = new Set(prev[roleId] || [])
        s.add(capId)
        return { ...prev, [roleId]: s }
      })
    }
  }

  async function saveRole(role: Role) {
    setSaving(role.id)
    try {
      // Build the full permission list for this role
      const currentPerms = rolePerms.filter(rp => rp.role_id === role.id).map(rp => rp.permission_id)
      const toAdd = [...(pendingChanges[role.id] || [])]
      const toRemove = new Set(pendingRemovals[role.id] || [])
      const finalPerms = [...new Set([...currentPerms.filter(p => !toRemove.has(p)), ...toAdd])]

      const res = await fetch(`/api/admin/rbac/roles/${role.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: finalPerms }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`Permissions saved for ${role.display_name || role.name}`)

      // Commit changes to local state
      setRolePerms(prev => {
        const filtered = prev.filter(rp => rp.role_id !== role.id)
        const newPerms = finalPerms.map(pid => ({ role_id: role.id, permission_id: pid }))
        return [...filtered, ...newPerms]
      })
      setPendingChanges(prev => { const n = { ...prev }; delete n[role.id]; return n })
      setPendingRemovals(prev => { const n = { ...prev }; delete n[role.id]; return n })
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const hasPendingChanges = (roleId: string) =>
    (pendingChanges[roleId]?.size || 0) > 0 || (pendingRemovals[roleId]?.size || 0) > 0

  // Group capabilities by category
  const byCategory: Record<string, Capability[]> = {}
  for (const cap of capabilities) {
    const cat = cap.category || 'General'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push(cap)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
      </div>
    )
  }

  if (roles.length === 0 || capabilities.length === 0) {
    return (
      <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
        <CardContent className="p-6 text-center">
          <p className="text-slate-400">
            {roles.length === 0 ? 'No roles defined yet. Create roles in the Roles tab first.' : 'No capabilities found. The capabilities API may not be configured.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">{roles.length} roles × {capabilities.length} capabilities</p>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-slate-700 text-slate-300 h-8">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left p-3 text-slate-400 font-medium text-xs uppercase tracking-wider min-w-[200px]">Capability</th>
              {roles.map(role => (
                <th key={role.id} className="p-3 text-center min-w-[100px]">
                  <div className="space-y-1">
                    <p className="text-white text-xs font-medium">{role.display_name || role.name}</p>
                    {hasPendingChanges(role.id) && (
                      <Button
                        size="sm"
                        onClick={() => saveRole(role)}
                        disabled={saving === role.id}
                        className="h-6 text-xs px-2 bg-purple-600/80 hover:bg-purple-600 text-white border-0"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {saving === role.id ? '...' : 'Save'}
                      </Button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(byCategory).map(([category, caps]) => (
              <>
                <tr key={`cat-${category}`} className="bg-slate-800/20">
                  <td colSpan={roles.length + 1} className="px-3 py-2 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                    {category}
                  </td>
                </tr>
                {caps.map(cap => (
                  <tr key={cap.id} className="border-b border-slate-800/30 hover:bg-slate-800/10 transition-colors">
                    <td className="p-3 text-slate-300 text-xs">
                      {cap.display_name || cap.name}
                    </td>
                    {roles.map(role => {
                      const active = hasPermission(role.id, cap.id)
                      const changed = (pendingChanges[role.id]?.has(cap.id) || pendingRemovals[role.id]?.has(cap.id)) ?? false
                      return (
                        <td key={role.id} className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(role.id, cap.id)}
                            className={`inline-flex items-center justify-center h-5 w-5 rounded transition-all ${
                              active
                                ? changed
                                  ? 'text-green-300'
                                  : 'text-green-400'
                                : changed
                                  ? 'text-red-400'
                                  : 'text-slate-600 hover:text-slate-400'
                            }`}
                            aria-label={`${active ? 'Remove' : 'Add'} ${cap.name} for ${role.name}`}
                          >
                            {active ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </button>
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

      <p className="text-slate-500 text-xs">Click a cell to toggle. Changed cells are highlighted. Click "Save" on a role column to persist.</p>
    </div>
  )
}
