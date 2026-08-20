"use client"

import { useCallback, useEffect, useState } from 'react'
import { Check, MailPlus, Pause, RefreshCw, UserRoundCheck, UserRoundX, X } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActingContext } from '@/hooks/use-acting-context'

interface Application {
  id: string
  user_id: string
  source: 'application' | 'invite'
  status: string
  application_message: string | null
  review_note: string | null
  created_at: string
}

interface Membership {
  id: string
  user_id: string
  status: string
  approved_at: string
  suspended_at: string | null
  revoked_at: string | null
}

function shortId(value: string) {
  return `${value.slice(0, 8)}…`
}

export function EventPromoterMembershipPanel({ eventId }: { eventId: string }) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [applications, setApplications] = useState<Application[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteMessage, setInviteMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!isActingReady) return
    setLoading(true)
    try {
      const [applicationResponse, membershipResponse] = await Promise.all([
        fetch(`/api/admin/events/${eventId}/promoter-applications`, { credentials: 'include', headers: actingHeaders }),
        fetch(`/api/admin/events/${eventId}/promoters`, { credentials: 'include', headers: actingHeaders }),
      ])
      if (applicationResponse.status === 404 || membershipResponse.status === 404) return
      if (!applicationResponse.ok || !membershipResponse.ok) throw new Error('Unable to load promoter membership data.')
      setApplications((await applicationResponse.json()).data || [])
      setMemberships((await membershipResponse.json()).data || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load promoter membership data.')
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, eventId, isActingReady])

  useEffect(() => { void load() }, [load])

  async function call(path: string, body?: Record<string, unknown>) {
    setBusy(true)
    try {
      const response = await fetch(path, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error?.message || 'Unable to update promoter membership.')
      await load()
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update promoter membership.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function invite() {
    if (!inviteUserId.trim()) return toast.error('Enter the invited Tourify user ID.')
    if (await call(`/api/admin/events/${eventId}/promoters/invite`, { user_id: inviteUserId.trim(), message: inviteMessage.trim() || null })) {
      setInviteUserId('')
      setInviteMessage('')
      toast.success('Promoter invitation sent.')
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
    <Card className="border-slate-800 bg-slate-950/50">
      <CardHeader className="flex-row items-start justify-between gap-4"><div><CardTitle className="text-slate-100">Applications</CardTitle><CardDescription>Review each applicant before granting promoter assets.</CardDescription></div><Button variant="ghost" size="icon" disabled={loading || busy} onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button></CardHeader>
      <CardContent className="space-y-3">
        {loading ? <p className="text-sm text-slate-400">Loading applications…</p> : null}
        {!loading && applications.length === 0 ? <p className="rounded-lg border border-dashed border-slate-800 p-5 text-sm text-slate-400">No promoter applications yet.</p> : null}
        {applications.map((application) => <div key={application.id} className="rounded-xl border border-slate-800 bg-slate-900/35 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium text-slate-100">Promoter {shortId(application.user_id)}</p><p className="text-xs text-slate-400">{application.source} · {new Date(application.created_at).toLocaleString()}</p></div><Badge className="border-slate-600 bg-slate-700/50 text-slate-200">{application.status}</Badge></div>{application.application_message ? <p className="mt-3 text-sm text-slate-300">{application.application_message}</p> : null}{application.status === 'applied' || application.status === 'invited' ? <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" className="bg-emerald-600 hover:bg-emerald-500" disabled={busy} onClick={async () => { if (await call(`/api/admin/events/${eventId}/promoter-applications/${application.id}/approve`, {})) toast.success('Promoter approved.') }}><Check className="mr-1.5 h-3.5 w-3.5" />Approve</Button><Button size="sm" variant="outline" className="border-red-400/30 text-red-200 hover:bg-red-500/10" disabled={busy} onClick={async () => { if (await call(`/api/admin/events/${eventId}/promoter-applications/${application.id}/reject`, {})) toast.success('Application rejected.') }}><X className="mr-1.5 h-3.5 w-3.5" />Reject</Button></div> : null}</div>)}
      </CardContent>
    </Card>

    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="flex items-center gap-2 text-slate-100"><MailPlus className="h-4 w-4 text-cyan-300" />Invite a promoter</CardTitle><CardDescription>Invite an existing Tourify user. They must accept before receiving promoter access.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="space-y-2"><Label>Tourify user ID</Label><Input value={inviteUserId} onChange={(event) => setInviteUserId(event.target.value)} placeholder="User UUID" /></div><div className="space-y-2"><Label>Invitation note (optional)</Label><Textarea value={inviteMessage} onChange={(event) => setInviteMessage(event.target.value)} placeholder="Why this event is a good fit…" /></div><Button disabled={busy} onClick={() => void invite()}><MailPlus className="mr-2 h-4 w-4" />Send invitation</Button></CardContent></Card>
      <Card className="border-slate-800 bg-slate-950/50"><CardHeader><CardTitle className="text-slate-100">Promoter roster</CardTitle><CardDescription>Suspended and revoked members cannot receive or use promoter assets.</CardDescription></CardHeader><CardContent className="space-y-3">{loading ? <p className="text-sm text-slate-400">Loading roster…</p> : null}{!loading && memberships.length === 0 ? <p className="text-sm text-slate-400">No approved promoters yet.</p> : null}{memberships.map((member) => <div key={member.id} className="rounded-lg border border-slate-800 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-medium text-slate-100">Promoter {shortId(member.user_id)}</p><p className="text-xs text-slate-400">Approved {new Date(member.approved_at).toLocaleDateString()}</p></div><Badge className="border-slate-600 bg-slate-700/50 text-slate-200">{member.status}</Badge></div>{member.status === 'approved' ? <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => void call(`/api/admin/events/${eventId}/promoters/${member.id}/suspend`)}><Pause className="mr-1.5 h-3.5 w-3.5" />Suspend</Button><Button size="sm" variant="outline" className="border-red-400/30 text-red-200 hover:bg-red-500/10" disabled={busy} onClick={() => void call(`/api/admin/events/${eventId}/promoters/${member.id}/revoke`)}><UserRoundX className="mr-1.5 h-3.5 w-3.5" />Revoke</Button></div> : member.status === 'suspended' ? <div className="mt-3"><Button size="sm" variant="outline" className="border-red-400/30 text-red-200 hover:bg-red-500/10" disabled={busy} onClick={() => void call(`/api/admin/events/${eventId}/promoters/${member.id}/revoke`)}><UserRoundX className="mr-1.5 h-3.5 w-3.5" />Revoke</Button></div> : null}</div>)}</CardContent></Card>
    </div>
  </div>
}
