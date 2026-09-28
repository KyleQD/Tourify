'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Ticket,
  UserRoundPlus,
  Users,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { EventTicketManager } from '@/components/admin/event-ticket-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  EligibleRecipient,
  EventTicketingWorkspaceDto,
  TicketAllocationSummary,
  TicketInviteSummary,
  UnifiedAttendee,
} from '@/lib/ticketing/guest-list'

type WorkspaceTab = 'overview' | 'sales' | 'attendees' | 'guest-list' | 'staff-crew' | 'admissions' | 'settings'

const statusClass: Record<string, string> = {
  accepted: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  declined: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  expired: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
  revoked: 'border-red-500/30 bg-red-500/10 text-red-300',
  active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  released: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  canceled: 'border-red-500/30 bg-red-500/10 text-red-300',
}

function toLocalDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function apiError(payload: any, fallback: string) {
  return payload?.error || fallback
}

export function EventTicketingWorkspace({ eventId, surface = 'admin' }: { eventId: string; surface?: 'admin' | 'artist' }) {
  const [workspace, setWorkspace] = useState<EventTicketingWorkspaceDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview')
  const [attendees, setAttendees] = useState<UnifiedAttendee[]>([])
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [attendeeSource, setAttendeeSource] = useState('all')
  const [artists, setArtists] = useState<EligibleRecipient[]>([])
  const [staff, setStaff] = useState<EligibleRecipient[]>([])
  const [userResults, setUserResults] = useState<EligibleRecipient[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set())
  const [showPoolDialog, setShowPoolDialog] = useState(false)
  const [inviteAllocation, setInviteAllocation] = useState<TicketAllocationSummary | null>(null)
  const [replaceInvite, setReplaceInvite] = useState<TicketInviteSummary | null>(null)
  const [busy, setBusy] = useState(false)
  const [poolForm, setPoolForm] = useState({
    label: '', managerUserId: '', ticketTypeId: '', quantity: 2,
    purpose: 'artist_guest', releaseAt: toLocalDateTime(),
  })
  const [inviteForm, setInviteForm] = useState({ name: '', email: '' })
  const [staffAllocationId, setStaffAllocationId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const response = await fetch(`/api/ticketing/events/${eventId}/workspace`, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(apiError(payload, 'Could not load ticketing workspace'))
      setWorkspace(null)
    } else {
      setWorkspace(payload.workspace)
      if (payload.workspace.permissions.managerOnly) setActiveTab('guest-list')
    }
    setLoading(false)
  }, [eventId])

  useEffect(() => { void load() }, [load])

  const loadRecipients = useCallback(async (kind: 'artist' | 'staff', setter: (value: EligibleRecipient[]) => void) => {
    const response = await fetch(`/api/ticketing/events/${eventId}/eligible-recipients?kind=${kind}`, { cache: 'no-store' })
    if (response.ok) setter((await response.json()).recipients || [])
  }, [eventId])

  useEffect(() => {
    if (!workspace?.permissions.canManageGuestList) return
    void loadRecipients('artist', setArtists)
    void loadRecipients('staff', setStaff)
  }, [loadRecipients, workspace?.permissions.canManageGuestList])

  useEffect(() => {
    if (!workspace?.permissions.canManageGuestList || userSearch.trim().length < 2) {
      setUserResults([])
      return
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/ticketing/events/${eventId}/eligible-recipients?kind=user&q=${encodeURIComponent(userSearch)}`)
      if (response.ok) setUserResults((await response.json()).recipients || [])
    }, 300)
    return () => window.clearTimeout(timer)
  }, [eventId, userSearch, workspace?.permissions.canManageGuestList])

  useEffect(() => {
    if (activeTab !== 'attendees' || !workspace?.permissions.canViewAttendees) return
    void (async () => {
      const response = await fetch(`/api/ticketing/events/${eventId}/attendees`, { cache: 'no-store' })
      if (response.ok) setAttendees((await response.json()).attendees || [])
    })()
  }, [activeTab, eventId, workspace?.permissions.canViewAttendees])

  const filteredAttendees = useMemo(() => attendees.filter((attendee) => {
    const query = attendeeSearch.trim().toLowerCase()
    const matchesQuery = !query || `${attendee.name} ${attendee.email || ''} ${attendee.ticketTypeName}`.toLowerCase().includes(query)
    return matchesQuery && (attendeeSource === 'all' || attendee.source === attendeeSource)
  }), [attendeeSearch, attendeeSource, attendees])

  const poolOptions = useMemo(() => [...artists, ...userResults].filter((recipient, index, all) => all.findIndex((item) => item.userId === recipient.userId) === index), [artists, userResults])
  const crewPools = workspace?.allocations.filter((allocation) => allocation.status === 'active' && ['staff', 'crew'].includes(allocation.purpose)) || []

  async function createPool() {
    setBusy(true)
    const response = await fetch(`/api/ticketing/events/${eventId}/allocations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...poolForm, releaseAt: new Date(poolForm.releaseAt).toISOString() }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return toast.error(apiError(payload, 'Could not create allocation'))
    toast.success('Allocation created and inventory reserved')
    setShowPoolDialog(false)
    setPoolForm((current) => ({ ...current, label: '', managerUserId: '', quantity: 2 }))
    await load()
  }

  async function sendInvites(allocation: TicketAllocationSummary, recipients: Array<{ userId?: string; email?: string; name?: string; sourceType?: string; sourceId?: string }>) {
    setBusy(true)
    const response = await fetch(`/api/ticketing/events/${eventId}/invites`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allocationId: allocation.id, purpose: allocation.purpose, expiresAt: allocation.releaseAt, recipients }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return toast.error(apiError(payload, 'Could not send invitation'))
    const failed = (payload.invitations || []).filter((item: any) => item.delivery?.email === 'failed')
    if (failed.length) {
      const link = failed[0]?.delivery?.copyLink
      if (link) await navigator.clipboard.writeText(link)
      toast.warning(`Invitation reserved, but ${failed.length} email${failed.length === 1 ? '' : 's'} failed. A copy link is on your clipboard.`)
    } else toast.success(`${recipients.length} invitation${recipients.length === 1 ? '' : 's'} sent`)
    setInviteAllocation(null)
    setInviteForm({ name: '', email: '' })
    setSelectedStaff(new Set())
    await load()
  }

  async function inviteAction(invite: TicketInviteSummary, action: 'resend' | 'revoke') {
    setBusy(true)
    const response = await fetch(`/api/ticketing/events/${eventId}/invites/${invite.id}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return toast.error(apiError(payload, `Could not ${action} invitation`))
    if (action === 'resend' && payload.delivery?.copyLink) await navigator.clipboard.writeText(payload.delivery.copyLink)
    toast.success(action === 'resend' ? 'Fresh invitation link sent and copied' : 'Invitation revoked')
    await load()
  }

  async function submitReplacement() {
    if (!replaceInvite) return
    const allocation = workspace?.allocations.find((item) => item.id === replaceInvite.allocationId)
    if (!allocation) return
    setBusy(true)
    const response = await fetch(`/api/ticketing/events/${eventId}/invites/${replaceInvite.id}/replace`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inviteForm, expiresAt: allocation.releaseAt }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return toast.error(apiError(payload, 'Could not replace invitation'))
    toast.success('Admission replaced and a fresh invitation sent')
    setReplaceInvite(null)
    setInviteForm({ name: '', email: '' })
    await load()
  }

  async function releasePool(allocation: TicketAllocationSummary) {
    if (!window.confirm(`Release the ${allocation.label} pool and return all unused inventory to sale?`)) return
    setBusy(true)
    const response = await fetch(`/api/ticketing/events/${eventId}/allocations`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'release', allocationId: allocation.id }),
    })
    const payload = await response.json().catch(() => ({}))
    setBusy(false)
    if (!response.ok) return toast.error(apiError(payload, 'Could not release allocation'))
    toast.success('Unused inventory returned to sale')
    await load()
  }

  if (loading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-indigo-400" /></div>
  if (!workspace) return <Card className="border-red-500/20 bg-red-500/5"><CardHeader><CardTitle>Ticketing unavailable</CardTitle><CardDescription>{error}</CardDescription></CardHeader></Card>

  const visibleTabs: WorkspaceTab[] = workspace.permissions.managerOnly
    ? ['overview', 'guest-list']
    : ['overview', 'sales', 'attendees', 'guest-list', 'staff-crew', 'admissions', 'settings']
  const tabLabels: Record<WorkspaceTab, string> = {
    overview: 'Overview', sales: 'Sales & Orders', attendees: 'Attendees', 'guest-list': workspace.permissions.managerOnly ? 'My Guest List' : 'Guest List',
    'staff-crew': 'Staff & Crew', admissions: 'Admissions', settings: 'Settings',
  }
  const metricCards: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: 'Paid', value: workspace.metrics.paidAdmissions ?? 'Hidden', icon: Ticket },
    { label: 'Comps', value: workspace.metrics.complimentaryAdmissions, icon: CheckCircle2 },
    { label: 'Pending', value: workspace.metrics.pendingInvites, icon: Mail },
    { label: 'Staff/Crew', value: workspace.metrics.crewAdmissions, icon: ShieldCheck },
    { label: 'Held', value: workspace.metrics.heldCapacity, icon: Users },
    { label: 'Checked in', value: workspace.metrics.checkedIn, icon: ClipboardCheck },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-slate-400">Event ticketing workspace</p><h2 className="text-2xl font-semibold text-white">{workspace.event.title}</h2></div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="space-y-5">
        <TabsList className="h-auto w-full justify-start overflow-x-auto border border-slate-700/50 bg-slate-900/60 p-1">
          {visibleTabs.map((tab) => <TabsTrigger key={tab} value={tab} className="whitespace-nowrap">{tabLabels[tab]}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {metricCards.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="border-slate-700/50 bg-slate-900/60"><CardContent className="flex items-center gap-3 p-4"><Icon className="h-5 w-5 text-indigo-300" /><div><p className="text-xs text-slate-400">{label}</p><p className="text-xl font-semibold text-white">{String(value)}</p></div></CardContent></Card>
            ))}
          </div>
          {workspace.permissions.managerOnly ? <p className="rounded-lg border border-indigo-400/20 bg-indigo-400/10 p-4 text-sm text-indigo-100">You can manage only the pools assigned to you. Sales, attendee contacts, finances, and other guest lists remain private.</p> : null}
        </TabsContent>

        <TabsContent value="sales"><EventTicketManager eventId={eventId} showLegacyOps={false} eventScopedApi={surface === 'artist'} allowRefunds={surface === 'admin'} /></TabsContent>

        <TabsContent value="attendees" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row"><Input value={attendeeSearch} onChange={(event) => setAttendeeSearch(event.target.value)} placeholder="Search attendees" /><Select value={attendeeSource} onValueChange={setAttendeeSource}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="guest">Guest</SelectItem><SelectItem value="artist_guest">Artist guest</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="crew">Crew</SelectItem></SelectContent></Select></div>
          <Card className="border-slate-700/50 bg-slate-900/60"><CardContent className="divide-y divide-slate-800 p-0">{filteredAttendees.length ? filteredAttendees.map((attendee) => <div key={attendee.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium text-white">{attendee.name}</p><p className="text-xs text-slate-400">{attendee.email || attendee.ticketTypeName}</p></div><div className="flex gap-2"><Badge variant="outline">{attendee.source.replace('_', ' ')}</Badge><Badge className={attendee.checkedIn ? statusClass.accepted : statusClass.pending}>{attendee.checkedIn ? 'Checked in' : attendee.status}</Badge></div></div>) : <p className="p-8 text-center text-sm text-slate-400">No attendees match these filters.</p>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="guest-list" className="space-y-4">
          {workspace.permissions.canManageGuestList ? <div className="flex justify-end"><Button onClick={() => { setPoolForm((current) => ({ ...current, ticketTypeId: current.ticketTypeId || workspace.ticketTypes[0]?.id || '', managerUserId: current.managerUserId || artists[0]?.userId || '' })); setShowPoolDialog(true) }} disabled={!workspace.ticketTypes.length}><Plus className="mr-2 h-4 w-4" />Create allocation</Button></div> : null}
          {!workspace.ticketTypes.length && workspace.permissions.canManageGuestList ? <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Create a ticket or hidden credential type in Sales &amp; Orders before reserving guest-list capacity.</p> : null}
          <div className="grid gap-4 xl:grid-cols-2">{workspace.allocations.length ? workspace.allocations.map((allocation) => {
            const allocationInvites = workspace.invites.filter((invite) => invite.allocationId === allocation.id)
            return <Card key={allocation.id} className="border-slate-700/50 bg-slate-900/60"><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-white">{allocation.label}</CardTitle><CardDescription>{allocation.managerName} · {allocation.ticketTypeName}</CardDescription></div><Badge className={statusClass[allocation.status]}>{allocation.status}</Badge></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-lg bg-slate-800/60 p-2"><p className="text-lg font-semibold text-white">{allocation.quantityIssued}</p><p className="text-xs text-slate-400">Accepted</p></div><div className="rounded-lg bg-slate-800/60 p-2"><p className="text-lg font-semibold text-white">{allocation.pendingCount}</p><p className="text-xs text-slate-400">Pending</p></div><div className="rounded-lg bg-slate-800/60 p-2"><p className="text-lg font-semibold text-white">{allocation.remainingCount}</p><p className="text-xs text-slate-400">Available</p></div></div></CardHeader><CardContent className="space-y-3"><p className="text-xs text-slate-400">Unused capacity releases {new Date(allocation.releaseAt).toLocaleString()}</p>{allocation.status === 'active' ? <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => setInviteAllocation(allocation)} disabled={!allocation.remainingCount}><UserRoundPlus className="mr-2 h-4 w-4" />Invite guest</Button>{workspace.permissions.canManageGuestList ? <Button size="sm" variant="outline" onClick={() => void releasePool(allocation)}>Release pool</Button> : null}</div> : null}<div className="divide-y divide-slate-800">{allocationInvites.map((invite) => <div key={invite.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{invite.recipientName || invite.recipientEmail || 'Invited user'}</p><p className="truncate text-xs text-slate-400">{invite.recipientEmail}</p></div><div className="flex items-center gap-1"><Badge className={statusClass[invite.status]}>{invite.status}</Badge>{invite.status === 'pending' ? <Button size="icon" variant="ghost" aria-label="Resend invitation" onClick={() => void inviteAction(invite, 'resend')}><RotateCcw className="h-4 w-4" /></Button> : null}{['pending', 'accepted'].includes(invite.status) ? <><Button size="icon" variant="ghost" aria-label="Replace admission" onClick={() => { setInviteForm({ name: '', email: '' }); setReplaceInvite(invite) }}><Copy className="h-4 w-4" /></Button><Button size="icon" variant="ghost" aria-label="Revoke admission" onClick={() => void inviteAction(invite, 'revoke')}><XCircle className="h-4 w-4 text-red-300" /></Button></> : null}</div></div>)}</div></CardContent></Card>
          }) : <Card className="border-dashed border-slate-700 bg-slate-900/30 xl:col-span-2"><CardContent className="p-10 text-center"><Users className="mx-auto mb-3 h-8 w-8 text-slate-500" /><p className="font-medium text-white">No guest-list allocations yet</p><p className="text-sm text-slate-400">Reserve a pool for a booked artist, staff lead, or any Tourify user.</p></CardContent></Card>}</div>
        </TabsContent>

        <TabsContent value="staff-crew" className="space-y-4">
          <Card className="border-slate-700/50 bg-slate-900/60"><CardHeader><CardTitle className="text-white">Roster-assisted credentials</CardTitle><CardDescription>Only confirmed and active event assignments are eligible. Every worker accepts their own invitation.</CardDescription></CardHeader><CardContent className="space-y-4"><Select value={staffAllocationId} onValueChange={setStaffAllocationId}><SelectTrigger><SelectValue placeholder="Choose Staff/Crew allocation" /></SelectTrigger><SelectContent>{crewPools.map((pool) => <SelectItem key={pool.id} value={pool.id}>{pool.label} · {pool.remainingCount} available</SelectItem>)}</SelectContent></Select><div className="divide-y divide-slate-800 rounded-lg border border-slate-800">{staff.map((person) => <label key={person.userId} className="flex cursor-pointer items-center gap-3 p-3"><Checkbox checked={selectedStaff.has(person.userId)} onCheckedChange={(checked) => setSelectedStaff((current) => { const next = new Set(current); checked ? next.add(person.userId) : next.delete(person.userId); return next })} /><div><p className="text-sm font-medium text-white">{person.name}</p><p className="text-xs text-slate-400">{person.roleLabel}</p></div></label>)}</div><Button disabled={!staffAllocationId || !selectedStaff.size || busy} onClick={() => { const allocation = crewPools.find((pool) => pool.id === staffAllocationId); if (allocation) void sendInvites(allocation, staff.filter((person) => selectedStaff.has(person.userId)).map((person) => ({ userId: person.userId, name: person.name, sourceType: 'employment_assignment', sourceId: person.sourceId || undefined }))) }}><Mail className="mr-2 h-4 w-4" />Issue {selectedStaff.size || ''} invitation{selectedStaff.size === 1 ? '' : 's'}</Button></CardContent></Card>
        </TabsContent>

        <TabsContent value="admissions"><Card className="border-slate-700/50 bg-slate-900/60"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="h-5 w-5" />Door operations</CardTitle><CardDescription>Accepted guests and crew use the same QR scanner, duplicate-scan protection, and check-in history as paid tickets.</CardDescription></CardHeader><CardContent><Button asChild><Link href={`/admin/dashboard/events/${eventId}/check-in`}>Open scanner</Link></Button></CardContent></Card></TabsContent>
        <TabsContent value="settings"><Card className="border-slate-700/50 bg-slate-900/60"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><Settings className="h-5 w-5" />Admission settings</CardTitle><CardDescription>Ticketing ownership, notifications, transfer rules, and default release cutoffs remain event scoped.</CardDescription></CardHeader><CardContent className="text-sm text-slate-300">Guest-list and staff tickets are non-transferable. Managers may replace them before check-in; checked-in admissions require a door override.</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={showPoolDialog} onOpenChange={setShowPoolDialog}><DialogContent className="border-slate-700 bg-slate-950 text-white"><DialogHeader><DialogTitle>Create guest-list allocation</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Label</Label><Input value={poolForm.label} onChange={(event) => setPoolForm((current) => ({ ...current, label: event.target.value }))} placeholder="Artist guest list" /></div><div><Label>Manager</Label><Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search any Tourify user" className="mb-2" /><Select value={poolForm.managerUserId} onValueChange={(value) => setPoolForm((current) => ({ ...current, managerUserId: value }))}><SelectTrigger><SelectValue placeholder="Select booked artist or user" /></SelectTrigger><SelectContent>{poolOptions.map((person) => <SelectItem key={person.userId} value={person.userId}>{person.name}{person.roleLabel ? ` · ${person.roleLabel}` : ''}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Credential type</Label><Select value={poolForm.ticketTypeId} onValueChange={(value) => setPoolForm((current) => ({ ...current, ticketTypeId: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{workspace.ticketTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name} · {Math.max(type.available - type.sold - type.reserved, 0)} available</SelectItem>)}</SelectContent></Select></div><div><Label>Purpose</Label><Select value={poolForm.purpose} onValueChange={(value) => setPoolForm((current) => ({ ...current, purpose: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="guest">Guest</SelectItem><SelectItem value="artist_guest">Artist guest</SelectItem><SelectItem value="staff">Staff</SelectItem><SelectItem value="crew">Crew</SelectItem></SelectContent></Select></div></div><div className="grid gap-4 sm:grid-cols-2"><div><Label>Spots</Label><Input type="number" min={1} value={poolForm.quantity} onChange={(event) => setPoolForm((current) => ({ ...current, quantity: Number(event.target.value) }))} /></div><div><Label>Release cutoff</Label><Input type="datetime-local" value={poolForm.releaseAt} onChange={(event) => setPoolForm((current) => ({ ...current, releaseAt: event.target.value }))} /></div></div></div><DialogFooter><Button variant="outline" onClick={() => setShowPoolDialog(false)}>Cancel</Button><Button onClick={() => void createPool()} disabled={busy || !poolForm.label || !poolForm.managerUserId || !poolForm.ticketTypeId}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Reserve allocation</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(inviteAllocation)} onOpenChange={(open) => !open && setInviteAllocation(null)}><DialogContent className="border-slate-700 bg-slate-950 text-white"><DialogHeader><DialogTitle>Invite to {inviteAllocation?.label}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Name</Label><Input value={inviteForm.name} onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))} /></div><div><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} placeholder="guest@example.com" /></div><p className="text-xs text-slate-400">Existing users receive in-app and email invitations. New users receive a signup link that returns here.</p></div><DialogFooter><Button variant="outline" onClick={() => setInviteAllocation(null)}>Cancel</Button><Button disabled={busy || !inviteForm.email} onClick={() => inviteAllocation && void sendInvites(inviteAllocation, [{ email: inviteForm.email, name: inviteForm.name }])}>Send invitation</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(replaceInvite)} onOpenChange={(open) => !open && setReplaceInvite(null)}><DialogContent className="border-slate-700 bg-slate-950 text-white"><DialogHeader><DialogTitle>Replace admission</DialogTitle></DialogHeader><p className="text-sm text-slate-300">The current admission will be revoked. If it was accepted, its QR credential becomes invalid and the spot returns to this pool.</p><div className="space-y-4"><div><Label>Replacement name</Label><Input value={inviteForm.name} onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))} /></div><div><Label>Replacement email</Label><Input type="email" value={inviteForm.email} onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setReplaceInvite(null)}>Cancel</Button><Button disabled={busy || !inviteForm.email} onClick={() => void submitReplacement()}>Replace and invite</Button></DialogFooter></DialogContent></Dialog>
    </div>
  )
}
