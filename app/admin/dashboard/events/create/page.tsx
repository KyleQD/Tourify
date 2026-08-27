"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Banknote,
  CalendarClock,
  ClipboardCheck,
  FileText,
  MapPin,
  Music,
  Search,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from "lucide-react"

import {
  AutosaveBar,
  BuilderSection,
  BuilderShell,
  DaySheetPreview,
} from "@/components/admin/operations-builder/primitives"
import { artistEventUI } from "@/components/events/artist-event-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast as sonnerToast } from "sonner"
import { getEventReadiness, ReadinessState } from "@/lib/admin/operations-readiness"
import {
  EVENT_PRODUCER_READINESS_SECTIONS,
  EVENT_PRODUCER_SECTION_IDS,
  type EventProducerSectionId,
} from "@/lib/admin/event-producer-navigation"
import {
  buildEventProducerPayload,
  EventProducerFormState,
  hydrateEventProducerForm,
  initialEventProducerForm,
  ProducerSelection,
} from "@/lib/admin/event-producer-builder"
import { useBuilderAutosave } from "@/lib/admin/use-builder-autosave"
import { useActingContext } from "@/hooks/use-acting-context"
import { cn } from "@/lib/utils"

interface VenueOption {
  id: string
  name: string
  city?: string
  state?: string
  capacity?: number
  fullAddress?: string
  contact?: { email?: string; phone?: string; name?: string }
}

const sectionMetadata: Record<EventProducerSectionId, Omit<BuilderSection, "id">> = {
  basics: { label: "Basics", mode: "plan", icon: Music },
  schedule: { label: "Schedule", mode: "plan", icon: CalendarClock },
  venue: { label: "Venue", mode: "advance", icon: MapPin },
  advance: { label: "Advance packet", mode: "advance", icon: ClipboardCheck },
  team: { label: "Team", mode: "advance", icon: Users },
  vendors: { label: "Vendors", mode: "advance", icon: ShieldCheck },
  ticketing: { label: "Ticketing", mode: "review", icon: Ticket },
  finance: { label: "Finance", mode: "review", icon: Banknote },
  daysheet: { label: "Day sheet", mode: "run", icon: FileText },
  review: { label: "Review setup", mode: "review", icon: ClipboardCheck },
}

const sectionConfig: BuilderSection[] = EVENT_PRODUCER_SECTION_IDS.map((id) => ({ id, ...sectionMetadata[id] }))

const sectionDetails: Record<EventProducerSectionId, string> = {
  basics: "Name the event and define its publishing intent.",
  schedule: "Set the show date and essential day-of timing.",
  venue: "Attach the venue profile and confirm its contact details.",
  advance: "Capture production, hospitality, security, and promoter details.",
  team: "Stage artists, crew, and operational stakeholders.",
  vendors: "List vendors so artists and crew can reference outside partners.",
  ticketing: "Set ticket pricing, comps, and guest-list capacity.",
  finance: "Record expected revenue and settlement terms.",
  daysheet: "Add notes that carry into the event day sheet.",
  review: "Review the creation setup before opening the event workspace.",
}

const GUEST_LIST_SPOT_OPTIONS = Array.from({ length: 101 }, (_, index) => String(index))

const COMMON_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
]

const US_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
]

const CANADA_TIMEZONES = [
  "America/Toronto",
  "America/Vancouver",
  "America/Edmonton",
  "America/Winnipeg",
  "America/Halifax",
]

const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"))

const scheduleControlClass =
  "min-w-0 !h-11 sm:!h-12 !rounded-2xl !border-white/10 !bg-white/[0.065] !px-3 sm:!px-4 !text-sm sm:!text-base !font-semibold !text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_36px_rgba(2,6,23,0.22)] backdrop-blur-xl transition hover:!border-cyan-300/35 hover:!bg-white/[0.095] focus:!ring-2 focus:!ring-cyan-300/35 focus:!ring-offset-0 data-[state=open]:!border-cyan-300/45 data-[state=open]:!bg-white/[0.11]"

const scheduleMenuClass =
  "max-h-80 rounded-2xl border-white/10 bg-slate-950/95 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-2xl"

const scheduleItemClass =
  "rounded-xl text-slate-200 focus:bg-cyan-400/10 focus:text-cyan-100 data-[highlighted]:bg-cyan-400/10 data-[highlighted]:text-cyan-100"

function localDateString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDisplayDate(value: string) {
  const date = parseLocalDate(value)
  if (!date) return "Select date"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function parseTimeParts(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || "")
  if (!match) return { hour: "", minute: "00", period: "PM" }
  const hour24 = Number(match[1])
  const hour12 = hour24 % 12 || 12
  return {
    hour: String(hour12),
    minute: match[2],
    period: hour24 >= 12 ? "PM" : "AM",
  }
}

function toTwentyFourHour(hour: string, minute: string, period: string) {
  if (!hour || hour === "unset") return ""
  const hour12 = Number(hour)
  if (!Number.isFinite(hour12)) return ""
  const base = period === "AM" ? hour12 % 12 : (hour12 % 12) + 12
  return `${String(base).padStart(2, "0")}:${minute || "00"}`
}

function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles"
  } catch {
    return "America/Los_Angeles"
  }
}

function normalizeSelection(item: any, fallback = "Result"): ProducerSelection {
  const label = item?.name || item?.display_name || item?.label || fallback
  const meta = item?.specialty || item?.location || item?.email || item?.tier || item?.verificationStatus || ""
  return { id: String(item?.id || label), label, meta }
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
  const [timezones, setTimezones] = React.useState(COMMON_TIMEZONES)
  const skipAutosaveRef = React.useRef(true)
  const { actingHeaders, isActingReady } = useActingContext()

  React.useEffect(() => {
    // Wait until the acting account (and its headers) are resolved; otherwise the
    // request goes out without x-acting-* headers and the API cannot resolve the org.
    if (!isActingReady) return
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
        const response = await fetch(`/api/admin/events/${id}`, {
          credentials: "include",
          cache: "no-store",
          headers: { ...actingHeaders },
        })
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
    // actingHeaders identifies the acting org; re-run if the user switches accounts.
  }, [isActingReady, actingHeaders])

  React.useEffect(() => {
    const currentTimezone = browserTimezone()
    const supported =
      typeof (Intl as any).supportedValuesOf === "function"
        ? ((Intl as any).supportedValuesOf("timeZone") as string[])
        : COMMON_TIMEZONES
    setTimezones(Array.from(new Set([currentTimezone, ...COMMON_TIMEZONES, ...supported])).sort())
    if (!eventId && form.timezone === initialEventProducerForm.timezone && currentTimezone !== form.timezone) {
      setForm((current) => ({ ...current, timezone: currentTimezone }))
    }
  // Run once for new drafts; hydration will preserve a saved event timezone.
   
  }, [])

  React.useEffect(() => {
    // With the unified left-nav ("all" navigation), any configured section may be
    // active regardless of mode; only reset if the section id is unknown.
    if (!sectionConfig.some((section) => section.id === activeSection)) {
      setActiveSection(sectionConfig[0].id)
    }
  }, [activeSection])

  // Selecting a section in the unified nav also syncs its mode so readiness
  // navigation and mode-dependent UI stay consistent.
  const selectSection = React.useCallback((sectionId: string) => {
    const target = sectionConfig.find((section) => section.id === sectionId)
    if (target) setActiveMode(target.mode)
    setActiveSection(sectionId)
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

  const readiness = React.useMemo(() => getEventReadiness({
    title: form.title,
    date: form.date,
    time: form.time,
    venue_name: form.venueName,
    venue_id: form.venueId,
    venue_account_id: form.venueAccountId,
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
    team_count: form.selectedArtists.length + form.selectedCrew.length,
    vendor_count: form.selectedVendors.length,
    has_logistics: false,
    has_site_map: false,
    has_documents: false,
    has_comms: false,
    day_sheet_notes: form.daySheetNotes,
  }), [form])

  const sections = React.useMemo(() => sectionConfig.map((section) => {
    const id = section.id as EventProducerSectionId
    const matchingItem = readiness.items.find((item) => EVENT_PRODUCER_READINESS_SECTIONS[item.id] === id)
    const hasTeam = form.selectedArtists.length + form.selectedCrew.length > 0
    const hasTicketing = Boolean(
      form.ticketPrice.trim()
      || form.vipPrice.trim()
      || form.comps.trim()
      || Number(form.guestListSpots) > 0,
    )
    const hasExpectedRevenue = Boolean(form.expectedRevenue.trim())
    const hasSettlementTerms = Boolean(form.settlementTerms.trim())

    let status = matchingItem?.state as ReadinessState | undefined
    if (id === "team") status = hasTeam ? "ready" : "needs_advance"
    if (id === "vendors") status = form.selectedVendors.length > 0 ? "ready" : "needs_advance"
    if (id === "ticketing") {
      status = form.ticketingSetup === "not_ticketed" || form.ticketingSetup === "explicit_setup"
        ? "ready"
        : hasTicketing ? "in_progress" : "needs_advance"
    }
    if (id === "finance") {
      status = hasExpectedRevenue && hasSettlementTerms
        ? "ready"
        : hasExpectedRevenue || hasSettlementTerms ? "in_progress" : "needs_advance"
    }
    if (id === "review") status = readiness.blockers.length === 0 ? "ready" : "missing"

    return { ...section, status }
  }), [form, readiness.blockers.length, readiness.items])

  const selectVenue = (venue: VenueOption) => {
    updateForm({
      venueAccountId: venue.id,
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
    if (!hasDate && redirect) {
      if (!silent) {
        sonnerToast.error("Schedule required", { description: "Add a date before saving the event." })
        setActiveMode("plan")
        setActiveSection("schedule")
      }
      return null
    }
    setIsSaving(true)
    setSaveStatus("saving")
    try {
      const draftForm = form.date
        ? form
        : { ...form, date: new Date().toISOString().slice(0, 10) }
      const payload = buildEventProducerPayload(draftForm, { publish: false, readinessScore: readiness.score })
      if (!form.date) {
        // Placeholder schedule for title-first draft create; user still needs to set the real date.
        ;(payload as any).settings = {
          ...((payload as any).settings || {}),
          schedule_placeholder: true,
        }
      }
      const response = await fetch(eventId ? `/api/admin/events/${eventId}` : "/api/admin/events", {
        method: eventId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...actingHeaders },
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

      setSaveStatus("saved")
      if (!silent) {
        sonnerToast.success(redirect ? "Event created" : "Event draft saved", {
          description: redirect
            ? "Opening the management workspace for the next setup step."
            : "Your changes are saved.",
        })
      }

      if (redirect && savedId) {
        router.push(`/admin/dashboard/events/${savedId}`)
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
  }, [actingHeaders, eventId, form, readiness.score, router])

  const createEvent = async () => {
    await persistEvent({ redirect: true })
  }

  const saveDraft = async () => {
    await persistEvent({ redirect: false })
  }

  // Create-on-first-change: enable autosave once title/date exists (creates draft if needed)
  React.useEffect(() => {
    if (isHydrating) return
    if (form.title?.trim() || form.date) setAutosaveReady(true)
  }, [form.title, form.date, isHydrating])

  useBuilderAutosave({
    enabled: !isHydrating && isActingReady && autosaveReady && Boolean(form.title?.trim() || form.date),
    delayMs: 1600,
    deps: [form],
    onSave: async () => {
      if (skipAutosaveRef.current || isSaving) return
      if (!form.title?.trim() && !form.date) return
      await persistEvent({ redirect: false, silent: true })
    },
  })

  // Unified left-nav shows every section; pass the full, readiness-annotated list.
  const activeSections = sections

  if (isHydrating) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-4 py-6 text-slate-300">
        Resuming event draft…
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-[1600px] px-4 py-6">
      <BuilderShell
        title="Event Producer Console"
        subtitle="Build the event through focused sections for schedule, venue, advance, team, ticketing, and finance."
        badge={eventId ? "Editing draft" : "New event"}
        sections={activeSections}
        activeSection={activeSection}
        onSectionChange={selectSection}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        navigationMode="all"
        readiness={readiness}
        summary={null}
        showAside={false}
        bottomBar={
          <AutosaveBar
            status={saveStatus}
            entityLabel="Event"
            primaryLabel="Create event"
            secondaryLabel="Save draft"
            onPrimary={() => void createEvent()}
            onSecondary={() => void saveDraft()}
            disabled={isSaving}
          />
        }
      >
        {activeSection === "basics" && (
          <BuilderPanel title="Basics" icon={Music}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field id="event-title" label="Event title"><Input id="event-title" value={form.title} onChange={(event) => updateForm({ title: event.target.value })} placeholder="Opening night at The Fonda" /></Field>
              <Field id="producer-intent" label="Producer intent">
                <Select value={form.producerIntent} onValueChange={(producerIntent) => updateForm({ producerIntent })}>
                  <SelectTrigger id="producer-intent"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_event">Single event</SelectItem>
                    <SelectItem value="tour_stop">Tour stop</SelectItem>
                    <SelectItem value="festival">Festival or multi-act</SelectItem>
                    <SelectItem value="private_event">Private event</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="event-status" label="Status">
                <Select value={form.status} onValueChange={(status) => updateForm({ status })}>
                  <SelectTrigger id="event-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="postponed">Postponed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="event-visibility" label="Visibility">
                <Select value={form.visibility} onValueChange={(visibility) => updateForm({ visibility })}>
                  <SelectTrigger id="event-visibility"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="team">Team only</SelectItem>
                    <SelectItem value="public">Public when published</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field id="event-type" label="Type"><Input id="event-type" value={form.type} onChange={(event) => updateForm({ type: event.target.value })} placeholder="Live, festival, private, hold" /></Field>
              <Field id="event-tags" label="Tags"><Input id="event-tags" value={form.tags} onChange={(event) => updateForm({ tags: event.target.value })} placeholder="festival, west coast, radio" /></Field>
              <div className="lg:col-span-2">
                <Field id="event-description" label="Description"><Textarea id="event-description" value={form.description} onChange={(event) => updateForm({ description: event.target.value })} className="min-h-24" /></Field>
              </div>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "schedule" && (
          <BuilderPanel title="Schedule" icon={CalendarClock}>
            <div className="grid min-w-0 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,17rem),1fr))] sm:gap-5">
              <Field id="schedule-date" label="Date">
                <DatePickerField id="schedule-date" value={form.date} onChange={(date) => updateForm({ date })} />
              </Field>
              <Field id="schedule-show-hour" label="Show">
                <TimeDropdown id="schedule-show" label="Show" value={form.time} onChange={(time) => updateForm({ time })} />
              </Field>
              <Field id="schedule-end-hour" label="End">
                <TimeDropdown id="schedule-end" label="End" value={form.endTime} onChange={(endTime) => updateForm({ endTime })} />
              </Field>
              <Field id="schedule-timezone" label="Timezone">
                <Select value={form.timezone || browserTimezone()} onValueChange={(timezone) => updateForm({ timezone })}>
                  <SelectTrigger id="schedule-timezone" className={scheduleControlClass}><SelectValue placeholder="Select timezone" /></SelectTrigger>
                  <SelectContent className={scheduleMenuClass}>
                    {timezones.map((timezone) => (
                      <SelectItem key={timezone} value={timezone} className={scheduleItemClass}>{timezone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="schedule-doors-hour" label="Doors">
                <TimeDropdown id="schedule-doors" label="Doors" value={form.doorsOpen} onChange={(doorsOpen) => updateForm({ doorsOpen })} />
              </Field>
              <Field id="schedule-load-in-hour" label="Load-in">
                <TimeDropdown id="schedule-load-in" label="Load-in" value={form.loadIn} onChange={(loadIn) => updateForm({ loadIn })} />
              </Field>
              <Field id="schedule-soundcheck-hour" label="Soundcheck">
                <TimeDropdown id="schedule-soundcheck" label="Soundcheck" value={form.soundCheck} onChange={(soundCheck) => updateForm({ soundCheck })} />
              </Field>
              <Field id="schedule-curfew-hour" label="Curfew">
                <TimeDropdown id="schedule-curfew" label="Curfew" value={form.curfew} onChange={(curfew) => updateForm({ curfew })} />
              </Field>
              <div className="min-w-0 [grid-column:1/-1]">
                <Field id="schedule-set-times" label="Set times"><Textarea id="schedule-set-times" value={form.setTimes} onChange={(event) => updateForm({ setTimes: event.target.value })} placeholder="Support 8:00 PM, Headliner 9:15 PM" /></Field>
              </div>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "venue" && (
          <BuilderPanel title="Venue" icon={MapPin}>
            <div className="space-y-4">
              <Field id="venue-search" label="Search venues">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input id="venue-search" value={venueQuery} onChange={(event) => setVenueQuery(event.target.value)} className="pl-9" placeholder="Venue name, city, or market" />
                </div>
              </Field>
              <ResultList loading={isVenueLoading} emptyLabel="Search venues to fill event details.">
                {venueResults.map((venue) => (
                  <button key={venue.id} type="button" onClick={() => selectVenue(venue)} className={cn(artistEventUI.inset, artistEventUI.interactive, "flex w-full items-center justify-between gap-3 p-3 text-left")}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{venue.name}</p>
                      <p className="truncate text-xs text-slate-400">{[venue.city, venue.state, venue.capacity ? `${venue.capacity} cap` : ""].filter(Boolean).join(" - ")}</p>
                    </div>
                    <Badge variant="outline">Use</Badge>
                  </button>
                ))}
              </ResultList>
              <div className="grid gap-4 lg:grid-cols-2">
                <Field id="venue-name" label="Venue name"><Input id="venue-name" value={form.venueName} onChange={(event) => updateForm({ venueName: event.target.value })} /></Field>
                <Field id="venue-room" label="Room"><Input id="venue-room" value={form.room} onChange={(event) => updateForm({ room: event.target.value })} placeholder="Main room" /></Field>
                <Field id="venue-capacity" label="Capacity"><Input id="venue-capacity" inputMode="numeric" value={form.capacity} onChange={(event) => updateForm({ capacity: event.target.value })} /></Field>
                <Field id="venue-address" label="Address"><Input id="venue-address" value={form.address} onChange={(event) => updateForm({ address: event.target.value })} /></Field>
                <Field id="venue-contact" label="Venue contact"><Input id="venue-contact" value={form.venueContactName} onChange={(event) => updateForm({ venueContactName: event.target.value })} placeholder="Name" /></Field>
                <Field id="venue-contact-email" label="Contact email"><Input id="venue-contact-email" type="email" value={form.venueContactEmail} onChange={(event) => updateForm({ venueContactEmail: event.target.value })} /></Field>
                <Field id="venue-contact-phone" label="Contact phone"><Input id="venue-contact-phone" type="tel" value={form.venueContactPhone} onChange={(event) => updateForm({ venueContactPhone: event.target.value })} /></Field>
              </div>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "advance" && (
          <BuilderPanel title="Advance packet" icon={ClipboardCheck}>
            <SetupCard title="Packet readiness" items={[
              { label: "Production", ready: Boolean(form.technicalRider) },
              { label: "Hospitality", ready: Boolean(form.hospitalityRider) },
              { label: "Security", ready: Boolean(form.securityNotes) },
              { label: "Promoter", ready: Boolean(form.promoterName || form.promoterEmail) },
            ]} />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Field id="advance-technical-rider" label="Technical rider"><Textarea id="advance-technical-rider" value={form.technicalRider} onChange={(event) => updateForm({ technicalRider: event.target.value })} /></Field>
              <Field id="advance-hospitality-rider" label="Hospitality rider"><Textarea id="advance-hospitality-rider" value={form.hospitalityRider} onChange={(event) => updateForm({ hospitalityRider: event.target.value })} /></Field>
              <Field id="advance-security-notes" label="Security notes"><Textarea id="advance-security-notes" value={form.securityNotes} onChange={(event) => updateForm({ securityNotes: event.target.value })} /></Field>
              <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
                <Field id="advance-promoter-name" label="Promoter name"><Input id="advance-promoter-name" value={form.promoterName} onChange={(event) => updateForm({ promoterName: event.target.value })} /></Field>
                <Field id="advance-promoter-email" label="Promoter email"><Input id="advance-promoter-email" type="email" value={form.promoterEmail} onChange={(event) => updateForm({ promoterEmail: event.target.value })} /></Field>
                <Field id="advance-promoter-phone" label="Promoter phone"><Input id="advance-promoter-phone" type="tel" value={form.promoterPhone} onChange={(event) => updateForm({ promoterPhone: event.target.value })} /></Field>
              </div>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "team" && (
          <BuilderPanel title="Team" icon={Users}>
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
              <div className="lg:col-span-2">
                <Field id="team-stakeholders" label="Stakeholders"><Textarea id="team-stakeholders" value={form.stakeholders} onChange={(event) => updateForm({ stakeholders: event.target.value })} placeholder="Manager, promoter, venue lead, production lead" /></Field>
              </div>
              <VendorReference items={form.selectedVendors} onManage={() => selectSection("vendors")} />
            </div>
          </BuilderPanel>
        )}

        {activeSection === "vendors" && (
          <BuilderPanel title="Vendors" icon={ShieldCheck}>
            <p className="mb-4 text-sm leading-6 text-slate-400">Add outside partners once here. They appear as reference context for the event team.</p>
            <Field id="vendor-name" label="Vendor name">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input id="vendor-name" value={vendorDraft} onChange={(event) => setVendorDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addVendorDraft() } }} placeholder="Security, backline, catering..." />
                <Button type="button" variant="outline" className={artistEventUI.buttonOutline} onClick={addVendorDraft}>Add vendor</Button>
              </div>
            </Field>
            <div className={cn(artistEventUI.inset, "mt-4 p-4")}>
              <p className="mb-3 text-sm font-medium text-slate-200">Selected vendors</p>
              <SelectedPills items={form.selectedVendors} onRemove={(id) => removeSelection("selectedVendors", id)} />
            </div>
          </BuilderPanel>
        )}

        {activeSection === "ticketing" && (
          <BuilderPanel title="Ticketing" icon={Ticket}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field id="ticket-price" label="Ticket price"><Input id="ticket-price" inputMode="decimal" value={form.ticketPrice} onChange={(event) => updateForm({ ticketPrice: event.target.value })} placeholder="$0" /></Field>
              <Field id="vip-price" label="VIP price"><Input id="vip-price" inputMode="decimal" value={form.vipPrice} onChange={(event) => updateForm({ vipPrice: event.target.value })} placeholder="$0" /></Field>
              <Field id="ticket-comps" label="Comps"><Input id="ticket-comps" inputMode="numeric" value={form.comps} onChange={(event) => updateForm({ comps: event.target.value })} placeholder="0" /></Field>
              <Field id="guest-list-spots" label="Guest list spots">
                <Select value={form.guestListSpots} onValueChange={(guestListSpots) => updateForm({ guestListSpots })}>
                  <SelectTrigger id="guest-list-spots"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {GUEST_LIST_SPOT_OPTIONS.map((spots) => <SelectItem key={spots} value={spots}>{spots}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "finance" && (
          <BuilderPanel title="Finance" icon={Banknote}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field id="expected-revenue" label="Expected revenue"><Input id="expected-revenue" inputMode="decimal" value={form.expectedRevenue} onChange={(event) => updateForm({ expectedRevenue: event.target.value })} placeholder="$0" /></Field>
              <Field id="settlement-terms" label="Settlement terms"><Textarea id="settlement-terms" value={form.settlementTerms} onChange={(event) => updateForm({ settlementTerms: event.target.value })} placeholder="Guarantee, split, deposit, settlement timing..." /></Field>
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
            <Field id="day-sheet-notes" label="Day sheet notes"><Textarea id="day-sheet-notes" value={form.daySheetNotes} onChange={(event) => updateForm({ daySheetNotes: event.target.value })} /></Field>
          </BuilderPanel>
        )}

        {activeSection === "review" && (
          <BuilderPanel title="Review setup" icon={ClipboardCheck}>
            <div className="grid gap-4 md:grid-cols-2">
              {sections.filter((section) => section.id !== "review").map((section) => (
                <button key={section.id} type="button" onClick={() => selectSection(section.id)} className={cn(artistEventUI.inset, artistEventUI.interactive, "p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-white">{section.label}</p>
                    <Badge variant="outline">{(section.status || "in_progress").replace("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{sectionDetails[section.id as EventProducerSectionId]}</p>
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
    <section className={artistEventUI.panelPadded}>
      <div className="mb-5 flex items-center gap-3">
        <span className={cn(artistEventUI.iconWell, "h-9 w-9")}><Icon className="h-4.5 w-4.5" /></span>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label id={`${id}-label`} htmlFor={id} className="text-sm font-medium text-slate-300">{label}</Label>
      <div className="min-w-0 [&_input]:rounded-xl [&_input]:border-slate-700/70 [&_input]:bg-slate-900/80 [&_input]:text-white [&_input]:placeholder:text-slate-500 [&_textarea]:rounded-xl [&_textarea]:border-slate-700/70 [&_textarea]:bg-slate-900/80 [&_textarea]:text-white [&_textarea]:placeholder:text-slate-500 [&_button[role=combobox]]:rounded-xl [&_button[role=combobox]]:border-slate-700/70 [&_button[role=combobox]]:bg-slate-900/80 [&_button[role=combobox]]:text-white">
        {children}
      </div>
    </div>
  )
}

function DatePickerField({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  const selected = parseLocalDate(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={`${scheduleControlClass} w-full justify-start text-left`}
        >
          <CalendarClock className="mr-2 h-4 w-4 shrink-0 text-cyan-200" />
          <span className="min-w-0 truncate">{formatDisplayDate(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border-white/10 bg-slate-950/95 p-2 text-slate-100 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) onChange(localDateString(date))
          }}
          className="rounded-2xl bg-white/[0.03]"
          classNames={{
            caption_label: "text-sm font-semibold text-slate-100",
            nav_button: "h-8 w-8 rounded-full bg-white/[0.06] p-0 text-slate-200 opacity-80 hover:bg-cyan-400/15 hover:text-cyan-100 hover:opacity-100",
            head_cell: "w-9 rounded-md text-[0.75rem] font-medium text-slate-500",
            cell: "h-9 w-9 p-0 text-center text-sm",
            day: "h-9 w-9 rounded-full p-0 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white focus:bg-cyan-400/15 focus:text-cyan-100",
            day_selected: "bg-cyan-400 text-slate-950 hover:bg-cyan-300 hover:text-slate-950 focus:bg-cyan-300 focus:text-slate-950",
            day_today: "bg-white/10 text-cyan-100",
            day_outside: "text-slate-600 opacity-60",
            day_disabled: "text-slate-700 opacity-50",
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

function TimeDropdown({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  const parts = parseTimeParts(value)
  const update = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch }
    onChange(toTwentyFourHour(next.hour, next.minute, next.period))
  }

  return (
    <div className="grid min-w-0 grid-cols-3 gap-2" role="group" aria-labelledby={`${id}-hour-label`}>
      <Select value={parts.hour || "unset"} onValueChange={(hour) => update({ hour })}>
        <SelectTrigger id={`${id}-hour`} aria-label={`${label} hour`} className={scheduleControlClass}>
          <SelectValue placeholder="Hour" />
        </SelectTrigger>
        <SelectContent className={scheduleMenuClass}>
          <SelectItem value="unset" className={scheduleItemClass}>--</SelectItem>
          {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((hour) => (
            <SelectItem key={hour} value={hour} className={scheduleItemClass}>{hour}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={parts.minute} onValueChange={(minute) => update({ minute })}>
        <SelectTrigger id={`${id}-minute`} aria-label={`${label} minute`} className={scheduleControlClass}>
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className={scheduleMenuClass}>
          {MINUTE_OPTIONS.map((minute) => (
            <SelectItem key={minute} value={minute} className={scheduleItemClass}>{minute}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={parts.period} onValueChange={(period) => update({ period })}>
        <SelectTrigger id={`${id}-period`} aria-label={`${label} AM or PM`} className={scheduleControlClass}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={scheduleMenuClass}>
          <SelectItem value="AM" className={scheduleItemClass}>AM</SelectItem>
          <SelectItem value="PM" className={scheduleItemClass}>PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ResultList({ loading, emptyLabel, children }: { loading: boolean; emptyLabel: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0
  return (
    <div className={cn(artistEventUI.inset, "max-h-64 space-y-2 overflow-y-auto p-2")}>
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
  const searchId = `${label.toLowerCase().replace(/\s+/g, "-")}-search`
  return (
    <div className="space-y-3">
      <Field id={searchId} label={label}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input id={searchId} value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-9" placeholder={`Search ${label.toLowerCase()}`} />
        </div>
      </Field>
      <ResultList loading={loading} emptyLabel={`Search ${label.toLowerCase()} to stage setup context.`}>
        {results.map((item) => (
          <button key={item.id} type="button" onClick={() => onSelect(item)} className={cn(artistEventUI.inset, artistEventUI.interactive, "flex w-full items-center justify-between gap-3 p-3 text-left")}>
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
        <span key={item.id} className="inline-flex max-w-full items-center gap-1.5 rounded-xl border border-slate-700/70 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-200">
          <span className="truncate">{item.label}</span>
          <button type="button" onClick={() => onRemove(item.id)} className="text-slate-500 hover:text-red-300" aria-label={`Remove ${item.label}`}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  )
}

function VendorReference({ items, onManage }: { items: ProducerSelection[]; onManage: () => void }) {
  return (
    <div className={cn(artistEventUI.inset, "lg:col-span-2 p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">Vendor reference</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Visible here as context for artists and crew; edit vendors in their own section.</p>
        </div>
        <Button type="button" variant="outline" size="sm" className={artistEventUI.buttonOutline} onClick={onManage}>Manage vendors</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.length > 0
          ? items.map((item) => <Badge key={item.id} variant="outline" className="rounded-lg border-slate-700 bg-slate-900/80 text-slate-300">{item.label}</Badge>)
          : <p className="text-xs text-slate-500">No vendors listed yet.</p>}
      </div>
    </div>
  )
}

function SetupCard({ title, items }: { title: string; items: Array<{ label: string; ready: boolean }> }) {
  return (
    <div className={cn(artistEventUI.inset, "p-4")}>
      <p className="text-sm font-medium text-white">{title}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/45 px-3 py-2 text-sm">
            <span className="text-slate-400">{item.label}</span>
            <span className={cn("text-xs font-medium", item.ready ? "text-emerald-300" : "text-slate-600")}>{item.ready ? "Ready" : "Open"}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
