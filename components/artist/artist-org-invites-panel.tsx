'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users } from 'lucide-react'
import Link from 'next/link'
import { getOrganizationPublicProfilePath } from '@/lib/utils/public-profile-routes'

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

  async function respond(membershipId: string, status: 'accepted' | 'declined') {
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
      toast.success(status === 'accepted' ? 'Joined organization roster' : 'Invite declined')
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
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-300" />
          <h3 className="font-medium text-slate-100">Organization roster invites</h3>
        </div>
        <ul className="space-y-3">
          {items.map((item) => {
            const org = item.organizer_accounts
            const href = getOrganizationPublicProfilePath(org?.url_slug)
            return (
              <li
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-lg border border-white/10 px-3 py-2"
              >
                <div>
                  <div className="font-medium text-slate-100">
                    {href ? (
                      <Link href={href} className="hover:underline">
                        {org?.organization_name || 'Organization'}
                      </Link>
                    ) : (
                      org?.organization_name || 'Organization'
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex gap-2 mt-1">
                    <Badge variant="outline" className="border-white/15 capitalize">
                      {item.role}
                    </Badge>
                    {org?.subtype ? <span className="capitalize">{org.subtype}</span> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === item.id}
                    onClick={() => respond(item.id, 'accepted')}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === item.id}
                    onClick={() => respond(item.id, 'declined')}
                  >
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
