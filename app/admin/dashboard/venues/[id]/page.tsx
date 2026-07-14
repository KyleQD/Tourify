"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { AdminPageHeader } from "../../components/admin-page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Building, ArrowLeft, Calendar, Map, Users, Globe, Mail,
  Phone, MapPin, Edit2, Check, X, Loader2,
} from "lucide-react"
import { AdminStatCard } from "../../components/admin-stat-card"

interface VenueDetail {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  capacity: number | null
  website: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  notes: string | null
  created_at: string
}

interface VenueEvent {
  id: string
  name: string
  start_date: string
  status: string
  capacity: number
}

function InlineEdit({
  value,
  onSave,
  multiline = false,
  label,
  type = 'text',
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  label: string
  type?: string
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
            type={type}
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

export default function VenueDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [venue, setVenue] = useState<VenueDetail | null>(null)
  const [events, setEvents] = useState<VenueEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/venues/${id}`, { credentials: 'include', cache: 'no-store' })
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setVenue(data.venue)
        setEvents(data.events || [])
      } catch {
        toast.error('Failed to load venue')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  async function saveField(field: string, value: any) {
    if (!venue) return
    setIsSaving(true)
    try {
      const body: Record<string, any> = { [field]: value }
      const res = await fetch(`/api/admin/venues/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setVenue(prev => prev ? { ...prev, ...data.venue, name: data.venue.venue_name ?? prev.name } : prev)
      toast.success('Saved')
    } catch (err: any) {
      toast.error(err.message || 'Save failed')
    } finally {
      setIsSaving(false)
    }
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

  if (!venue) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Venue Not Found" subtitle="" icon={Building} />
        <p className="text-slate-400">This venue could not be found.</p>
      </div>
    )
  }

  const locationStr = [venue.city, venue.state, venue.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={venue.name}
        subtitle={locationStr || 'Venue details'}
        icon={Building}
        actions={
          <div className="flex items-center gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
              <Link href="/admin/dashboard/venues">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminStatCard title="Total Events" value={events.length} icon={Calendar} color="blue" size="default" />
        <AdminStatCard title="Upcoming" value={upcomingEvents.length} icon={Users} color="purple" size="default" />
        <AdminStatCard title="Past Events" value={pastEvents.length} icon={Building} color="green" size="default" />
        <AdminStatCard title="Capacity" value={venue.capacity ? venue.capacity.toLocaleString() : '—'} icon={Users} color="amber" size="default" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-slate-800/60 border border-slate-700/30 rounded-sm p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="events" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            Events ({events.length})
          </TabsTrigger>
          <TabsTrigger value="site-maps" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm">
            Site Maps
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Venue Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                    <Building className="h-3 w-3" /> Venue Name
                  </Label>
                  <InlineEdit label="Venue Name" value={venue.name} onSave={v => saveField('venue_name', v)} />
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Address
                  </Label>
                  <InlineEdit label="Address" value={venue.address || ''} onSave={v => saveField('address', v)} />
                </div>
                <Separator className="bg-slate-800" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase tracking-wide">City</Label>
                    <InlineEdit label="City" value={venue.city || ''} onSave={v => saveField('city', v)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs uppercase tracking-wide">State</Label>
                    <InlineEdit label="State" value={venue.state || ''} onSave={v => saveField('state', v)} />
                  </div>
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide">Capacity</Label>
                  <InlineEdit label="Capacity" type="number" value={String(venue.capacity || '')} onSave={v => saveField('capacity', parseInt(v, 10) || null)} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                    <Globe className="h-3 w-3" /> Website
                  </Label>
                  <InlineEdit label="Website" value={venue.website || ''} onSave={v => saveField('website', v)} />
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                    <Users className="h-3 w-3" /> Contact Name
                  </Label>
                  <InlineEdit label="Contact Name" value={venue.contact_name || ''} onSave={v => saveField('contact_name', v)} />
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Contact Email
                  </Label>
                  <InlineEdit label="Contact Email" value={venue.contact_email || ''} onSave={v => saveField('contact_email', v)} />
                </div>
                <Separator className="bg-slate-800" />
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs uppercase tracking-wide flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Contact Phone
                  </Label>
                  <InlineEdit label="Contact Phone" value={venue.contact_phone || ''} onSave={v => saveField('contact_phone', v)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <InlineEdit label="Notes" value={venue.notes || ''} multiline onSave={v => saveField('notes', v)} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="mt-4">
          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Events at {venue.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">No events found for this venue.</p>
              ) : (
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3 rounded-sm bg-slate-800/50 hover:bg-slate-800 transition-colors">
                      <div className="space-y-0.5">
                        <Link href={`/admin/dashboard/events/${ev.id}`} className="text-sm font-medium text-white hover:text-purple-300 transition-colors">
                          {ev.name || 'Untitled Event'}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {ev.start_date ? new Date(ev.start_date).toLocaleDateString() : 'TBD'}
                          {ev.capacity ? ` · Cap: ${ev.capacity.toLocaleString()}` : ''}
                        </p>
                      </div>
                      <Badge
                        className={`text-xs ${
                          ev.status === 'published' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          ev.status === 'draft' ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' :
                          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {ev.status || 'unknown'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Maps Tab */}
        <TabsContent value="site-maps" className="mt-4">
          <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Venue Site Maps</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-8 gap-4 text-center">
              <Map className="h-10 w-10 text-slate-500" />
              <p className="text-slate-400 text-sm">Site maps for this venue are managed in the Logistics module.</p>
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" asChild>
                <Link href="/admin/dashboard/logistics?tab=site-maps">
                  <Map className="h-4 w-4 mr-2" />
                  Go to Site Maps
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
