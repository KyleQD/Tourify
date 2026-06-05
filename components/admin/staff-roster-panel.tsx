"use client"

import { useState, useCallback, useEffect } from "react"
import { Users, Plus, RefreshCw, Edit, Trash2, UserCheck, UserX } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminFilterBar } from "@/app/admin/dashboard/components/admin-filter-bar"
import { toast } from "sonner"

interface StaffMember {
  id: string
  user_id?: string
  full_name?: string
  email?: string
  phone?: string
  role: string
  status: string
  entity_type?: string
  entity_id?: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-slate-500/20 text-slate-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  suspended: 'bg-red-500/20 text-red-400',
}

const ENTITY_LABELS: Record<string, string> = {
  event: 'Event', venue: 'Venue', tour: 'Tour', org: 'Org-wide',
}

export function StaffRosterPanel() {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')

  // Add member dialog
  const [showAdd, setShowAdd] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [addForm, setAddForm] = useState({ user_id: '', full_name: '', email: '', role: 'crew_member', entity_type: 'org', entity_id: '' })
  const [saving, setSaving] = useState(false)
  const [deleteMember, setDeleteMember] = useState<StaffMember | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (entityFilter !== 'all') params.set('entity_type', entityFilter)
      params.set('limit', '50')

      const res = await fetch(`/api/admin/staff?${params}`, { credentials: 'include' })
      if (res.ok) {
        const d = await res.json()
        setMembers(d.data || [])
        setTotal(d.total || 0)
      }
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, entityFilter])

  useEffect(() => { void fetchMembers() }, [fetchMembers])

  async function searchUsers(q: string) {
    if (q.length < 2) { setUserResults([]); return }
    const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
    if (res.ok) { const d = await res.json(); setUserResults(d.users || d.results || []) }
  }

  function selectUser(u: any) {
    setAddForm(p => ({ ...p, user_id: u.id, full_name: u.full_name || u.display_name || u.username || '', email: u.email || '' }))
    setUserSearch(u.full_name || u.username || u.email || '')
    setUserResults([])
  }

  async function addMember() {
    if (!addForm.full_name && !addForm.email) { toast.error('Name or email required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_member', ...addForm }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success('Staff member added')
      setShowAdd(false)
      setAddForm({ user_id: '', full_name: '', email: '', role: 'crew_member', entity_type: 'org', entity_id: '' })
      void fetchMembers()
    } catch (err: any) { toast.error(err.message || 'Failed to add') } finally { setSaving(false) }
  }

  async function toggleStatus(m: StaffMember) {
    const newStatus = m.status === 'active' ? 'inactive' : 'active'
    try {
      await fetch('/api/admin/staff', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', staff_id: m.id, status: newStatus }),
      })
      toast.success(`Status updated to ${newStatus}`)
      void fetchMembers()
    } catch { toast.error('Failed to update status') }
  }

  async function confirmDelete() {
    if (!deleteMember) return
    try {
      await fetch(`/api/admin/staff?id=${deleteMember.id}`, { method: 'DELETE', credentials: 'include' })
      toast.success('Staff member removed')
      setDeleteMember(null)
      void fetchMembers()
    } catch { toast.error('Failed to remove') }
  }

  return (
    <div className="space-y-4">
      <AdminFilterBar
        searchPlaceholder="Search staff by name or email..."
        searchValue={search}
        onSearchChange={setSearch}
        statusOptions={[
          { value: 'all', label: 'All Status' },
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'pending', label: 'Pending' },
        ]}
        statusValue={statusFilter}
        onStatusChange={setStatusFilter}
        actions={
          <div className="flex items-center gap-2">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-9 w-32 bg-slate-800/50 border-slate-700/50 text-white text-sm">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700 text-white">
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="venue">Venues</SelectItem>
                <SelectItem value="tour">Tours</SelectItem>
                <SelectItem value="org">Org-wide</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0 h-9">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Staff
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      ) : members.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-700/50 rounded-sm">
          <CardContent className="text-center py-12">
            <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No staff members found.</p>
            <Button size="sm" onClick={() => setShowAdd(true)} className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add First Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-slate-500 text-xs">{total} staff member{total !== 1 ? 's' : ''}</p>
          <div className="space-y-2">
            {members.map((m) => (
              <Card key={m.id} className="bg-slate-900/60 border-slate-700/50 rounded-sm">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-purple-600/20 text-purple-400 text-xs">
                        {(m.full_name || m.email || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.full_name || '—'}</p>
                      <p className="text-slate-400 text-xs truncate">{m.email || ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 text-xs hidden sm:block capitalize">{m.role}</span>
                    {m.entity_type && m.entity_type !== 'org' && (
                      <Badge className="bg-slate-700/50 text-slate-300 text-xs hidden sm:flex">
                        {ENTITY_LABELS[m.entity_type] || m.entity_type}
                      </Badge>
                    )}
                    <Badge className={STATUS_COLORS[m.status] || 'bg-slate-700 text-slate-300'}>{m.status}</Badge>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                      onClick={() => toggleStatus(m)}
                      title={m.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      {m.status === 'active' ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteMember(m)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Staff Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Search existing user</Label>
              <div className="relative">
                <Input
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); void searchUsers(e.target.value) }}
                  placeholder="Search by name or email..."
                  className="bg-slate-800/50 border-slate-700/50 text-white text-sm"
                />
                {userResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-slate-900 border border-slate-700 rounded-sm mt-1 z-50 max-h-40 overflow-y-auto">
                    {userResults.map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-800 text-sm text-white"
                        onClick={() => selectUser(u)}
                      >
                        {u.full_name || u.display_name || u.username} — {u.email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Full Name *</Label>
                <Input value={addForm.full_name} onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Email</Label>
                <Input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className="bg-slate-800/50 border-slate-700/50 text-white text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Role</Label>
                <Select value={addForm.role} onValueChange={v => setAddForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    {['tour_manager','event_coordinator','crew_chief','crew_member','security','vendor','sound_engineer','stage_manager','production_manager'].map(r => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Scope</Label>
                <Select value={addForm.entity_type} onValueChange={v => setAddForm(p => ({ ...p, entity_type: v }))}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-700/50 text-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="org">Org-wide</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="tour">Tour</SelectItem>
                    <SelectItem value="venue">Venue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} className="border-slate-700 text-slate-300">Cancel</Button>
            <Button onClick={addMember} disabled={saving} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
              {saving ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteMember} onOpenChange={() => setDeleteMember(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">Remove {deleteMember?.full_name || deleteMember?.email} from the roster?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white border-0">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
