"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Banknote,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  MapPin,
  MessageSquare,
  Music,
  Route,
  Search,
  ShieldCheck,
  Ticket,
  Truck,
  Users,
  X,
} from "lucide-react"

import {
  AssignmentPicker,
  AutosaveBar,
  BuilderSection,
  BuilderShell,
  DaySheetPreview,
  SummaryLine,
} from "@/components/admin/operations-builder/primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast as sonnerToast } from "sonner"
import { getEventReadiness, ReadinessState } from "@/lib/admin/operations-readiness"
import {
  buildEventProducerPayload,
  EventProducerFormState,
  hydrateEventProducerForm,
  initialEventProducerForm,
  ProducerSelection,
} from "@/lib/admin/event-producer-builder"
import { useBuilderAutosave } from "@/lib/admin/use-builder-autosave"

interface TourSummary {
  id: string
  name: string
  status?: string | null
  artist?: string | null
  main_artist?: string | null
}

interface VenueOption {
  id: string
  name: string
  city?: string
  state?: string
  capacity?: number
  fullAddress?: string
  contact?: { email?: string; phone?: string; name?: string }
}

const sectionConfig: BuilderSection[] = [
  { id: "basics", label: "Basics", mode: "plan", icon: Music },
  { id: "schedule", label: "Schedule", mode: "plan", icon: CalendarClock },
  { id: "assignment", label: "Tour context", mode: "plan", icon: Route },
  { id: "venue", label: "Venue advance", mode: "advance", icon: MapPin },
  { id: "team", label: "Team and vendors", mode: "advance", icon: Users },
  { id: "logistics", label: "Logistics and map", mode: "run", icon: Truck },
  { id: "finance", label: "Ticketing and finance", mode: "review", icon: Ticket },
  { id: "daysheet", label: "Day sheet", mode: "run", icon: FileText },
  { id: "review", label: "Review and publish", mode: "review", icon: ClipboardCheck },
]

const sectionByReadiness: Record<string, string> = {
  basics: "basics",
  schedule: "schedule",
  venue: "venue",
  tour_assignment: "assignment",
  advancing: "venue",
  team: "team",
  logistics: "logistics",
  finance: "finance",
  day_sheet: "daysheet",
  communications: "logistics",
}

const handoffOptions = [
  { id: "overview", label: "Overview", icon: ClipboardCheck },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "site-map", label: "Site map", icon: MapPin },
  { id: "staff", label: "Staff", icon: Users },
  { id: "vendors", label: "Vendors", icon: ShieldCheck },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "communications", label: "Comms", icon: MessageSquare },
  { id: "day-sheet", label: "Day sheet", icon: FileText },
]

function normalizeSelection(item: any, fallback = "Result"): ProducerSelection {
  const label = item?.name || item?.display_name || item?.label || fallback
  const meta = item?.specialty || item?.location || item?.email || item?.tier || item?.verificationStatus || ""
  return { id: String(item?.id || label), label, meta }
}

function setupEnabled(form: EventProducerFormState, key: string) {
  return Boolean(form.setupChecklist[key])
}

export default function CreateEventPage() {
  const router = useRouter()
  const [form, setForm] = React.useState<EventProducerFormState>(initialEventProducerForm)
  const [eventId, setEventId] = React.useState<string | null>(null)
  const [isHydrating, setIsHydrating] = React.useState(true)
  const [activeMode, setActiveMode] = React.useState<BuilderSection["mode"]>("plan")
  const [activeSection, setActiveSection] = React.useState("basics")
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved" | "error">("unsaved")
  const [isSaving, setIsSaving] = React.useState(false)
  const [handoffTab, setHandoffTab] = React.useState("overview")
  const [tours, setTours] = React.useState<TourSummary[]>([])
  const [isLoadingTours, setIsLoadingTours] = React.useState(false)
  const [tourQuery, setTourQuery] = React.useState("")
  const [venueQuery, setVenueQuery] = React.useState("")
  const [venueResults, setVenueResults] = React.useState<VenueOption[]>([])
  const [isVenueLoading, setIsVenueLoading] = React.useState(false)
  const [artistQuery, setArtistQuery] = React.useState("")
  const [artistResults, setArtistResults] = React.useState<ProducerSelection[]>([])
  const [isArtistLoading, setIsArtistLoading] = React.useState(false)
  const [crewQuery, setCrewQuery] = React.useState("")
  const [crewResults, setCrewResults] = React.useState<ProducerSelection[]>([])
  const [isCrewLoading, setIsCrewLoading] = React.useState(false)
  const [vendorDraft, setVendorDraft] = React.useState("")
  const [autosaveReady, setAutosaveReady] = React.useState(false)
  const skipAutosaveRef = React.useRef(true)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get("draft") || params.get("id")
    if (!id) {
      setIsHydrating(false)
      return
    }
    let cancelled = false
    async function hydrate() {
      setIsHydrating(true)
      try {
        const response = await fetch(`/api/admin/events/${id}`, { credentials: "include", cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to load draft")
        if (cancelled) return
        setEventId(String(data.event?.id || id))
        setForm(hydrateEventProducerForm(data.event))
        setSaveStatus("saved")
        sonnerToast.success("Draft resumed", { description: "Continuing where you left off." })
      } catch (error) {
        if (!cancelled) {
          sonnerToast.error("Could not resume draft", {
            description: error instanceof Error ? error.message : "Starting a new event instead.",
          })
        }
      } finally {
        if (!cancelled) {
          setIsHydrating(false)
          window.setTimeout(() => {
            skipAutosaveRef.current = false
            setAutosaveReady(true)
          }, 800)
        }
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    const sectionsForMode = sectionConfig.filter((section) => section.mode === activeMode)
    if (sectionsForMode.length && !sectionsForMode.some((section) => section.id === activeSection)) {
      setActiveSection(sectionsForMode[0].id)
    }
  }, [activeMode, activeSection])

  React.useEffect(() => {
    let cancelled = false
    async function loadTours() {
      setIsLoadingTours(true)
      try {
        const response = await fetch("/api/admin/tours?status=planning,active,on_hold", {
          credentials: "include",
          cache: "no-store",
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to load tours")
        if (!cancelled) setTours(data.tours || [])
      } catch {
        if (!cancelled) setTours([])
      } finally {
        if (!cancelled) setIsLoadingTours(false)
      }
    }
    void loadTours()
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (venueQuery.trim().length < 2) {
      setVenueResults([])
      return
    }
    const handle = window.setTimeout(async () => {
      setIsVenueLoading(true)
      try {
        const params = new URLSearchParams({ query: venueQuery.trim(), limit: "8" })
        const response = await fetch(`/api/tours/planner/venues?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        })
        const data = await response.json().catch(() => ({}))
        setVenueResults(response.ok ? data.venues || [] : [])
      } catch {
        setVenueResults([])
      } finally {
        setIsVenueLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [venueQuery])

  React.useEffect(() => {
    if (artistQuery.trim().length < 2) {
      setArtistResults([])
      return
    }
    const handle = window.setTimeout(async () => {
      setIsArtistLoading(true)
      try {
        const params = new URLSearchParams({ query: artistQuery.trim(), limit: "8" })
        const response = await fetch(`/api/tours/planner/artists?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        })
        const data = await response.json().catch(() => ({}))
        setArtistResults(response.ok ? (data.artists || []).map((item: any) => normalizeSelection(item, "Artist")) : [])
      } catch {
        setArtistResults([])
      } finally {
        setIsArtistLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [artistQuery])

  React.useEffect(() => {
    if (crewQuery.trim().length < 2) {
      setCrewResults([])
      return
    }
    const handle = window.setTimeout(async () => {
      setIsCrewLoading(true)
      try {
        const params = new URLSearchParams({ query: crewQuery.trim(), limit: "8" })
        const response = await fetch(`/api/tours/planner/crew?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
        })
        const data = await response.json().catch(() => ({}))
        setCrewResults(response.ok ? (data.crew || []).map((item: any) => normalizeSelection(item, "Crew")) : [])
      } catch {
        setCrewResults([])
      } finally {
        setIsCrewLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [crewQuery])

  const updateForm = (patch: Partial<EventProducerFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
    setSaveStatus("unsaved")
  }

  const updateChecklist = (key: string, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      setupChecklist: { ...current.setupChecklist, [key]: enabled },
    }))
    setSaveStatus("unsaved")
  }

  const addSelection = (key: "selectedArtists" | "selectedCrew" | "selectedVendors", selection: ProducerSelection) => {
    setForm((current) => {
      if (current[key].some((item) => item.id === selection.id)) return current
      return { ...current, [key]: [...current[key], selection] }
    })
    setSaveStatus("unsaved")
  }

  const removeSelection = (key: "selectedArtists" | "selectedCrew" | "selectedVendors", id: string) => {
    setForm((current) => ({ ...current, [key]: current[key].filter((item) => item.id !== id) }))
    setSaveStatus("unsaved")
  }

  const toggleTour = (tourId: string) => {
    setForm((current) => {
      const selected = current.selectedTourIds.includes(tourId)
      const next = selected ? current.selectedTourIds.filter((id) => id !== tourId) : [...current.selectedTourIds, tourId]
      return {
        ...current,
        selectedTourIds: next,
        primaryTourId: next.includes(current.primaryTourId) ? current.primaryTourId : next[0] || "",
      }
    })
    setSaveStatus("unsaved")
  }

  const readiness = React.useMemo(() => getEventReadiness({
    title: form.title,
    date: form.date,
    time: form.time,
    venue_name: form.venueName,
    venue_id: form.venueId,
    capacity: form.capacity,
    tour_ids: form.selectedTourIds,
    primary_tour_id: form.primaryTourId,
    technical_rider: form.technicalRider,
    hospitality_rider: form.hospitalityRider,
    security_notes: form.securityNotes,
    promoter_contact: form.promoterName || form.promoterEmail || form.promoterPhone ? {
      name: form.promoterName,
      email: form.promoterEmail,
      phone: form.promoterPhone,
    } : null,
    load_in_time: form.loadIn,
    sound_check_time: form.soundCheck,
    settlement_terms: form.settlementTerms,
    ticket_price: form.ticketPrice,
    expected_revenue: form.expectedRevenue,
    expected_expenses: form.expectedExpenses,
    team_count: form.selectedArtists.length + form.selectedCrew.length,
    vendor_count: form.selectedVendors.length,
    has_logistics: Boolean(form.travel || form.lodging || form.equipment || form.supplyList || form.documents),
    has_site_map: Boolean(form.siteMap),
    has_documents: Boolean(form.documents),
    has_comms: setupEnabled(form, "communications"),
    day_sheet_notes: form.daySheetNotes,
  }), [form])

  const sections = React.useMemo(() => sectionConfig.map((section) => {
    const matchingItem = readiness.items.find((item) => sectionByReadiness[item.id] === section.id || item.id === section.id)
    return { ...section, status: matchingItem?.state as ReadinessState | undefined }
  }), [readiness.items])

  const filteredTours = React.useMemo(() => {
    const query = tourQuery.trim().toLowerCase()
    if (!query) return tours
    return tours.filter((tour) => [tour.name, tour.artist, tour.main_artist, tour.status].some((value) => String(value || "").toLowerCase().includes(query)))
  }, [tourQuery, tours])

  const moveToReadinessItem = (itemId: string) => {
    const sectionId = sectionByReadiness[itemId] || itemId
    const target = sectionConfig.find((section) => section.id === sectionId)
    if (target) {
      setActiveMode(target.mode)
      setActiveSection(target.id)
    }
  }

  const selectVenue = (venue: VenueOption) => {
    updateForm({
      venueId: venue.id,
      venueName: venue.name,
      address: venue.fullAddress || "",
      capacity: venue.capacity ? String(venue.capacity) : form.capacity,
      venueContactEmail: venue.contact?.email || form.venueContactEmail,
      venueContactPhone: venue.contact?.phone || form.venueContactPhone,
    })
    setVenueQuery(venue.name)
    setVenueResults([])
  }

  const addVendorDraft = () => {
    const value = vendorDraft.trim()
    if (!value) return
    addSelection("selectedVendors", { id: `vendor:${value.toLowerCase()}`, label: value, meta: "Vendor setup context" })
    setVendorDraft("")
  }

  const persistEvent = React.useCallback(async (
    publish = false,
    { redirect = true, silent = false }: { redirect?: boolean; silent?: boolean } = {}
  ) => {
    const hasTitle = Boolean(form.title?.trim())
    const hasDate = Boolean(form.date)
    if (!hasDate && !hasTitle) {
      if (!silent) {
        sonnerToast.error("Details required", { description: "Add a title or date before saving the event." })
        setActiveMode("plan")
        setActiveSection("basics")
      }
      return null
    }
    if (!hasDate && (publish || redirect)) {
      if (!silent) {
        sonnerToast.error("Schedule required", { description: "Add a date before saving the event." })
        setActiveMode("plan")
        setActiveSection("schedule")
      }
      return null
    }
    if (publish && readiness.blockers.length > 0) {
      const first = readiness.blockers[0]
      sonnerToast.error("Publish blockers remain", {
        description: first.detail || "Complete the required setup before publishing.",
      })
      moveToReadinessItem(first.id)
      return null
    }

    setIsSaving(true)
    setSaveStatus("saving")
    try {
      const draftForm = form.date
        ? form
        : { ...form, date: new Date().toISOString().slice(0, 10) }
      const payload = buildEventProducerPayload(draftForm, { publish, readinessScore: readiness.score })
      if (!form.date) {
        // Placeholder schedule for title-first draft create; user still needs a real date to publish.
        ;(payload as any).settings = {
          ...((payload as any).settings || {}),
          schedule_placeholder: true,
        }
      }
      const response = await fetch(eventId ? `/api/admin/events/${eventId}` : "/api/admin/events", {
        method: eventId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to save event")

      const savedId = String(data.event?.id || eventId || "")
      if (savedId && !eventId) {
        setEventId(savedId)
        const url = new URL(window.location.href)
        url.searchParams.set("draft", savedId)
        window.history.replaceState({}, "", url.toString())
        skipAutosaveRef.current = false
        setAutosaveReady(true)
      }

      if (publish && savedId) {
        const publishRes = await fetch(`/api/admin/events/${savedId}/publish`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        if (!publishRes.ok) {
          const publishData = await publishRes.json().catch(() => ({}))
          throw new Error(publishData?.error || "Event saved but publish fanout failed")
        }
      }

      setSaveStatus("saved")
      if (!silent) {
        sonnerToast.success(publish ? "Event published" : "Event draft saved", {
          description: redirect
            ? "Opening the management workspace for the next setup step."
            : "Your changes are saved.",
        })
      }

      if (redirect && savedId) {
        const params = new URLSearchParams()
        if (publish) params.set("published", "1")
        if (handoffTab !== "overview") params.set("tab", handoffTab)
        const query = params.toString()
        router.push(`/admin/dashboard/events/${savedId}${query ? `?${query}` : ""}`)
      }
      return savedId
    } catch (error) {
      setSaveStatus("error")
      if (!silent) {
        sonnerToast.error("Could not save event", {
          description: error instanceof Error ? error.message : "Please try again.",
        })
      }
      return null
    } finally {
      setIsSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, form, handoffTab, readiness.blockers, readiness.score, router])

  const saveEvent = async (publish = false) => {
    await persistEvent(publish, { redirect: true })
  }

  // Create-on-first-change: enable autosave once title/date exists (creates draft if needed)
  React.useEffect(() => {
    if (isHydrating) return
    if (form.title?.trim() || form.date) setAutosaveReady(true)
  }, [form.title, form.date, isHydrating])

  useBuilderAutosave({
    enabled: !isHydrating && autosaveReady && Boolean(form.title?.trim() || form.date),
    delayMs: 1600,
    deps: [form],
    onSave: async () => {
      if (skipAutosaveRef.current || isSaving) return
      if (!form.title?.trim() && !form.date) return
      await persistEvent(false, { redirect: false, silent: true })
    },
  })

  const visibleSections = sections.filter((section) => section.mode === activeMode)
  const activeSections = visibleSections.length ? visibleSections : sections

  if (isHydrating) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-6 text-slate-300">
        Resuming event draft…
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <BuilderShell
        title="Event Producer Console"
        subtitle="Create the event once, then hand it directly into venue advance, staffing, vendors, logistics, ticketing, communications, and day-sheet operations."
        badge={eventId ? "Editing draft" : "New event"}
        sections={activeSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        readiness={readiness}
        readinessActions={Object.fromEntries(readiness.items.map((item) => [item.id, () => moveToReadinessItem(item.id)]))}
        summary={
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Event summary</p>
            <SummaryLine icon={Music} label="Title" value={form.title || "Untitled event"} />
            <SummaryLine icon={CalendarClock} label="Schedule" value={form.date ? `${form.date} ${form.time || ""}` : "Date TBD"} />
            <SummaryLine icon={MapPin} label="Venue" value={form.venueName || "Venue TBD"} />
            <SummaryLine icon={Route} label="Touring" value={form.selectedTourIds.length ? `${form.selectedTourIds.length} assignment${form.selectedTourIds.length === 1 ? "" : "s"}` : "Standalone"} />
          </div>
        }
        asideAfterSummary={
          <HandoffPanel value={handoffTab} onChange={setHandoffTab} />
        }
        bottomBar={
          <AutosaveBar
            status={saveStatus}
            entityLabel="Event"
            primaryLabel="Publish event"
            secondaryLabel="Save draft"
            onPrimary={() => void saveEvent(true)}
            onSecondary={() => void saveEvent(false)}
            disabled={isSaving}
          />
        }
      >
        {eventId ? (
        <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
          <span className="mr-2 text-slate-400">After save, manage structured records in the hub:</span>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/events/${eventId}?tab=people`)}>People</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/events/${eventId}?tab=vendors`)}>Vendors</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/events/${eventId}?tab=tickets`)}>Tickets</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/events/${eventId}?tab=logistics`)}>Logistics</Button>
        </div>
      ) : null}

      {activeSection === "basics" && (
          <BuilderPanel title="Basics" icon={Music}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Event title"><Input value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Opening night at The Fonda" /></Field>
              <Field label="Producer intent">
                <Select value={form.producerIntent} onValueChange={(producerIntent) => updateForm({ producerIntent })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_event">Single event</SelectItem>
                    <SelectItem value="tour_stop">Tour stop</SelectItem>
                    <SelectItem value="festival">Festival or multi-act</SelectItem>
                    <SelectItem value="private_event">Private event</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={form.status} onValueChange={(status) => updateForm({ status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Visibility">
                <Select value={form.visibility} onValueChange={(visibility) => updateForm({ visibility })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Team only</SelectItem>
                    <SelectItem value="public">Public when published</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Type"><Input value={form.type} onChange={(event) => updateForm({ type: event.target.value })} placeholder="Live, festival, private, hold" /></Field>
              <Field label="Tags"><Input value={form.tags} onChange={(event) => updateForm({ tags: event.target.value })} placeholder="festival, west coast, radio" /></Field>
              <div className="lg:col-span-2">
                <Field label="Description"><Textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} className="min-h-24" /></Field>
              </div>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "schedule" && (
          <BuilderPanel title="Schedule" icon={CalendarClock}>
            <div className="grid gap-4 lg:grid-cols-4">
              <Field label="Date"><Input type="date" value={form.date} onChange={(event) => updateForm({ date: event.target.value })} /></Field>
              <Field label="Show"><Input type="time" value={form.time} onChange={(event) => updateForm({ time: event.target.value })} /></Field>
              <Field label="End"><Input type="time" value={form.endTime} onChange={(event) => updateForm({ endTime: event.target.value })} /></Field>
              <Field label="Timezone"><Input value={form.timezone} onChange={(event) => updateForm({ timezone: event.target.value })} /></Field>
              <Field label="Doors"><Input type="time" value={form.doorsOpen} onChange={(event) => updateForm({ doorsOpen: event.target.value })} /></Field>
              <Field label="Load-in"><Input type="time" value={form.loadIn} onChange={(event) => updateForm({ loadIn: event.target.value })} /></Field>
              <Field label="Soundcheck"><Input type="time" value={form.soundCheck} onChange={(event) => updateForm({ soundCheck: event.target.value })} /></Field>
              <Field label="Curfew"><Input type="time" value={form.curfew} onChange={(event) => updateForm({ curfew: event.target.value })} /></Field>
              <div className="lg:col-span-4">
                <Field label="Set times"><Textarea value={form.setTimes} onChange={(event) => updateForm({ setTimes: event.target.value })} placeholder="Support 8:00 PM, Headliner 9:15 PM" /></Field>
              </div>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "assignment" && (
          <BuilderPanel title="Tour context" icon={Route}>
            <Field label="Filter tours"><Input value={tourQuery} onChange={(event) => setTourQuery(event.target.value)} placeholder="Search active or planning tours" /></Field>
            <div className="mt-4">
              {isLoadingTours ? (
                <p className="text-sm text-slate-400">Loading tours...</p>
              ) : (
                <AssignmentPicker
                  tours={filteredTours}
                  selectedTourIds={form.selectedTourIds}
                  primaryTourId={form.primaryTourId}
                  onToggleTour={toggleTour}
                  onPrimaryTourChange={(primaryTourId) => updateForm({ primaryTourId })}
                />
              )}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <Field label="Route order"><Input value={form.ordinal} onChange={(event) => updateForm({ ordinal: event.target.value })} placeholder="1" /></Field>
              <Field label="Leg"><Input value={form.legName} onChange={(event) => updateForm({ legName: event.target.value })} placeholder="West Coast" /></Field>
              <Field label="Market"><Input value={form.market} onChange={(event) => updateForm({ market: event.target.value })} placeholder="Los Angeles" /></Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "venue" && (
          <BuilderPanel title="Venue advance" icon={MapPin}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <Field label="Search venues">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input value={venueQuery} onChange={(event) => setVenueQuery(event.target.value)} className="pl-9" placeholder="Venue name, city, or market" />
                  </div>
                </Field>
                <ResultList loading={isVenueLoading} emptyLabel="Search venues to fill advance details.">
                  {venueResults.map((venue) => (
                    <button key={venue.id} type="button" onClick={() => selectVenue(venue)} className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-left hover:bg-slate-900">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{venue.name}</p>
                        <p className="truncate text-xs text-slate-400">{[venue.city, venue.state, venue.capacity ? `${venue.capacity} cap` : ""].filter(Boolean).join(" - ")}</p>
                      </div>
                      <Badge variant="outline">Use</Badge>
                    </button>
                  ))}
                </ResultList>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Venue name"><Input value={form.venueName} onChange={(event) => updateForm({ venueName: event.target.value })} /></Field>
                  <Field label="Room"><Input value={form.room} onChange={(event) => updateForm({ room: event.target.value })} placeholder="Main room" /></Field>
                  <Field label="Capacity"><Input value={form.capacity} onChange={(event) => updateForm({ capacity: event.target.value })} /></Field>
                  <Field label="Address"><Input value={form.address} onChange={(event) => updateForm({ address: event.target.value })} /></Field>
                  <Field label="Venue contact"><Input value={form.venueContactName} onChange={(event) => updateForm({ venueContactName: event.target.value })} placeholder="Name" /></Field>
                  <Field label="Contact email"><Input value={form.venueContactEmail} onChange={(event) => updateForm({ venueContactEmail: event.target.value })} /></Field>
                  <Field label="Contact phone"><Input value={form.venueContactPhone} onChange={(event) => updateForm({ venueContactPhone: event.target.value })} /></Field>
                </div>
              </div>
              <SetupCard title="Advance packet" items={[
                { label: "Production", ready: Boolean(form.technicalRider) },
                { label: "Hospitality", ready: Boolean(form.hospitalityRider) },
                { label: "Security", ready: Boolean(form.securityNotes) },
                { label: "Promoter", ready: Boolean(form.promoterName || form.promoterEmail) },
              ]} />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="Technical rider"><Textarea value={form.technicalRider} onChange={(event) => updateForm({ technicalRider: event.target.value })} /></Field>
              <Field label="Hospitality rider"><Textarea value={form.hospitalityRider} onChange={(event) => updateForm({ hospitalityRider: event.target.value })} /></Field>
              <Field label="Security notes"><Textarea value={form.securityNotes} onChange={(event) => updateForm({ securityNotes: event.target.value })} /></Field>
              <Field label="Settlement terms"><Textarea value={form.settlementTerms} onChange={(event) => updateForm({ settlementTerms: event.target.value })} /></Field>
              <Field label="Promoter name"><Input value={form.promoterName} onChange={(event) => updateForm({ promoterName: event.target.value })} /></Field>
              <Field label="Promoter email"><Input value={form.promoterEmail} onChange={(event) => updateForm({ promoterEmail: event.target.value })} /></Field>
              <Field label="Promoter phone"><Input value={form.promoterPhone} onChange={(event) => updateForm({ promoterPhone: event.target.value })} /></Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "team" && (
          <BuilderPanel title="Team and vendors" icon={Users}>
            <div className="grid gap-4 lg:grid-cols-2">
              <SearchPicker
                label="Artists"
                query={artistQuery}
                onQueryChange={setArtistQuery}
                loading={isArtistLoading}
                results={artistResults}
                selected={form.selectedArtists}
                onSelect={(selection) => addSelection("selectedArtists", selection)}
                onRemove={(id) => removeSelection("selectedArtists", id)}
              />
              <SearchPicker
                label="Crew"
                query={crewQuery}
                onQueryChange={setCrewQuery}
                loading={isCrewLoading}
                results={crewResults}
                selected={form.selectedCrew}
                onSelect={(selection) => addSelection("selectedCrew", selection)}
                onRemove={(id) => removeSelection("selectedCrew", id)}
              />
              <div className="space-y-3">
                <Label className="text-slate-300">Vendors</Label>
                <div className="flex gap-2">
                  <Input value={vendorDraft} onChange={(event) => setVendorDraft(event.target.value)} placeholder="Security, backline, catering..." />
                  <Button type="button" variant="outline" onClick={addVendorDraft}>Add</Button>
                </div>
                <SelectedPills items={form.selectedVendors} onRemove={(id) => removeSelection("selectedVendors", id)} />
              </div>
              <Field label="Stakeholders"><Textarea value={form.stakeholders} onChange={(event) => updateForm({ stakeholders: event.target.value })} placeholder="Manager, promoter, venue lead, production lead" /></Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "logistics" && (
          <BuilderPanel title="Logistics and map" icon={Truck}>
            <SetupChecklist form={form} onChange={updateChecklist} />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <Field label="Travel"><Textarea value={form.travel} onChange={(event) => updateForm({ travel: event.target.value })} /></Field>
              <Field label="Lodging"><Textarea value={form.lodging} onChange={(event) => updateForm({ lodging: event.target.value })} /></Field>
              <Field label="Equipment"><Textarea value={form.equipment} onChange={(event) => updateForm({ equipment: event.target.value })} /></Field>
              <Field label="Site map brief"><Textarea value={form.siteMap} onChange={(event) => updateForm({ siteMap: event.target.value })} placeholder="Stage, FOH, credentials, vendors, gates, emergency lanes" /></Field>
              <Field label="Supply list"><Textarea value={form.supplyList} onChange={(event) => updateForm({ supplyList: event.target.value })} /></Field>
              <Field label="Documents"><Textarea value={form.documents} onChange={(event) => updateForm({ documents: event.target.value })} /></Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "finance" && (
          <BuilderPanel title="Ticketing and finance" icon={Banknote}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Ticket price"><Input value={form.ticketPrice} onChange={(event) => updateForm({ ticketPrice: event.target.value })} /></Field>
              <Field label="VIP price"><Input value={form.vipPrice} onChange={(event) => updateForm({ vipPrice: event.target.value })} /></Field>
              <Field label="Expected revenue"><Input value={form.expectedRevenue} onChange={(event) => updateForm({ expectedRevenue: event.target.value })} /></Field>
              <Field label="Expected expenses"><Input value={form.expectedExpenses} onChange={(event) => updateForm({ expectedExpenses: event.target.value })} /></Field>
              <Field label="Comps"><Input value={form.comps} onChange={(event) => updateForm({ comps: event.target.value })} /></Field>
              <Field label="Guest list budget"><Input value={form.guestListBudget} onChange={(event) => updateForm({ guestListBudget: event.target.value })} /></Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "daysheet" && (
          <BuilderPanel title="Day sheet" icon={FileText}>
            <DaySheetPreview
              title={form.title || "Event day sheet"}
              date={form.date}
              venue={form.venueName}
              schedule={[
                { label: "Load-in", value: form.loadIn },
                { label: "Soundcheck", value: form.soundCheck },
                { label: "Doors", value: form.doorsOpen },
                { label: "Show", value: form.time },
                { label: "Curfew", value: form.curfew },
                { label: "Settlement", value: form.settlementTerms ? "Terms noted" : "" },
              ]}
              notes={form.daySheetNotes}
            />
            <Field label="Day sheet notes"><Textarea value={form.daySheetNotes} onChange={(event) => updateForm({ daySheetNotes: event.target.value })} /></Field>
          </BuilderPanel>
        )}

        {activeSection === "review" && (
          <BuilderPanel title="Review and publish" icon={ClipboardCheck}>
            <div className="grid gap-4 md:grid-cols-2">
              {readiness.items.map((item) => (
                <button key={item.id} type="button" onClick={() => moveToReadinessItem(item.id)} className="rounded-md border border-slate-800 bg-slate-950/60 p-4 text-left hover:bg-slate-900">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{item.label}</p>
                    <Badge variant="outline">{item.state.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                </button>
              ))}
            </div>
          </BuilderPanel>
        )}
      </BuilderShell>
    </div>
  )
}

function BuilderPanel({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-cyan-300" />
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      <div className="[&_input]:border-slate-700 [&_input]:bg-slate-900 [&_input]:text-white [&_textarea]:border-slate-700 [&_textarea]:bg-slate-900 [&_textarea]:text-white [&_button[role=combobox]]:border-slate-700 [&_button[role=combobox]]:bg-slate-900 [&_button[role=combobox]]:text-white">
        {children}
      </div>
    </div>
  )
}

function ResultList({ loading, emptyLabel, children }: { loading: boolean; emptyLabel: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0
  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/50 p-2">
      {loading ? <p className="p-2 text-sm text-slate-400">Loading...</p> : hasChildren ? children : <p className="p-2 text-sm text-slate-500">{emptyLabel}</p>}
    </div>
  )
}

function SearchPicker({
  label,
  query,
  onQueryChange,
  loading,
  results,
  selected,
  onSelect,
  onRemove,
}: {
  label: string
  query: string
  onQueryChange: (value: string) => void
  loading: boolean
  results: ProducerSelection[]
  selected: ProducerSelection[]
  onSelect: (selection: ProducerSelection) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <Field label={label}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-9" placeholder={`Search ${label.toLowerCase()}`} />
        </div>
      </Field>
      <ResultList loading={loading} emptyLabel={`Search ${label.toLowerCase()} to stage setup context.`}>
        {results.map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item)} className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-left hover:bg-slate-900">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{item.label}</p>
              {item.meta && <p className="truncate text-xs text-slate-400">{item.meta}</p>}
            </div>
            <Badge variant="outline">Stage</Badge>
          </button>
        ))}
      </ResultList>
      <SelectedPills items={selected} onRemove={onRemove} />
    </div>
  )
}

function SelectedPills({ items, onRemove }: { items: ProducerSelection[]; onRemove: (id: string) => void }) {
  if (!items.length) return <p className="text-xs text-slate-500">Nothing staged yet.</p>
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">
          <span className="truncate">{item.label}</span>
          <button type="button" onClick={() => onRemove(item.id)} className="text-slate-500 hover:text-red-300" aria-label={`Remove ${item.label}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

function SetupChecklist({ form, onChange }: { form: EventProducerFormState; onChange: (key: string, enabled: boolean) => void }) {
  const items = [
    ["logistics", "Open logistics tasks after save"],
    ["site_map", "Prepare site map workspace"],
    ["staffing", "Continue into staff assignments"],
    ["vendors", "Continue into vendor setup"],
    ["ticketing", "Continue into ticketing"],
    ["communications", "Start communications hub"],
    ["day_sheet", "Build day sheet"],
  ] as const

  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map(([key, label]) => (
        <label key={key} className="flex min-h-12 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200">
          <Checkbox checked={setupEnabled(form, key)} onCheckedChange={(checked) => onChange(key, checked === true)} />
          {label}
        </label>
      ))}
    </div>
  )
}

function SetupCard({ title, items }: { title: string; items: Array<{ label: string; ready: boolean }> }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-400">{item.label}</span>
            {item.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <span className="h-2 w-2 rounded-full bg-slate-700" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function HandoffPanel({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">After save</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {handoffOptions.map((option) => {
          const Icon = option.icon
          const active = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`flex min-h-10 items-center gap-2 rounded-md border px-2 text-left text-xs transition ${active ? "border-cyan-400/50 bg-cyan-500/10 text-white" : "border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-900 hover:text-white"}`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
