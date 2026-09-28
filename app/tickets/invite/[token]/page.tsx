'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, CheckCircle2, Clock3, Loader2, Ticket, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type InvitationPreview = {
  event: { title: string; start_at: string | null; timezone: string }
  ticketType: string
  inviterName: string
  recipientName: string | null
  recipientEmailHint: string | null
  purpose: string
  status: string
  expiresAt: string
}

export default function TicketInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<'accept' | 'decline' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/ticketing/invites/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || 'Invitation not found')
        if (active) setInvitation(payload.invitation)
      })
      .catch((nextError) => active && setError(nextError instanceof Error ? nextError.message : 'Invitation not found'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [token])

  async function respond(action: 'accept' | 'decline') {
    setSubmitting(action)
    setError(null)
    const response = await fetch(`/api/ticketing/invites/${encodeURIComponent(token)}/${action}`, { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 401) {
      const returnPath = `/tickets/invite/${encodeURIComponent(token)}`
      router.push(`/signup?redirectTo=${encodeURIComponent(returnPath)}`)
      return
    }
    if (!response.ok) {
      setError(payload.error || `Could not ${action} this invitation`)
      setSubmitting(null)
      return
    }
    if (action === 'accept') {
      setAccepted(true)
      setInvitation((current) => current ? { ...current, status: 'accepted' } : current)
    } else {
      setInvitation((current) => current ? { ...current, status: 'declined' } : current)
    }
    setSubmitting(null)
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="h-8 w-8 animate-spin" /></main>
  }

  if (!invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <Card className="w-full max-w-lg border-white/10 bg-white/5 text-white">
          <CardHeader><CardTitle>Invitation unavailable</CardTitle><CardDescription className="text-slate-300">{error || 'This invitation could not be found.'}</CardDescription></CardHeader>
        </Card>
      </main>
    )
  }

  const eventDate = invitation.event.start_at
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short', timeZone: invitation.event.timezone }).format(new Date(invitation.event.start_at))
    : 'Date to be announced'
  const pending = invitation.status === 'pending'

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-indigo-950 px-4 py-12 text-white">
      <Card className="mx-auto w-full max-w-xl border-white/10 bg-white/[0.06] text-white shadow-2xl backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300"><Ticket className="h-6 w-6" /></div>
          <div>
            <CardTitle className="text-2xl">{invitation.event.title}</CardTitle>
            <CardDescription className="mt-2 text-slate-300">{invitation.inviterName} reserved a {invitation.ticketType} for you.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
            <div className="flex gap-3"><CalendarDays className="h-4 w-4 text-indigo-300" /><span>{eventDate}</span></div>
            <div className="flex gap-3"><UserRound className="h-4 w-4 text-indigo-300" /><span>{invitation.recipientName || invitation.recipientEmailHint || 'Invited guest'}</span></div>
            <div className="flex gap-3"><Clock3 className="h-4 w-4 text-indigo-300" /><span>Accept by {new Date(invitation.expiresAt).toLocaleString()}</span></div>
          </div>

          {accepted ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <div className="flex items-center gap-2 font-medium text-emerald-200"><CheckCircle2 className="h-5 w-5" />Ticket added to your wallet</div>
              <p className="mt-2 text-sm text-emerald-100/80">Your QR credential is ready for check-in.</p>
              <Button className="mt-4" onClick={() => router.push('/tickets/my-tickets')}>Open ticket wallet</Button>
            </div>
          ) : pending ? (
            <>
              <p className="text-sm text-slate-300">A distinct Tourify account is required. Your ticket and QR code are created only after you accept.</p>
              {error ? <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" className="border-white/20 bg-transparent" disabled={Boolean(submitting)} onClick={() => void respond('decline')}>
                  {submitting === 'decline' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Decline
                </Button>
                <Button disabled={Boolean(submitting)} onClick={() => void respond('accept')}>
                  {submitting === 'accept' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Accept invitation
                </Button>
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-slate-300">This invitation is {invitation.status}.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

