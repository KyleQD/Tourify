'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Calendar, ChevronLeft, MapPin, Save, Settings2, Users, X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function ManageArtistEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = useMemo(() => {
    const p = params as { id?: string }
    return p?.id || ''
  }, [params])

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutosaving, setIsAutosaving] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [event, setEvent] = useState<ArtistEvent | null>(null)

  const [details, setDetails] = useState<EventDetailsForm>({
    title: '',
    description: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    type: 'concert',
    categories: [],
    tags: []
  })

  const [venue, setVenue] = useState<VenueForm>({
    venueName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    capacity: '',
    seatingType: 'ga',
    floorplanUrl: ''
  })

  const [scheduleItems, setScheduleItems] = useState<ScheduleItemForm[]>([])
  const [tour, setTour] = useState<TourForm>({ tourName: '', isLinkedToTour: false })
  const [lineup, setLineup] = useState<LineupItemForm[]>([])

  useEffect(() => {
    if (!eventId) return
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('artist_events')
        .select('*')
        .eq('id', eventId)
        .single()
      if (error) {
        console.error(error)
        toast.error('Failed to load event')
        setIsLoading(false)
        return
      }
      if (cancelled) return
      setEvent(data as ArtistEvent)

      const notesJson = safeParseNotesJson(data.notes)

      // Initialize forms
      setDetails({
        title: data.title || '',
        description: data.description || '',
        eventDate: data.event_date || '',
        startTime: data.start_time || '',
        endTime: data.end_time || '',
        type: (data.type as EventType) || 'concert',
        categories: notesJson.categories || [],
        tags: notesJson.tags || []
      })
      setVenue(v => ({
        ...v,
        venueName: data.venue_name || '',
        address: data.venue_address || '',
        city: data.venue_city || '',
        state: data.venue_state || '',
        country: data.venue_country || '',
        capacity: data.capacity ? String(data.capacity) : ''
      }))
      setScheduleItems(notesJson.schedule || [])
      setLineup(notesJson.lineup || [])
      setTour({
        tourName: notesJson.tourName || '',
        isLinkedToTour: Boolean(notesJson.tourName)
      })
      setVenue(v => ({
        ...v,
        seatingType: notesJson.seating?.type || 'ga',
        floorplanUrl: notesJson.seating?.floorplanUrl || ''
      }))

      setIsLoading(false)
      setHasLoaded(true)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [eventId, supabase])

  function safeParseNotesJson(notes?: string | null): NotesJson {
    if (!notes) return { schedule: [] }
    try {
      const parsed = JSON.parse(notes)
      return parsed
    } catch {
      return { schedule: [] }
    }
  }

  async function handleSaveAll() {
    if (!event) return
    setIsSaving(true)

    const notesPayload: NotesJson = {
      schedule: scheduleItems,
      tourName: tour.isLinkedToTour ? tour.tourName : '',
      seating: {
        type: venue.seatingType,
        floorplanUrl: venue.floorplanUrl
      },
      categories: details.categories,
      tags: details.tags,
      lineup
    }

    const { error } = await supabase
      .from('artist_events')
      .update({
        title: details.title,
        description: details.description,
        event_date: details.eventDate,
        start_time: details.startTime || null,
        end_time: details.endTime || null,
        type: details.type,
        venue_name: venue.venueName || null,
        venue_address: venue.address || null,
        venue_city: venue.city || null,
        venue_state: venue.state || null,
        venue_country: venue.country || null,
        capacity: venue.capacity ? Number(venue.capacity) : null,
        notes: JSON.stringify(notesPayload)
      })
      .eq('id', event.id)

    setIsSaving(false)

    if (error) {
      console.error(error)
      toast.error('Failed to save changes')
      return
    }
    toast.success('Event updated')
  }

  // Debounced autosave when any form state changes (skip initial load)
  useEffect(() => {
    if (!hasLoaded || !event) return
    const timer = setTimeout(async () => {
      setIsAutosaving(true)
      const notesPayload: NotesJson = {
        schedule: scheduleItems,
        tourName: tour.isLinkedToTour ? tour.tourName : '',
        seating: { type: venue.seatingType, floorplanUrl: venue.floorplanUrl },
        categories: details.categories,
        tags: details.tags,
        lineup
      }
      const { error } = await supabase
        .from('artist_events')
        .update({
          title: details.title,
          description: details.description,
          event_date: details.eventDate,
          start_time: details.startTime || null,
          end_time: details.endTime || null,
          type: details.type,
          venue_name: venue.venueName || null,
          venue_address: venue.address || null,
          venue_city: venue.city || null,
          venue_state: venue.state || null,
          venue_country: venue.country || null,
          capacity: venue.capacity ? Number(venue.capacity) : null,
          notes: JSON.stringify(notesPayload)
        })
        .eq('id', event.id)
      setIsAutosaving(false)
      if (error) console.error('Autosave failed', error)
    }, 1200)
    return () => clearTimeout(timer)
  }, [details, venue, scheduleItems, tour, lineup, event, hasLoaded, supabase])

  function addScheduleItem() {
    setScheduleItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), label: '', startTime: '', endTime: '' }
    ])
  }

  function updateScheduleItem(id: string, updates: Partial<ScheduleItemForm>) {
    setScheduleItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it))
  }

  function removeScheduleItem(id: string) {
    setScheduleItems(prev => prev.filter(it => it.id !== id))
  }

  function computeTimeline(items: ScheduleItemForm[]): TimelineBlock[] {
    // Convert times to minutes from 00:00, infer min/max, map to percentage
    const toMins = (t?: string) => {
      if (!t) return NaN
      const [h, m] = t.split(':').map(Number)
      if (Number.isNaN(h) || Number.isNaN(m)) return NaN
      return h * 60 + m
    }
    const mapped = items
      .map(it => ({ id: it.id, label: it.label || 'Item', start: toMins(it.startTime), end: toMins(it.endTime) }))
      .filter(it => Number.isFinite(it.start) && Number.isFinite(it.end) && (it.end as number) > (it.start as number)) as Array<{ id: string; label: string; start: number; end: number }>
    if (mapped.length === 0) return []
    const minStart = Math.min(...mapped.map(m => m.start))
    const maxEnd = Math.max(...mapped.map(m => m.end))
    const span = Math.max(1, maxEnd - minStart)
    return mapped.map(m => ({
      id: m.id,
      label: m.label,
      leftPct: ((m.start - minStart) / span) * 100,
      widthPct: ((m.end - m.start) / span) * 100
    }))
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex items-center gap-3 text-white">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        Loading event...
      </div>
    </div>
  )

  if (!event) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-white/70">Event not found</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-slate-700 text-white/80" onClick={() => router.back()}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-white">
            <div className="text-2xl font-bold">Manage Event</div>
            <div className="text-white/60 text-sm">{event.title}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveAll} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button variant="outline" className="border-slate-700 text-white/80" onClick={() => router.push(`/events/${event.slug || event.id}`)}>
            View Public Page
          </Button>
        </div>
      </div>
      {isAutosaving && <div className="text-xs text-white/50">Autosaving…</div>}

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="venue">Venue & Capacity</TabsTrigger>
          <TabsTrigger value="tour">Tour Linking</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Settings2 className="h-5 w-5" /> Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Title</Label>
                  <Input value={details.title} onChange={e => setDetails({ ...details, title: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Type</Label>
                  <Input value={details.type} onChange={e => setDetails({ ...details, type: e.target.value as EventType })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Date</Label>
                  <Input type="date" value={details.eventDate || ''} onChange={e => setDetails({ ...details, eventDate: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/80">Start Time</Label>
                    <Input type="time" value={details.startTime || ''} onChange={e => setDetails({ ...details, startTime: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                  <div>
                    <Label className="text-white/80">End Time</Label>
                    <Input type="time" value={details.endTime || ''} onChange={e => setDetails({ ...details, endTime: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                  </div>
                </div>
                <div>
                  <Label className="text-white/80">Categories</Label>
                  <ChipInput
                    values={details.categories}
                    placeholder="Add category and press Enter"
                    onChange={(vals) => setDetails({ ...details, categories: vals })}
                  />
                </div>
                <div>
                  <Label className="text-white/80">Tags</Label>
                  <ChipInput
                    values={details.tags}
                    placeholder="Add tag and press Enter"
                    onChange={(vals) => setDetails({ ...details, tags: vals })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-white/80">Description</Label>
                <Textarea value={details.description || ''} onChange={e => setDetails({ ...details, description: e.target.value })} className="bg-slate-800 border-slate-700 text-white min-h-[120px]" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><Calendar className="h-5 w-5" /> Schedule & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-white/70 text-sm">Add load-in, soundcheck, set times, etc.</div>
                <Button onClick={addScheduleItem} className="bg-purple-600 hover:bg-purple-700 text-white">Add Item</Button>
              </div>
              <Separator className="bg-slate-700" />
              <div className="space-y-3">
                {scheduleItems.map(item => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3">
                      <Label className="text-white/80">Label</Label>
                      <Input value={item.label} onChange={e => updateScheduleItem(item.id, { label: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-white/80">Start</Label>
                      <Input type="time" value={item.startTime} onChange={e => updateScheduleItem(item.id, { startTime: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div className="md:col-span-3">
                      <Label className="text-white/80">End</Label>
                      <Input type="time" value={item.endTime} onChange={e => updateScheduleItem(item.id, { endTime: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                    </div>
                    <div className="md:col-span-3 flex gap-2">
                      <Button variant="outline" className="border-slate-700 text-white/80" onClick={() => removeScheduleItem(item.id)}>Remove</Button>
                    </div>
                  </div>
                ))}
                {scheduleItems.length === 0 && (
                  <div className="text-white/50 text-sm">No schedule items yet.</div>
                )}
              </div>
              {/* Simple timeline visualization */}
              {scheduleItems.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="text-white/80 text-sm mb-2">Timeline</div>
                  <div className="relative h-10">
                    {computeTimeline(scheduleItems).map(block => (
                      <div key={block.id} className="absolute h-10 rounded-md bg-purple-600/50 border border-purple-500/40 flex items-center justify-center text-[10px] text-white px-2 overflow-hidden"
                        style={{ left: `${block.leftPct}%`, width: `${block.widthPct}%` }}>
                        {block.label}
                      </div>
                    ))}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-slate-600" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="venue">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2"><MapPin className="h-5 w-5" /> Venue & Capacity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Venue Name</Label>
                  <Input value={venue.venueName} onChange={e => setVenue({ ...venue, venueName: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Capacity</Label>
                  <Input inputMode="numeric" value={venue.capacity} onChange={e => setVenue({ ...venue, capacity: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Address</Label>
                  <Input value={venue.address} onChange={e => setVenue({ ...venue, address: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">City</Label>
                  <Input value={venue.city} onChange={e => setVenue({ ...venue, city: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">State</Label>
                  <Input value={venue.state} onChange={e => setVenue({ ...venue, state: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Country</Label>
                  <Input value={venue.country} onChange={e => setVenue({ ...venue, country: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Seating Type</Label>
                  <Input value={venue.seatingType} onChange={e => setVenue({ ...venue, seatingType: e.target.value as SeatingType })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div>
                  <Label className="text-white/80">Floorplan URL</Label>
                  <Input placeholder="https://..." value={venue.floorplanUrl} onChange={e => setVenue({ ...venue, floorplanUrl: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
              </div>
              <Separator className="bg-slate-700" />
              <div className="text-white/60 text-sm flex items-center gap-2">
                <Users className="h-4 w-4" /> Seating/GA configuration and maps can be added later.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tour">
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Multi-Event / Tour Linking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/80">Tour Name</Label>
                  <Input value={tour.tourName} onChange={e => setTour({ ...tour, tourName: e.target.value, isLinkedToTour: e.target.value.length > 0 })} className="bg-slate-800 border-slate-700 text-white" />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="border-slate-700 text-white/80" onClick={() => setTour({ tourName: '', isLinkedToTour: false })}>Unlink</Button>
                </div>
              </div>
              <div className="text-white/60 text-sm">Grouping events into a tour will allow collective management across dates. This UI stores the tour name in the event notes for now; we can extend the schema later.</div>
              <Separator className="bg-slate-700" />
              <div>
                <Label className="text-white/80">Lineup</Label>
                <LineupEditor items={lineup} onChange={setLineup} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Types
interface ArtistEvent {
  id: string
  title: string
  description?: string | null
  type: EventType
  venue_name?: string | null
  venue_address?: string | null
  venue_city?: string | null
  venue_state?: string | null
  venue_country?: string | null
  event_date: string
  start_time?: string | null
  end_time?: string | null
  capacity?: number | null
  slug?: string | null
  notes?: string | null
}

type EventType = 'concert' | 'festival' | 'tour' | 'recording' | 'interview' | 'other'

interface EventDetailsForm {
  title: string
  description?: string
  eventDate: string
  startTime?: string
  endTime?: string
  type: EventType
  categories: string[]
  tags: string[]
}

interface VenueForm {
  venueName: string
  address: string
  city: string
  state: string
  country: string
  capacity: string
  seatingType: SeatingType
  floorplanUrl: string
}

interface ScheduleItemForm {
  id: string
  label: string
  startTime: string
  endTime: string
}

interface TourForm {
  tourName: string
  isLinkedToTour: boolean
}

interface NotesJson {
  schedule: ScheduleItemForm[]
  tourName?: string
  seating?: {
    type: SeatingType
    floorplanUrl?: string
  }
  categories?: string[]
  tags?: string[]
  lineup?: LineupItemForm[]
}

type SeatingType = 'ga' | 'seated' | 'mixed'

interface TimelineBlock {
  id: string
  label: string
  leftPct: number
  widthPct: number
}

// Reusable chip input
function ChipInput({ values, onChange, placeholder }: { values: string[]; onChange: (vals: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('')
  function addFromInput() {
    const trimmed = input.trim()
    if (!trimmed) return
    if (values.includes(trimmed)) { setInput(''); return }
    onChange([...values, trimmed])
    setInput('')
  }
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2">
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map(v => (
          <Badge key={v} variant="secondary" className="bg-purple-500/20 text-purple-200 border-purple-500/30">
            {v}
            <button className="ml-2 text-purple-300/80 hover:text-white" onClick={() => onChange(values.filter(x => x !== v))}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFromInput() } }}
          placeholder={placeholder}
          className="bg-slate-900 border-slate-700 text-white"
        />
        <Button type="button" variant="outline" className="border-slate-700 text-white/80" onClick={addFromInput}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// Lineup editor
function LineupEditor({ items, onChange }: { items: LineupItemForm[]; onChange: (items: LineupItemForm[]) => void }) {
  function add() {
    onChange([ ...items, { id: crypto.randomUUID(), artistName: '', role: 'support', startTime: '', endTime: '' } ])
  }
  function update(id: string, updates: Partial<LineupItemForm>) {
    onChange(items.map(i => i.id === id ? { ...i, ...updates } : i))
  }
  function remove(id: string) {
    onChange(items.filter(i => i.id !== id))
  }
  return (
    <div className="space-y-3">
      {items.map(i => (
        <div key={i.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <Label className="text-white/80">Artist</Label>
            <Input value={i.artistName} onChange={e => update(i.id, { artistName: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-white/80">Role</Label>
            <Input value={i.role} onChange={e => update(i.id, { role: e.target.value as LineupRole })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-white/80">Start</Label>
            <Input type="time" value={i.startTime || ''} onChange={e => update(i.id, { startTime: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="md:col-span-2">
            <Label className="text-white/80">End</Label>
            <Input type="time" value={i.endTime || ''} onChange={e => update(i.id, { endTime: e.target.value })} className="bg-slate-800 border-slate-700 text-white" />
          </div>
          <div className="md:col-span-1 flex">
            <Button variant="outline" className="border-slate-700 text-white/80" onClick={() => remove(i.id)}>Remove</Button>
          </div>
        </div>
      ))}
      <Button type="button" className="bg-purple-600 hover:bg-purple-700 text-white" onClick={add}>Add Artist</Button>
    </div>
  )
}

// Lineup types
type LineupRole = 'headliner' | 'support' | 'guest'
interface LineupItemForm {
  id: string
  artistName: string
  role: LineupRole
  startTime?: string
  endTime?: string
}


