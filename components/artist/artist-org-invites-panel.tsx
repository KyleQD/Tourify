'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ExternalLink, Loader2, Users, XCircle } from 'lucide-react'
import Link from 'next/link'
import { getArtistPublicProfilePath, getOrganizationPublicProfilePath } from '@/lib/utils/public-profile-routes'

interface PendingMembership {
  id: string
  role: string
  status: string
  organizer_accounts?: {
    id: string
    organization_name?: string
    url_slug?: string
    subtype?: string
  } | null
}

export function ArtistOrgInvitesPanel({ className }: { className?: string }) {
  const [items, setItems] = useState<PendingMembership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [acceptedBand, setAcceptedBand] = useState<{ name: string; href: string | null } | null>(null)

  async function load() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/organization/artist-members?mine=1', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setItems((data.members || []).filter((row: PendingMembership) => row.status === 'pending'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function respond(item: PendingMembership, status: 'accepted' | 'declined') {
    const membershipId = item.id
    setBusyId(membershipId)
    try {
      const res = await fetch('/api/organization/artist-members', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId, status }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to update invite')
        return
      }
      const org = item.organizer_accounts
      const href =
        org?.subtype === 'band'
          ? getArtistPublicProfilePath(org?.url_slug)
          : getOrganizationPublicProfilePath(org?.url_slug)
      if (status === 'accepted' && org?.subtype === 'band') {
        setAcceptedBand({ name: org.organization_name || 'Band', href })
      }
      toast.success(
        status === 'accepted'
          ? org?.subtype === 'band'
            ? 'Joined band roster'
            : 'Joined organization roster'
          : 'Invite declined'
      )
      await load()
    } finally {
      setBusyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="text-sm text-slate-400 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading organization invites…
        </div>
      </div>
    )
  }

  if (!items.length) return null

  return (
    <div className={className}>
      <div className="space-y-3 rounded-lg border border-slate-700/50 bg-slate-950/60 p-4 shadow-xl shadow-black/20 backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-medium text-slate-100">Band roster invites</h3>
            <p className="mt-1 text-xs text-slate-400">
              Accepting lists your artist account publicly as a member. It does not grant edit or manager access.
            </p>
          </div>
        </div>
        {acceptedBand ? (
          <div className="flex flex-col gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              You joined {acceptedBand.name}.
            </span>
            {acceptedBand.href ? (
              <Button asChild size="sm" variant="ghost" className="h-8 text-emerald-100 hover:bg-emerald-500/10">
                <Link href={acceptedBand.href}>
                  View band
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <ul className="space-y-3">
          {items.map((item) => {
            const org = item.organizer_accounts
            const href =
              org?.subtype === 'band'
                ? getArtistPublicProfilePath(org?.url_slug)
                : getOrganizationPublicProfilePath(org?.url_slug)
            return (
              <li
                key={item.id}
                className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100">
                    {href ? (
                      <Link href={href} className="inline-flex items-center gap-1.5 hover:text-cyan-100">
                        {org?.organization_name || 'Organization'}
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                      </Link>
                    ) : (
                      org?.organization_name || 'Organization'
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <Badge variant="outline" className="border-cyan-300/25 bg-cyan-300/10 capitalize text-cyan-100">
                      {item.role}
                    </Badge>
                    <span>Public listing only</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === item.id}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-400 hover:to-purple-500"
                    onClick={() => respond(item, 'accepted')}
                  >
                    {busyId === item.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="mr-1.5 h-3.5 w-3.5" />}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    className="border-white/15 text-slate-200 hover:bg-white/10"
                    onClick={() => respond(item, 'declined')}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
