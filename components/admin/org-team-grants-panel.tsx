'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, Users } from 'lucide-react'

interface OrgTeamGrantsPanelProps {
  organizerAccountId: string
  subtype?: string | null
  className?: string
}

export function OrgTeamGrantsPanel({
  organizerAccountId,
  subtype,
  className,
}: OrgTeamGrantsPanelProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'tour_manager' | 'admin' | 'production'>('tour_manager')
  const [artistQuery, setArtistQuery] = useState('')
  const [artistProfileId, setArtistProfileId] = useState('')
  const [artistRole, setArtistRole] = useState('member')
  const [artistHits, setArtistHits] = useState<any[]>([])
  const [isSearchingArtist, setIsSearchingArtist] = useState(false)
  const [isSavingGrant, setIsSavingGrant] = useState(false)
  const [isSavingArtist, setIsSavingArtist] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const showRoster = subtype === 'band' || subtype === 'label'

  async function load() {
    setIsLoading(true)
    try {
      const [grantsRes, rosterRes] = await Promise.all([
        fetch(`/api/organization/tour-managers?organizerAccountId=${organizerAccountId}`, {
          credentials: 'include',
        }),
        showRoster
          ? fetch(`/api/organization/artist-members?organizerAccountId=${organizerAccountId}`, {
              credentials: 'include',
            })
          : Promise.resolve(null),
      ])
      if (grantsRes.ok) {
        const data = await grantsRes.json()
        setMembers(data.members || [])
      }
      if (rosterRes && rosterRes.ok) {
        const data = await rosterRes.json()
        setRoster(data.members || [])
      }
    } catch {
      // ignore load errors in panel
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (organizerAccountId) void load()
  }, [organizerAccountId, showRoster])

  async function inviteTourManager() {
    if (!email.trim()) {
      toast.error('Enter an email')
      return
    }
    setIsSavingGrant(true)
    try {
      const res = await fetch('/api/organization/tour-managers', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerAccountId,
          email: email.trim(),
          role,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to invite')
        return
      }
      toast.success('Admin / Work Mode grant sent')
      setEmail('')
      await load()
    } finally {
      setIsSavingGrant(false)
    }
  }

  async function searchArtists(query: string) {
    setArtistQuery(query)
    if (query.trim().length < 2) {
      setArtistHits([])
      return
    }
    setIsSearchingArtist(true)
    try {
      const res = await fetch(
        `/api/search/enhanced?q=${encodeURIComponent(query.trim())}&type=artists&limit=8`,
        { credentials: 'include' }
      )
      if (!res.ok) return
      const data = await res.json()
      const rows = Array.isArray(data.results)
        ? data.results.filter((row: any) => row.type === 'artist')
        : []
      setArtistHits(rows)
    } finally {
      setIsSearchingArtist(false)
    }
  }

  async function inviteArtist() {
    let resolvedArtistId = artistProfileId.trim()
    if (!resolvedArtistId && artistQuery.trim()) {
      const match = artistHits.find(
        (row) =>
          String(row.username || '').toLowerCase() === artistQuery.trim().toLowerCase() ||
          String(row.displayName || '').toLowerCase() === artistQuery.trim().toLowerCase()
      )
      // enhanced search id for artists is often accounts.id; prefer profile id from owner mapping
      resolvedArtistId = String(match?.profileId || match?.id || '')
    }
    if (!resolvedArtistId) {
      toast.error('Select an artist from search results')
      return
    }
    setIsSavingArtist(true)
    try {
      const res = await fetch('/api/organization/artist-members', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-acting-profile-id': organizerAccountId,
          'x-acting-account-type': 'organization',
        },
        body: JSON.stringify({
          organizerAccountId,
          artistProfileId: resolvedArtistId,
          role: artistRole,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Failed to invite artist')
        return
      }
      toast.success('Artist invited to roster')
      setArtistProfileId('')
      setArtistQuery('')
      setArtistHits([])
      await load()
    } finally {
      setIsSavingArtist(false)
    }
  }

  async function removeMembership(membershipId: string) {
    const res = await fetch('/api/organization/artist-members', {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-acting-profile-id': organizerAccountId,
        'x-acting-account-type': 'organization',
      },
      body: JSON.stringify({ membershipId, status: 'removed' }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || 'Failed to remove')
      return
    }
    toast.success('Membership updated')
    await load()
  }

  return (
    <div className={className}>
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-amber-300" />
          <h3 className="font-medium text-slate-100">Invite tour manager / admin</h3>
        </div>
        <p className="text-xs text-slate-400">
          Tour managers stay General users. This assigns Admin / Work Mode access for this
          organization — they do not become a public persona.
        </p>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <div className="space-y-1">
            <Label htmlFor="tm-email">Email</Label>
            <Input
              id="tm-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@example.com"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tour_manager">Tour manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={inviteTourManager} disabled={isSavingGrant}>
              {isSavingGrant ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-xs text-slate-500">Loading grants…</div>
        ) : members.length > 0 ? (
          <ul className="space-y-1">
            {members.map((member) => (
              <li key={`${member.user_id}-${member.role}`} className="text-xs text-slate-300 flex gap-2">
                <Badge variant="outline" className="border-white/15 capitalize">
                  {member.role}
                </Badge>
                <span className="font-mono text-slate-400">{member.user_id}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {showRoster ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-300" />
            <h3 className="font-medium text-slate-100">Invite artist to roster</h3>
          </div>
          <p className="text-xs text-slate-400">
            Artists keep their own /artist/{"{slug}"} page. Accepted members appear on this
            organization&apos;s public roster.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
            <div className="space-y-1">
              <Label htmlFor="artist-query">Search artist</Label>
              <Input
                id="artist-query"
                value={artistQuery}
                onChange={(e) => void searchArtists(e.target.value)}
                placeholder="Name or slug"
                className="bg-white/5 border-white/10"
              />
              {isSearchingArtist ? (
                <div className="text-xs text-slate-500">Searching…</div>
              ) : artistHits.length > 0 ? (
                <ul className="rounded-md border border-white/10 divide-y divide-white/5 max-h-40 overflow-auto">
                  {artistHits.map((hit) => (
                    <li key={String(hit.id)}>
                      <button
                        type="button"
                        className="w-full text-left px-2 py-1.5 text-xs hover:bg-white/5"
                        onClick={() => {
                          setArtistProfileId(String(hit.id))
                          setArtistQuery(String(hit.displayName || hit.username || ''))
                          setArtistHits([])
                        }}
                      >
                        {hit.displayName || hit.username}
                        {hit.username ? (
                          <span className="text-slate-500"> @{hit.username}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Input
                value={artistRole}
                onChange={(e) => setArtistRole(e.target.value)}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={inviteArtist} disabled={isSavingArtist || !artistProfileId}>
                {isSavingArtist ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
              </Button>
            </div>
          </div>
          {roster.length > 0 ? (
            <ul className="space-y-1">
              {roster.map((row) => (
                <li key={row.id} className="text-xs text-slate-300 flex gap-2 items-center justify-between">
                  <div className="flex gap-2 items-center">
                    <Badge variant="outline" className="border-white/15 capitalize">
                      {row.status}
                    </Badge>
                    <span>{row.artist_profiles?.artist_name || row.artist_profile_id}</span>
                  </div>
                  {row.status !== 'removed' ? (
                    <Button size="sm" variant="ghost" onClick={() => void removeMembership(row.id)}>
                      Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
