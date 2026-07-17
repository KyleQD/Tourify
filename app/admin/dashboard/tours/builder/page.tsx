"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Banknote,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Megaphone,
  Plus,
  Route,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react"

import {
  AdvancingMatrix,
  AutosaveBar,
  BuilderSection,
  BuilderShell,
  DaySheetPreview,
  EntitySearchDrawer,
  ItineraryTimeline,
  RouteStopDraft,
  RouteStopTable,
  SummaryLine,
} from "@/components/admin/operations-builder/primitives"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast as sonnerToast } from "sonner"
import { getTourReadiness, ReadinessState } from "@/lib/admin/operations-readiness"
import {
  buildTourBuilderPayload,
  hydrateTourBuilderForm,
  initialTourBuilderForm,
  makeTourStop,
  type TourBuilderFormState,
} from "@/lib/admin/tour-builder"
import { EntityAccountPicker, type EntityAccountSelection } from "@/components/admin/operations-builder/entity-account-picker"
import { useBuilderAutosave } from "@/lib/admin/use-builder-autosave"

interface ExistingEventOption {
  id: string
  name: string
  event_date?: string
  venue_name?: string
  tours?: Array<{ id: string; name: string }>
}

interface TourFormState {
  name: string
  mainArtist: string
  description: string
  status: string
  startDate: string
  endDate: string
  markets: string
  branding: string
  routeNotes: string
  stops: RouteStopDraft[]
  attachedEventIds: string[]
  people: string
  vendors: string
  permissions: string
  transportation: string
  lodging: string
  equipment: string
  freight: string
  supplies: string
  siteMaps: string
  budget: string
  guarantees: string
  settlements: string
  perDiems: string
  documents: string
  credentials: string
  announcements: string
  auditNotes: string
}

const initialTourForm: TourFormState = {
  name: "",
  mainArtist: "",
  description: "",
  status: "planning",
  startDate: "",
  endDate: "",
  markets: "",
  branding: "",
  routeNotes: "",
  stops: [],
  attachedEventIds: [],
  people: "",
  vendors: "",
  permissions: "",
  transportation: "",
  lodging: "",
  equipment: "",
  freight: "",
  supplies: "",
  siteMaps: "",
  budget: "",
  guarantees: "",
  settlements: "",
  perDiems: "",
  documents: "",
  credentials: "",
  announcements: "",
  auditNotes: "",
}

const sectionConfig: BuilderSection[] = [
  { id: "overview", label: "Overview", mode: "plan", icon: Route },
  { id: "route", label: "Route", mode: "plan", icon: CalendarDays },
  { id: "events", label: "Events", mode: "plan", icon: Plus },
  { id: "advancing", label: "Advancing matrix", mode: "advance", icon: ShieldCheck },
  { id: "itinerary", label: "Itinerary", mode: "run", icon: FileText },
  { id: "daysheets", label: "Day sheets", mode: "run", icon: ClipboardCheck },
  { id: "people", label: "People", mode: "advance", icon: Users },
  { id: "logistics", label: "Logistics", mode: "run", icon: Truck },
  { id: "finance", label: "Finance", mode: "review", icon: Banknote },
  { id: "documents", label: "Documents", mode: "review", icon: FolderOpen },
  { id: "comms", label: "Comms", mode: "run", icon: Megaphone },
  { id: "review", label: "Review", mode: "review", icon: ClipboardCheck },
]

const sectionByReadiness: Record<string, string> = {
  overview: "overview",
  dates: "overview",
  events: "events",
  route: "route",
  advancing: "advancing",
  people: "people",
  logistics: "logistics",
  finance: "finance",
}

function parseList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean)
}

function numberOrNull(value: string) {
  const normalized = value.replace(/[$,]/g, "").trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function makeStop(): RouteStopDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    venue: "",
    date: "",
    time: "",
    market: "",
    leg_name: "",
    capacity: "",
    advance_status: "not_started",
  }
}

export default function TourBuilderPage() {
  const router = useRouter()
  const [form, setForm] = React.useState<TourBuilderFormState>(() => ({ ...initialTourBuilderForm, stops: [makeTourStop()] }))
  const [tourId, setTourId] = React.useState<string | null>(null)
  const [isHydrating, setIsHydrating] = React.useState(true)
  const [autosaveReady, setAutosaveReady] = React.useState(false)
  const skipAutosaveRef = React.useRef(true)
  const [activeMode, setActiveMode] = React.useState<BuilderSection["mode"]>("plan")
  const [activeSection, setActiveSection] = React.useState("overview")
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved" | "error">("unsaved")
  const [isSaving, setIsSaving] = React.useState(false)
  const [eventQuery, setEventQuery] = React.useState("")
  const [events, setEvents] = React.useState<ExistingEventOption[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false)
  const pendingEventAttachRef = React.useRef(false)

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
        const [tourRes, eventsRes] = await Promise.all([
          fetch(`/api/admin/tours/${id}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/admin/tours/${id}/events`, { credentials: "include", cache: "no-store" }),
        ])
        const tourData = await tourRes.json().catch(() => ({}))
        const eventsData = await eventsRes.json().catch(() => ({}))
        if (!tourRes.ok) throw new Error(tourData?.error || "Failed to load draft")
        if (cancelled) return
        const linked = eventsData.events || tourData.tour?.events || []
        setTourId(String(tourData.tour?.id || id))
        setForm(hydrateTourBuilderForm(tourData.tour, linked))
        setSaveStatus("saved")
        sonnerToast.success("Tour draft resumed")
      } catch (error) {
        if (!cancelled) {
          sonnerToast.error("Could not resume draft", {
            description: error instanceof Error ? error.message : "Starting a new tour instead.",
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
    return () => { cancelled = true }
  }, [])

  React.useEffect(() => {
    const sectionsForMode = sectionConfig.filter((section) => section.mode === activeMode)
    if (sectionsForMode.length && !sectionsForMode.some((section) => section.id === activeSection)) {
      setActiveSection(sectionsForMode[0].id)
    }
  }, [activeMode, activeSection])

  React.useEffect(() => {
    let cancelled = false
    async function loadEvents() {
      setIsLoadingEvents(true)
      try {
        const response = await fetch("/api/admin/events", { credentials: "include", cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to load events")
        if (!cancelled) setEvents(data.events || [])
      } catch {
        if (!cancelled) setEvents([])
      } finally {
        if (!cancelled) setIsLoadingEvents(false)
      }
    }
    void loadEvents()
    return () => {
      cancelled = true
    }
  }, [])

  const updateForm = (patch: Partial<TourBuilderFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
    setSaveStatus("unsaved")
  }

  const updateStop = (id: string, patch: Partial<RouteStopDraft>) => {
    setForm((current) => ({
      ...current,
      stops: current.stops.map((stop) => stop.id === id ? { ...stop, ...patch } : stop),
    }))
    setSaveStatus("unsaved")
  }

  const removeStop = (id: string) => {
    setForm((current) => ({ ...current, stops: current.stops.filter((stop) => stop.id !== id) }))
    setSaveStatus("unsaved")
  }

  const addStop = () => updateForm({ stops: [...form.stops, makeTourStop()] })

  const attachEvent = (eventId: string) => {
    if (form.attachedEventIds.includes(eventId)) return
    updateForm({ attachedEventIds: [...form.attachedEventIds, eventId] })
  }

  React.useEffect(() => {
    if (isHydrating || pendingEventAttachRef.current) return
    const eventId = new URLSearchParams(window.location.search).get("event_id")
    if (!eventId) return
    pendingEventAttachRef.current = true
    setForm((current) => current.attachedEventIds.includes(eventId)
      ? current
      : { ...current, attachedEventIds: [...current.attachedEventIds, eventId] })
    setActiveMode("plan")
    setActiveSection("events")
    setSaveStatus("unsaved")
    sonnerToast.info("Event staged for this tour", {
      description: "Save the tour draft to keep this event attached.",
    })
  }, [isHydrating])

  const readiness = React.useMemo(() => getTourReadiness({
    name: form.name,
    main_artist: form.mainArtist,
    artist_account_id: form.artistAccountId || null,
    start_date: form.startDate,
    end_date: form.endDate,
    events: form.stops,
    route: form.stops.map((stop) => ({ city: stop.market, venue: stop.venue, date: stop.date })),
    transportation: form.transportation ? { details: form.transportation } : {},
    accommodation: form.lodging ? { details: form.lodging } : {},
    equipment: form.equipment ? [{ details: form.equipment }] : [],
    crew_count: parseList(form.people).length,
    budget: form.budget,
  }), [form])

  const sections = React.useMemo(() => sectionConfig.map((section) => {
    const readinessId = section.id === "route" ? "route" : section.id === "events" ? "events" : section.id
    const matchingItem = readiness.items.find((item) => item.id === readinessId)
    return { ...section, status: matchingItem?.state as ReadinessState | undefined }
  }), [readiness.items])

  const moveToReadinessItem = (itemId: string) => {
    const sectionId = sectionByReadiness[itemId] || itemId
    const target = sectionConfig.find((section) => section.id === sectionId)
    if (target) {
      setActiveMode(target.mode)
      setActiveSection(target.id)
    }
  }

  const filteredEvents = events.filter((event) => {
    const q = eventQuery.toLowerCase()
    if (!q) return true
    return [event.name, event.venue_name, event.event_date].some((value) => String(value || "").toLowerCase().includes(q))
  })

  const persistTour = React.useCallback(async (
    publish = false,
    { redirect = true, silent = false }: { redirect?: boolean; silent?: boolean } = {}
  ) => {
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
      const payload = buildTourBuilderPayload(form, { publish, readinessScore: readiness.score })
      const response = await fetch(tourId ? `/api/admin/tours/${tourId}` : "/api/admin/tours", {
        method: tourId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to save tour")

      const savedId = String(data.tour?.id || tourId || "")
      if (savedId && !tourId) {
        setTourId(savedId)
        const url = new URL(window.location.href)
        url.searchParams.set("draft", savedId)
        window.history.replaceState({}, "", url.toString())
        skipAutosaveRef.current = false
        setAutosaveReady(true)
      }

      if (data.tour) {
        const linkedEvents = Array.isArray(data.tour.events) ? data.tour.events : []
        const hydrated = hydrateTourBuilderForm(data.tour, linkedEvents)
        // Keep local draft stops if the response has no events yet (metadata-only patch).
        if (linkedEvents.length > 0 || hydrated.stops.some((stop) => stop.name || stop.venue || stop.date)) {
          setForm(hydrated)
        }
      }

      if (publish && savedId) {
        const publishRes = await fetch(`/api/admin/tours/${savedId}/publish`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        if (!publishRes.ok) {
          const publishData = await publishRes.json().catch(() => ({}))
          throw new Error(publishData?.error || "Tour saved but publish fanout failed")
        }
      }

      setSaveStatus("saved")
      if (!silent) {
        sonnerToast.success(publish ? "Tour published" : "Tour draft saved", {
          description: redirect
            ? "Opening the tour command center."
            : "Your changes are saved.",
        })
      }
      if (redirect && savedId) {
        router.push(`/admin/dashboard/tours/${savedId}?published=${publish ? "1" : "0"}`)
      }
      return savedId
    } catch (error) {
      setSaveStatus("error")
      if (!silent) {
        sonnerToast.error("Could not save tour", {
          description: error instanceof Error ? error.message : "Please try again.",
        })
      }
      return null
    } finally {
      setIsSaving(false)
    }
  }, [form, readiness.blockers, readiness.score, router, tourId])

  const saveTour = async (publish = false) => {
    await persistTour(publish, { redirect: true })
  }

  React.useEffect(() => {
    if (isHydrating) return
    if (form.name?.trim() || form.startDate) setAutosaveReady(true)
  }, [form.name, form.startDate, isHydrating])

  useBuilderAutosave({
    enabled: !isHydrating && autosaveReady && Boolean(form.name?.trim() || form.startDate),
    delayMs: 1600,
    deps: [form],
    onSave: async () => {
      if (skipAutosaveRef.current || isSaving) return
      if (!form.name?.trim() && !form.startDate) return
      await persistTour(false, { redirect: false, silent: true })
    },
  })

  const visibleSections = sections.filter((section) => section.mode === activeMode)
  const activeSections = visibleSections.length ? visibleSections : sections

  if (isHydrating) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-6 text-slate-300">
        Resuming tour draft…
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <BuilderShell
        title="Tour Operations Builder"
        subtitle="Build the route while staging the event, advance, itinerary, day-sheet, team, logistics, finance, document, and communications workspaces."
        badge={tourId ? "Editing draft" : "New tour"}
        sections={activeSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        readiness={readiness}
        readinessActions={Object.fromEntries(readiness.items.map((item) => [item.id, () => moveToReadinessItem(item.id)]))}
        summary={
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Tour summary</p>
            <SummaryLine icon={Route} label="Tour" value={form.name || "Untitled Tour"} />
            <SummaryLine icon={Users} label="Headliner" value={form.mainArtist || "Artist TBD"} />
            <SummaryLine icon={CalendarDays} label="Dates" value={form.startDate || form.endDate ? `${form.startDate || "TBD"} to ${form.endDate || "TBD"}` : "Dates TBD"} />
            <SummaryLine icon={Plus} label="Stops" value={`${form.stops.length} drafted, ${form.attachedEventIds.length} attached`} />
          </div>
        }
        asideAfterSummary={<TourHandoffPanel />}
        bottomBar={
          <AutosaveBar
            status={saveStatus}
            entityLabel="Tour"
            primaryLabel="Publish tour"
            secondaryLabel="Save draft"
            onPrimary={() => void saveTour(true)}
            onSecondary={() => void saveTour(false)}
            disabled={isSaving}
          />
        }
      >
        {tourId ? (
        <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
          <span className="mr-2 text-slate-400">Structured data lives in the hub:</span>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=team`)}>People</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=vendors`)}>Vendors</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=logistics`)}>Logistics</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=finances`)}>Finances</Button>
        </div>
      ) : null}

      {activeSection === "overview" && (
          <Panel title="Overview" icon={Route}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Tour name"><Input value={form.name} onChange={(event) => updateForm({ name: event.target.value })} placeholder="Summer West Coast Run" /></Field>
              <div className="space-y-2">
                <EntityAccountPicker
                  label="Headliner artist account"
                  placeholder="Search artists…"
                  searchUrl="/api/tours/planner/artists"
                  multi={false}
                  mapResult={(row) => ({
                    id: String(row.id || ""),
                    label: row.name || row.display_name || "Artist",
                    meta: row.location || undefined,
                  })}
                  selected={
                    form.artistAccountId
                      ? [{ id: form.artistAccountId, label: form.mainArtist || "Selected artist" }]
                      : []
                  }
                  onSelect={(selection: EntityAccountSelection) => {
                    updateForm({ artistAccountId: selection.id, mainArtist: selection.label })
                  }}
                  onRemove={() => updateForm({ artistAccountId: "", mainArtist: "" })}
                />
                {!form.artistAccountId ? (
                  <Field label="Headliner label (fallback)">
                    <Input value={form.mainArtist} onChange={(event) => updateForm({ mainArtist: event.target.value })} />
                  </Field>
                ) : null}
              </div>
              <Field label="Status">
                <Select value={form.status} onValueChange={(status) => updateForm({ status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Markets"><Input value={form.markets} onChange={(event) => updateForm({ markets: event.target.value })} placeholder="Los Angeles, San Diego, Phoenix" /></Field>
              <Field label="Start date"><Input type="date" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} /></Field>
              <Field label="End date"><Input type="date" value={form.endDate} onChange={(event) => updateForm({ endDate: event.target.value })} /></Field>
              <Field label="Cover image URL"><Input value={form.coverImageUrl} onChange={(event) => updateForm({ coverImageUrl: event.target.value })} placeholder="https://..." /></Field>
              <Field label="Branding"><Textarea value={form.branding} onChange={(event) => updateForm({ branding: event.target.value })} /></Field>
              <Field label="Description"><Textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} /></Field>
            </div>
          </Panel>
        )}

        {activeSection === "route" && (
          <Panel title="Route" icon={CalendarDays} action={<Button type="button" onClick={addStop}><Plus className="mr-2 h-4 w-4" />Add stop</Button>}>
            <RouteStopTable stops={form.stops} onChange={updateStop} onRemove={removeStop} />
            <Field label="Route notes"><Textarea value={form.routeNotes} onChange={(event) => updateForm({ routeNotes: event.target.value })} /></Field>
          </Panel>
        )}

        {activeSection === "events" && (
          <Panel title="Events" icon={Plus}>
            <EntitySearchDrawer title="Attach existing events" placeholder="Search standalone or routed events..." query={eventQuery} onQueryChange={setEventQuery}>
              {isLoadingEvents ? (
                <p className="text-sm text-slate-400">Loading events...</p>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.slice(0, 12).map((event) => {
                    const attached = form.attachedEventIds.includes(event.id)
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => attachEvent(event.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-3 text-left hover:bg-slate-900"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{event.name}</p>
                          <p className="truncate text-xs text-slate-400">{event.event_date || "Date TBD"} - {event.venue_name || "Venue TBD"}</p>
                        </div>
                        <Badge variant={attached ? "default" : "outline"}>{attached ? "Attached" : "Attach"}</Badge>
                      </button>
                    )
                  })}
                </div>
              )}
            </EntitySearchDrawer>
          </Panel>
        )}

        {activeSection === "advancing" && (
          <Panel title="Advancing matrix" icon={ShieldCheck}>
            <AdvancingMatrix events={form.stops} onChange={(id, advance_status) => updateStop(id, { advance_status })} />
          </Panel>
        )}

        {activeSection === "itinerary" && (
          <Panel title="Itinerary" icon={FileText}>
            <ItineraryTimeline stops={form.stops} />
          </Panel>
        )}

        {activeSection === "daysheets" && (
          <Panel title="Day sheets" icon={ClipboardCheck}>
            <div className="grid gap-4 lg:grid-cols-2">
              {form.stops.map((stop) => (
                <DaySheetPreview
                  key={stop.id}
                  title={stop.name || "Tour stop day sheet"}
                  date={stop.date}
                  venue={stop.venue}
                  schedule={[
                    { label: "Travel", value: form.transportation },
                    { label: "Hotel", value: form.lodging },
                    { label: "Venue arrival", value: stop.time },
                    { label: "Show", value: stop.time },
                  ]}
                  notes={form.routeNotes}
                />
              ))}
            </div>
          </Panel>
        )}

        {activeSection === "people" && (
          <Panel title="People" icon={Users}>
            <div className="mb-3 flex flex-wrap gap-2">
              {tourId ? (
                <Button type="button" size="sm" variant="outline" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=team`)}>
                  Open Tour Team panel
                </Button>
              ) : null}
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Artists, crew, and roles"><Textarea value={form.people} onChange={(event) => updateForm({ people: event.target.value })} /></Field>
              <Field label="Vendors"><Textarea value={form.vendors} onChange={(event) => updateForm({ vendors: event.target.value })} /></Field>
              <Field label="Permissions"><Textarea value={form.permissions} onChange={(event) => updateForm({ permissions: event.target.value })} /></Field>
            </div>
          </Panel>
        )}

        {activeSection === "logistics" && (
          <Panel title="Logistics" icon={Truck}>
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Transportation"><Textarea value={form.transportation} onChange={(event) => updateForm({ transportation: event.target.value })} /></Field>
              <Field label="Hotels and lodging"><Textarea value={form.lodging} onChange={(event) => updateForm({ lodging: event.target.value })} /></Field>
              <Field label="Equipment"><Textarea value={form.equipment} onChange={(event) => updateForm({ equipment: event.target.value })} /></Field>
              <Field label="Freight"><Textarea value={form.freight} onChange={(event) => updateForm({ freight: event.target.value })} /></Field>
              <Field label="Supplies"><Textarea value={form.supplies} onChange={(event) => updateForm({ supplies: event.target.value })} /></Field>
              <Field label="Site maps notes">
                <Textarea value={form.siteMaps} onChange={(event) => updateForm({ siteMaps: event.target.value })} placeholder="Optional notes. Manage interactive site maps in Logistics." />
                <a
                  href="/admin/dashboard/logistics?tab=site-maps"
                  className="mt-2 inline-flex text-sm text-cyan-300 hover:text-cyan-200"
                >
                  Open logistics site maps
                </a>
              </Field>
            </div>
          </Panel>
        )}

        {activeSection === "finance" && (
          <Panel title="Finance" icon={Banknote}>
            <div className="grid gap-4 lg:grid-cols-4">
              <Field label="Budget"><Input value={form.budget} onChange={(event) => updateForm({ budget: event.target.value })} /></Field>
              <Field label="Guarantees"><Textarea value={form.guarantees} onChange={(event) => updateForm({ guarantees: event.target.value })} /></Field>
              <Field label="Settlements"><Textarea value={form.settlements} onChange={(event) => updateForm({ settlements: event.target.value })} /></Field>
              <Field label="Per diems"><Textarea value={form.perDiems} onChange={(event) => updateForm({ perDiems: event.target.value })} /></Field>
            </div>
          </Panel>
        )}

        {activeSection === "documents" && (
          <Panel title="Documents" icon={FolderOpen}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Documents"><Textarea value={form.documents} onChange={(event) => updateForm({ documents: event.target.value })} /></Field>
              <Field label="Credentials and passes"><Textarea value={form.credentials} onChange={(event) => updateForm({ credentials: event.target.value })} /></Field>
            </div>
          </Panel>
        )}

        {activeSection === "comms" && (
          <Panel title="Communications" icon={Megaphone}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Tour-wide announcements"><Textarea value={form.announcements} onChange={(event) => updateForm({ announcements: event.target.value })} /></Field>
              <Field label="Audit notes"><Textarea value={form.auditNotes} onChange={(event) => updateForm({ auditNotes: event.target.value })} /></Field>
            </div>
          </Panel>
        )}

        {activeSection === "review" && (
          <Panel title="Review" icon={ClipboardCheck}>
            <div className="grid gap-4 md:grid-cols-2">
              {readiness.items.map((item) => (
                <div key={item.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{item.label}</p>
                    <Badge variant="outline">{item.state.replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </BuilderShell>
    </div>
  )
}

function TourHandoffPanel() {
  const items = [
    { label: "Events", href: "/admin/dashboard/tours?focus=events", icon: Plus },
    { label: "Logistics", href: "/admin/dashboard/logistics", icon: Truck },
    { label: "Calendar", href: "/admin/dashboard/calendar", icon: CalendarDays },
    { label: "Finance", href: "/admin/dashboard/finances", icon: Banknote },
  ]

  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">After save</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <a key={item.label} href={item.href} className="flex min-h-10 items-center gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-2 text-xs text-slate-400 hover:bg-slate-900 hover:text-white">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </a>
          )
        })}
      </div>
    </div>
  )
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: React.ComponentType<{ className?: string }>; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-cyan-300" />
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        {action}
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
