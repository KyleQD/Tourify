"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminPageHeader } from "../../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Music, ArrowLeft, Calendar, BarChart3, Globe, Instagram,
  Twitter, Youtube, Edit2, Check, X, Mail, MapPin, Users, Loader2,
} from "lucide-react"
import { AdminStatCard } from "../../components/admin-stat-card"
import { formatDistanceToNow } from "date-fns"

interface ArtistDetail {
  id: string
  user_id: string
  name: string
  email: string
  avatar_url: string | null
  bio: string | null
  genres: string[]
  social_links: Record<string, string>
  location: string | null
  is_verified: boolean
  status: string
  created_at: string
}

interface ArtistEvent {
  id: string
  name: string
  start_date: string
  venue_name: string
  event_status: string
  participant_role: string
  participant_status: string
}

function InlineEdit({
  value,
  onSave,
  multiline = false,
  label,
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  label: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleSave() {
    onSave(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-start">
        {multiline ? (
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="bg-slate-800/50 border-slate-700/50 text-white text-sm min-h-[80px]"
          />
        ) : (
          <Input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="bg-slate-800/50 border-slate-700/50 text-white text-sm h-8"
          />
        )}
        <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300 p-1 h-8 w-8" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white p-1 h-8 w-8" onClick={() => { setDraft(value); setEditing(false) }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 group">
      <span className="text-slate-300 text-sm">{value || <span className="text-slate-500 italic">Not set</span>}</span>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-1 h-6 w-6 transition-opacity"
        onClick={() => { setDraft(value); setEditing(true) }}
        aria-label={`Edit ${label}`}
      >
        <Edit2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

export default function ArtistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [artist, setArtist] = useState<ArtistDetail | null>(null)
  const [events, setEvents] = useState<ArtistEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/artists/${id}`, { credentials: 'include', cache: 'no-store' })
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setArtist(data.artist)
        setEvents(data.events || [])
      } catch {
        toast.error('Failed to load artist')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  async function saveField(field: string, value: any) {
    if (!artist) return
    setIsSaving(true)
    try {
      const body: Record<string, any> = { [field]: value }
      const res = await fetch(`/api/admin/artists/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setArtist(prev => prev ? { ...prev, ...data.artist } : prev)
      toast.success('Saved')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }

  async function saveGenres(raw: string) {
    const genres = raw.split(',').map(g => g.trim()).filter(Boolean)
    await saveField('genres', genres)
    if (artist) setArtist({ ...artist, genres })
  }

  const upcomingEvents = events.filter(e => e.start_date && new Date(e.start_date) > new Date())
  const pastEvents = events.filter(e => e.start_date && new Date(e.start_date) <= new Date())

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!artist) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Artist Not Found" subtitle="" icon={Music} />
        <p className="text-slate-400">This artist could not be found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={artist.name}
        subtitle={artist.email}
        icon={Music}
        actions={
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
              <Link href="/admin/dashboard/artists">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Artists
              </Link>
            </Button>
          </div>
        }
      />

      {/* Hero section */}
      <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage src={artist.avatar_url || undefined} />
              <AvatarFallback className="text-xl bg-purple-600/20 text-purple-400">
                {artist.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {artist.is_verified && (
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Verified</Badge>
                )}
                {artist.genres.map(g => (
                  <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                ))}
              </div>
              {artist.bio && <p className="text-slate-400 text-sm leading-relaxed">{artist.bio}</p>}
              <div className="flex items-center gap-4 text-sm text-slate-400">
                {artist.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{artist.email}</span>}
                {artist.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{artist.location}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard title="Total Events" value={events.length} icon={Calendar} color="blue" size="default" />
        <AdminStatCard title="Upcoming" value={upcomingEvents.length} icon={Users} color="purple" size="default" />
        <AdminStatCard title="Past Events" value={pastEvents.length} icon={BarChart3} color="green" size="default" />
        <AdminStatCard
          title="Joined"
          value={artist.created_at ? formatDistanceToNow(new Date(artist.created_at), { addSuffix: true }) : '—'}
          icon={Music}
          color="amber"
          size="default"
        />
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-slate-800/60 border border-slate-700/30 rounded-sm p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            Profile
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Artist Name</Label>
                <InlineEdit
                  label="Artist Name"
                  value={artist.name}
                  onSave={v => saveField('artist_name', v)}
                />
              </div>
              <Separator className="bg-slate-800" />
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Bio</Label>
                <InlineEdit
                  label="Bio"
                  value={artist.bio || ''}
                  multiline
                  onSave={v => saveField('bio', v)}
                />
              </div>
              <Separator className="bg-slate-800" />
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs uppercase tracking-wide">Genres (comma-separated)</Label>
                <InlineEdit
                  label="Genres"
                  value={artist.genres.join(', ')}
                  onSave={saveGenres}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['website', 'instagram', 'twitter', 'youtube', 'spotify', 'soundcloud'] as const).map(platform => {
                const icons: Record<string, React.ReactNode> = {
                  website: <Globe className="h-4 w-4 text-slate-400" />,
                  instagram: <Instagram className="h-4 w-4 text-pink-400" />,
                  twitter: <Twitter className="h-4 w-4 text-sky-400" />,
                  youtube: <Youtube className="h-4 w-4 text-red-400" />,
                  spotify: <Music className="h-4 w-4 text-green-400" />,
                  soundcloud: <Music className="h-4 w-4 text-orange-400" />,
                }
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="w-6 shrink-0">{icons[platform]}</span>
                    <div className="flex-1">
                      <InlineEdit
                        label={platform}
                        value={artist.social_links?.[platform] || ''}
                        onSave={v => saveField('social_links', { ...artist.social_links, [platform]: v })}
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4">
          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Event History</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No events found for this artist.</p>
              ) : (
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3 rounded-sm bg-slate-800/50 hover:bg-slate-800 transition-colors">
                      <div className="space-y-0.5">
                        <Link href={`/admin/dashboard/events/${ev.id}`} className="text-sm font-medium text-white hover:text-purple-300 transition-colors">
                          {ev.name || 'Untitled Event'}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {ev.venue_name || 'Unknown venue'} · {ev.start_date ? new Date(ev.start_date).toLocaleDateString() : 'TBD'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs capitalize">{ev.participant_role || 'performer'}</Badge>
                        <Badge
                          className={`text-xs ${
                            ev.participant_status === 'confirmed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                            ev.participant_status === 'invited' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-slate-500/20 text-slate-400 border-slate-500/30'
                          }`}
                        >
                          {ev.participant_status || 'unknown'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminStatCard title="Total Events" value={events.length} icon={Calendar} color="blue" size="default" />
            <AdminStatCard title="Upcoming Events" value={upcomingEvents.length} icon={Users} color="purple" size="default" />
            <AdminStatCard title="Confirmed Events" value={events.filter(e => e.participant_status === 'confirmed').length} icon={BarChart3} color="green" size="default" />
          </div>

          <Card className="mt-4 bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Booking Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['confirmed', 'invited', 'pending', 'cancelled'] as const).map(status => {
                const count = events.filter(e => e.participant_status === status).length
                const pct = events.length > 0 ? Math.round((count / events.length) * 100) : 0
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400 capitalize">{status}</span>
                      <span className="text-white font-medium">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-700">
                      <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
