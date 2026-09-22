"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Loader2,
  MapPin,
  Megaphone,
  Music,
  Plus,
  Route,
  ShieldCheck,
  Truck,
  Users,
  X,
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
import { moveStopByDelta, reorderStopsByIndex } from "@/lib/admin/tour-stop-ordinals"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { TourReconcilePreview } from "@/lib/admin/tour-reconcile-preview"
import { toast as sonnerToast } from "sonner"
import { getTourReadiness, ReadinessState } from "@/lib/admin/operations-readiness"
import {
  applyTourPlanToForm,
  buildTourBuilderPayload,
  buildTourPlanPayload,
  hydrateTourBuilderForm,
  initialTourBuilderForm,
  makeTourStop,
  type TourBuilderFormState,
} from "@/lib/admin/tour-builder"
import { summarizeTourPlanConflictDiff } from "@/lib/admin/tour-plan-diff"
import { EntityAccountPicker, type EntityAccountSelection } from "@/components/admin/operations-builder/entity-account-picker"
import { useBuilderAutosave } from "@/lib/admin/use-builder-autosave"
import { useActingContext } from "@/hooks/use-acting-context"
import { buildAdminLogisticsHref, buildAdminSiteMapHref } from "@/lib/admin/admin-ops-context"
import { artistEventUI } from "@/components/events/artist-event-ui"
import { cn } from "@/lib/utils"
import {
  TourQuickStartWizard,
  type TourQuickStartState,
} from "@/components/admin/tours/tour-quick-start-wizard"

interface ExistingEventOption {
  id: string
  name: string
  event_date?: string
  venue_name?: string
  tours?: Array<{ id: string; name: string }>
}

const sectionConfig: BuilderSection[] = [
  { id: "overview", label: "Overview", mode: "plan", icon: Route },
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
  route: "overview",
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
  const { actingHeaders, isActingReady } = useActingContext()
  const adminRequest = React.useCallback((input?: RequestInit): RequestInit => ({
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: {
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }), [actingHeaders])
  const [form, setForm] = React.useState<TourBuilderFormState>(() => ({ ...initialTourBuilderForm, stops: [makeTourStop()] }))
  const [tourId, setTourId] = React.useState<string | null>(null)
  const [quickStartState, setQuickStartState] = React.useState<TourQuickStartState | null>(null)
  const [isHydrating, setIsHydrating] = React.useState(true)
  const [autosaveReady, setAutosaveReady] = React.useState(false)
  const skipAutosaveRef = React.useRef(true)
  const [activeMode, setActiveMode] = React.useState<BuilderSection["mode"]>("plan")
  const [activeSection, setActiveSection] = React.useState("overview")
  const [saveStatus, setSaveStatus] = React.useState<"saved" | "saving" | "unsaved" | "error">("unsaved")
  const [isSaving, setIsSaving] = React.useState(false)
  const [inlineEventMode, setInlineEventMode] = React.useState<"create" | "attach">("create")
  const [inlineEventForm, setInlineEventForm] = React.useState({
    title: "",
    date: "",
    time: "19:00",
    doorsOpen: "18:30",
    venueName: "",
    city: "",
    state: "",
    country: "USA",
    type: "concert",
  })
  const [isCreatingEvent, setIsCreatingEvent] = React.useState(false)
  const [createdEvents, setCreatedEvents] = React.useState<Array<{ id: string; name: string; date: string; venue: string }>>([])
  const [eventQuery, setEventQuery] = React.useState("")
  const [events, setEvents] = React.useState<ExistingEventOption[]>([])
  const [isLoadingEvents, setIsLoadingEvents] = React.useState(false)
  const [reconcilePreview, setReconcilePreview] = React.useState<TourReconcilePreview | null>(null)
  const [pendingSave, setPendingSave] = React.useState<{
    publish: boolean
    redirect: boolean
    silent: boolean
  } | null>(null)
  const confirmedReconcileRef = React.useRef(false)

  React.useEffect(() => {
    if (!isActingReady) return
    const params = new URLSearchParams(window.location.search)
    const id = params.get("draft") || params.get("id")
    if (!id) {
      setQuickStartState({ state: "new", step: 1, eventCount: 1, batchId: null })
      setIsHydrating(false)
      return
    }
    let cancelled = false
    async function hydrate() {
      setIsHydrating(true)
      try {
        const [tourRes, planRes, eventsRes] = await Promise.all([
          fetch(`/api/admin/tours/${id}`, adminRequest()),
          fetch(`/api/admin/tours/${id}/plan`, adminRequest()),
          fetch(`/api/admin/tours/${id}/events`, adminRequest()),
        ])
        const tourData = await tourRes.json().catch(() => ({}))
        const planData = await planRes.json().catch(() => ({}))
        const eventsData = await eventsRes.json().catch(() => ({}))
        if (!tourRes.ok) throw new Error(tourData?.error || "Failed to load draft")
        if (cancelled) return
        const linked = eventsData.events || tourData.tour?.events || []
        setTourId(String(tourData.tour?.id || id))
        const quickStart = tourData.tour?.settings?.quick_start
        if (quickStart && typeof quickStart === "object" && quickStart.state !== "complete") {
          const storedState = quickStart.state === "events_created" ? "events_created" : "named"
          const storedStep = storedState === "events_created" ? 3 : 2
          setQuickStartState({
            state: storedState,
            step: storedStep,
            eventCount: Math.max(1, Math.min(50, Number(quickStart.event_count) || 1)),
            batchId: typeof quickStart.batch_id === "string" ? quickStart.batch_id : null,
          })
        } else {
          setQuickStartState(null)
        }
        const hydrated = hydrateTourBuilderForm(
          {
            ...(tourData.tour || {}),
            plan_version: planData.plan?.planVersion ?? tourData.tour?.plan_version,
          },
          linked,
        )
        if (planData.plan?.stops?.length) {
          hydrated.stops = planData.plan.stops.map((stop: any, index: number) => ({
            id: String(stop.event_id || `stop-${index}`),
            name: stop.name || "",
            venue: stop.venue || "",
            date: stop.date || "",
            time: stop.time || "",
            market: stop.market || "",
            leg_name: stop.leg_name || "",
            capacity: stop.capacity != null ? String(stop.capacity) : "",
            advance_status: stop.advance_status || "not_started",
          }))
          hydrated.attachedEventIds = planData.plan.stops
            .map((stop: any) => stop.event_id)
            .filter(Boolean)
          hydrated.planVersion = planData.plan.planVersion || hydrated.planVersion
          hydrated.routeNotes = planData.plan.route_notes || hydrated.routeNotes
        }
        setForm(hydrated)
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
  }, [adminRequest, isActingReady])

  React.useEffect(() => {
    const sectionsForMode = sectionConfig.filter((section) => section.mode === activeMode)
    if (sectionsForMode.length && !sectionsForMode.some((section) => section.id === activeSection)) {
      setActiveSection(sectionsForMode[0].id)
    }
  }, [activeMode, activeSection])

  React.useEffect(() => {
    if (!isActingReady) return
    let cancelled = false
    async function loadEvents() {
      setIsLoadingEvents(true)
      try {
        const response = await fetch("/api/admin/events", adminRequest())
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
  }, [adminRequest, isActingReady])

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
    setForm((current) => ({
      ...current,
      stops: current.stops.filter((stop) => stop.id !== id),
      attachedEventIds: current.attachedEventIds.filter((eventId) => eventId !== id),
    }))
    setSaveStatus("unsaved")
  }

  const reorderStops = (fromIndex: number, toIndex: number) => {
    setForm((current) => ({
      ...current,
      stops: reorderStopsByIndex({ stops: current.stops, fromIndex, toIndex }),
    }))
    setSaveStatus("unsaved")
  }

  const moveStop = (id: string, delta: -1 | 1) => {
    setForm((current) => ({
      ...current,
      stops: moveStopByDelta({ stops: current.stops, stopId: id, delta }),
    }))
    setSaveStatus("unsaved")
  }

  const addStop = () => updateForm({ stops: [...form.stops, makeTourStop()] })

  const attachEvent = (eventId: string) => {
    if (form.attachedEventIds.includes(eventId)) return
    const event = events.find((candidate) => candidate.id === eventId)
    const nextStop: RouteStopDraft | null = event
      ? {
          id: event.id,
          name: event.name,
          venue: event.venue_name || "",
          date: event.event_date ? event.event_date.slice(0, 10) : "",
          time: event.event_date?.includes("T") ? event.event_date.slice(11, 16) : "",
          market: "",
          leg_name: "",
          capacity: "",
          advance_status: "not_started",
        }
      : null
    updateForm({
      attachedEventIds: [...form.attachedEventIds, eventId],
      stops: nextStop && !form.stops.some((stop) => stop.id === eventId)
        ? [...form.stops.filter((stop) => stop.name || stop.venue || stop.date), nextStop]
        : form.stops,
    })
  }

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
    const matchingItem = readiness.items.find((item) => item.id === section.id)
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
    if (!isActingReady) return null
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
      let savedId = tourId || ""
      if (!tourId) {
        // Create shell tour, then write the canonical plan (PLAN-101).
        const createPayload = buildTourBuilderPayload(form, { publish, readinessScore: readiness.score })
        const createRes = await fetch("/api/admin/tours", {
          ...adminRequest({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: createPayload.name,
              description: createPayload.description,
              status: createPayload.status,
              start_date: createPayload.start_date,
              end_date: createPayload.end_date,
              main_artist: createPayload.main_artist,
              artist_id: createPayload.artist_id,
              markets: createPayload.markets,
              settings: createPayload.settings,
            }),
          }),
        })
        const createData = await createRes.json().catch(() => ({}))
        if (!createRes.ok) throw new Error(createData?.error || "Failed to create tour")
        savedId = String(createData.tour?.id || "")
        if (!savedId) throw new Error("Create tour did not return an id")
        setTourId(savedId)
        const url = new URL(window.location.href)
        url.searchParams.set("draft", savedId)
        window.history.replaceState({}, "", url.toString())
        skipAutosaveRef.current = false
        setAutosaveReady(true)
      }

      const planPayload = buildTourPlanPayload(form, { readinessScore: readiness.score })

      // PLAN-104 — preview destructive consequences before write (skip when already confirmed).
      if (!confirmedReconcileRef.current) {
        const previewRes = await fetch(`/api/admin/tours/${savedId}/plan/reconcile-preview`, {
          ...adminRequest({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reconcileMode: planPayload.reconcileMode,
              stops: planPayload.stops,
            }),
          }),
        })
        const previewData = await previewRes.json().catch(() => ({}))
        if (previewRes.ok && previewData.preview?.requiresConfirmation) {
          if (previewData.preview.protectedConflicts?.length) {
            setSaveStatus("error")
            if (!silent) {
              sonnerToast.error("Protected stops block this save", {
                description: previewData.preview.protectedConflicts
                  .map((row: { reason: string }) => row.reason)
                  .join(" "),
              })
            }
            return null
          }
          if (silent) {
            // Autosave must never silently apply detach/date/venue impacts.
            setSaveStatus("unsaved")
            return null
          }
          setReconcilePreview(previewData.preview)
          setPendingSave({ publish, redirect, silent })
          setIsSaving(false)
          return null
        }
      }
      confirmedReconcileRef.current = false

      const response = await fetch(`/api/admin/tours/${savedId}/plan`, {
        ...adminRequest({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(planPayload),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (data?.code === "version_conflict") {
          // PLAN-102: never silently overwrite — adopt server plan + surface safe diff.
          if (data.plan) {
            skipAutosaveRef.current = true
            setForm((prev) => applyTourPlanToForm(prev, data.plan))
            window.setTimeout(() => {
              skipAutosaveRef.current = false
            }, 800)
          }
          const summary = data.diff
            ? summarizeTourPlanConflictDiff(data.diff)
            : data?.error || "Plan was updated elsewhere. Local edits were not saved."
          setSaveStatus("error")
          if (!silent) {
            sonnerToast.error("Version conflict", { description: summary })
          }
          return null
        }
        throw new Error(data?.error || "Failed to save tour plan")
      }

      if (data.plan) {
        setForm((prev) => applyTourPlanToForm(prev, data.plan))
      }

      if (publish && savedId) {
        const publishRes = await fetch(
          `/api/admin/tours/${savedId}/publish`,
          adminRequest({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": `tour.publish:${savedId}:${crypto.randomUUID()}`,
            },
            body: JSON.stringify({}),
          }),
        )
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
  }, [adminRequest, form, isActingReady, readiness.blockers, readiness.score, router, tourId])

  const resetInlineEventForm = React.useCallback(() => {
    setInlineEventForm({
      title: "",
      date: "",
      time: "19:00",
      doorsOpen: "18:30",
      venueName: "",
      city: "",
      state: "",
      country: "USA",
      type: "concert",
    })
  }, [])

  const createInlineEvent = React.useCallback(async () => {
    if (!inlineEventForm.title.trim()) {
      sonnerToast.error("Event title required")
      return
    }
    if (!inlineEventForm.date) {
      sonnerToast.error("Event date required")
      return
    }

    setIsCreatingEvent(true)
    try {
      // Ensure tour is saved first — silently auto-save if no tourId yet
      let activeTourId = tourId
      if (!activeTourId) {
        const savedId = await persistTour(false, { redirect: false, silent: true })
        if (!savedId) {
          sonnerToast.error("Save the tour draft first", {
            description: "Enter a tour name and save before creating events.",
          })
          setIsCreatingEvent(false)
          return
        }
        activeTourId = savedId
      }

      const payload = {
        name: inlineEventForm.title.trim(),
        event_date: inlineEventForm.date,
        event_time: inlineEventForm.time || "19:00",
        doors_open: inlineEventForm.doorsOpen || null,
        venue_name: inlineEventForm.venueName || null,
        venue_city: inlineEventForm.city || null,
        venue_state: inlineEventForm.state || null,
        venue_country: inlineEventForm.country || null,
        event_type: inlineEventForm.type,
      }

      const res = await fetch(`/api/admin/tours/${activeTourId}/events`, adminRequest({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }))
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to create event")

      const newEvent = data.event
      if (newEvent?.id) {
        const newStop: RouteStopDraft = {
          id: String(newEvent.id),
          name: inlineEventForm.title.trim(),
          venue: inlineEventForm.venueName || "",
          date: inlineEventForm.date || "",
          time: inlineEventForm.time || "",
          market: "",
          leg_name: "",
          capacity: "",
          advance_status: "not_started",
          stop_type: "show",
          timezone: "",
          venue_city: inlineEventForm.city || "",
          venue_state: inlineEventForm.state || "",
          venue_country: inlineEventForm.country || "USA",
          event_id: String(newEvent.id),
          planning_status: "draft",
          ordinal: form.stops.filter((s) => s.name || s.venue || s.date).length,
        }
        setForm((current) => ({
          ...current,
          attachedEventIds: [...current.attachedEventIds, String(newEvent.id)],
          stops: [
            ...current.stops.filter((s) => s.name || s.venue || s.date),
            newStop,
          ],
        }))
        setSaveStatus("unsaved")
        setCreatedEvents((prev) => [
          ...prev,
          {
            id: String(newEvent.id),
            name: inlineEventForm.title.trim(),
            date: inlineEventForm.date || "",
            venue: [inlineEventForm.venueName, inlineEventForm.city].filter(Boolean).join(", "),
          },
        ])
        sonnerToast.success("Event created and attached", {
          description: `${inlineEventForm.title.trim()} has been added to this tour.`,
        })
        resetInlineEventForm()
      }
    } catch (error) {
      sonnerToast.error("Could not create event", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsCreatingEvent(false)
    }
  }, [adminRequest, form.stops, inlineEventForm, persistTour, resetInlineEventForm, tourId])



  const saveTour = async (publish = false) => {
    await persistTour(publish, { redirect: true })
  }

  React.useEffect(() => {
    if (isHydrating) return
    if (form.name?.trim() || form.startDate) setAutosaveReady(true)
  }, [form.name, form.startDate, isHydrating])

  useBuilderAutosave({
    enabled: !isHydrating && quickStartState === null && autosaveReady && Boolean(form.name?.trim() || form.startDate),
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
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-6 text-slate-300">
        <div className={cn(artistEventUI.panelPadded, "flex items-center gap-3")}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          Resuming tour draft…
        </div>
      </div>
    )
  }

  if (quickStartState) {
    return (
      <div className="container mx-auto flex min-h-[65vh] max-w-5xl items-center justify-center px-4 py-10">
        <div className={cn(artistEventUI.panelPadded, "w-full max-w-2xl text-center")}>
          <Route className="mx-auto h-10 w-10 text-cyan-300" />
          <h1 className="mt-4 text-2xl font-semibold text-white">Let’s build your tour</h1>
          <p className="mt-2 text-sm text-slate-400">A quick setup window is ready.</p>
        </div>
        <TourQuickStartWizard
          initialTourId={tourId}
          initialTourName={form.name}
          initialState={quickStartState}
          requestInit={adminRequest}
          onTourCreated={(tour) => {
            setTourId(tour.id)
            setForm((current) => ({ ...current, name: tour.name }))
            setSaveStatus("saved")
          }}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <BuilderShell
        title="Tour Operations Builder"
        subtitle="Plan shows, attach events, build your team, manage logistics, and publish — all in one workspace."
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
            <SummaryLine icon={Music} label="Events" value={`${form.attachedEventIds.length} attached`} />
            {form.attachedEventIds.length === 0 && (
              <button
                type="button"
                onClick={() => { setActiveMode("plan"); setActiveSection("events") }}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-2.5 py-1.5 text-left text-xs text-cyan-300 transition hover:bg-cyan-400/15"
              >
                <Plus className="h-3 w-3 shrink-0" />
                Create your first event
              </button>
            )}
          </div>
        }
        asideAfterSummary={<TourHandoffPanel tourId={tourId} />}
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
          <div className={cn(artistEventUI.inset, "mb-4 flex flex-wrap items-center gap-2 p-3 text-sm")}>
            <span className="mr-1 text-xs text-slate-500">Tour hub:</span>
            <Button type="button" size="sm" variant="outline" className="rounded-lg border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-cyan-400/30 hover:text-white" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=team`)}>People</Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-cyan-400/30 hover:text-white" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=vendors`)}>Vendors</Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-cyan-400/30 hover:text-white" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=logistics`)}>Logistics</Button>
            <Button type="button" size="sm" variant="outline" className="rounded-lg border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-cyan-400/30 hover:text-white" onClick={() => router.push(`/admin/dashboard/tours/${tourId}?tab=finances`)}>Finances</Button>
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
                  searchUrl="/api/admin/tours/artists"
                  requestHeaders={actingHeaders}
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
              <Field label="Start date"><Input type="date" value={form.startDate} onChange={(event) => updateForm({ startDate: event.target.value })} /></Field>
              <Field label="End date"><Input type="date" value={form.endDate} onChange={(event) => updateForm({ endDate: event.target.value })} /></Field>
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
              <Field label="Markets" hint="Comma-separated city or region names"><Input value={form.markets} onChange={(event) => updateForm({ markets: event.target.value })} placeholder="Los Angeles, San Diego, Phoenix" /></Field>
              <Field label="Description"><Textarea value={form.description} onChange={(event) => updateForm({ description: event.target.value })} /></Field>
              <Field label="Cover image URL"><Input value={form.coverImageUrl} onChange={(event) => updateForm({ coverImageUrl: event.target.value })} placeholder="https://..." /></Field>
              <Field label="Branding"><Textarea value={form.branding} onChange={(event) => updateForm({ branding: event.target.value })} /></Field>
              <Field label="Route notes"><Textarea value={form.routeNotes} onChange={(event) => updateForm({ routeNotes: event.target.value })} placeholder="General routing notes for this tour" /></Field>
            </div>
          </Panel>
        )}

        {activeSection === "events" && (
          <Panel title="Events" icon={Music}>
            {/* Mode toggle */}
            <div className="mb-5 flex gap-1 rounded-xl border border-slate-700/60 bg-slate-950/60 p-1">
              <button
                type="button"
                onClick={() => setInlineEventMode("create")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  inlineEventMode === "create"
                    ? "border border-cyan-400/30 bg-cyan-400/10 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Plus className="mr-1.5 inline h-3.5 w-3.5" />
                Create new
              </button>
              <button
                type="button"
                onClick={() => setInlineEventMode("attach")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  inlineEventMode === "attach"
                    ? "border border-cyan-400/30 bg-cyan-400/10 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />
                Attach existing
              </button>
            </div>

            {inlineEventMode === "create" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Create an event and automatically attach it to this tour. Add full details from the Events dashboard later.
                </p>

                {/* Created events list */}
                {createdEvents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Created this session</p>
                    {createdEvents.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">{ev.name}</p>
                          <p className="truncate text-xs text-slate-400">{ev.date || "Date TBD"}{ev.venue ? ` · ${ev.venue}` : ""}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/dashboard/events/${ev.id}`)}
                          className="flex shrink-0 items-center gap-1 rounded-lg border border-cyan-400/25 bg-cyan-400/8 px-2 py-1 text-xs text-cyan-300 transition hover:border-cyan-400/50 hover:bg-cyan-400/15 hover:text-white"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Inline form */}
                <div className="rounded-[1.2rem] border border-slate-700/60 bg-slate-950/50 p-4 space-y-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">New event</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs text-slate-400">Event title <span className="text-cyan-400">*</span></label>
                      <Input
                        value={inlineEventForm.title}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, title: e.target.value }))}
                        placeholder="Friday Night Live"
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Date <span className="text-cyan-400">*</span></label>
                      <Input
                        type="date"
                        value={inlineEventForm.date}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, date: e.target.value }))}
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Show time</label>
                      <Input
                        type="time"
                        value={inlineEventForm.time}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, time: e.target.value }))}
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Doors open</label>
                      <Input
                        type="time"
                        value={inlineEventForm.doorsOpen}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, doorsOpen: e.target.value }))}
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Event type</label>
                      <Select value={inlineEventForm.type} onValueChange={(v) => setInlineEventForm((p) => ({ ...p, type: v }))}>
                        <SelectTrigger className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white focus:ring-cyan-500/25">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700/70 bg-slate-950 text-slate-100 shadow-2xl">
                          <SelectItem value="concert">Concert</SelectItem>
                          <SelectItem value="festival">Festival</SelectItem>
                          <SelectItem value="tour">Tour stop</SelectItem>
                          <SelectItem value="recording">Recording</SelectItem>
                          <SelectItem value="interview">Interview</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">Venue name</label>
                      <Input
                        value={inlineEventForm.venueName}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, venueName: e.target.value }))}
                        placeholder="Hollywood Bowl"
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">City</label>
                      <Input
                        value={inlineEventForm.city}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="Los Angeles"
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400">State</label>
                      <Input
                        value={inlineEventForm.state}
                        onChange={(e) => setInlineEventForm((p) => ({ ...p, state: e.target.value }))}
                        placeholder="CA"
                        className="rounded-xl border-slate-700/70 bg-slate-900/80 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/50 focus-visible:ring-cyan-500/25"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      onClick={() => void createInlineEvent()}
                      disabled={isCreatingEvent || !inlineEventForm.title.trim() || !inlineEventForm.date}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-950/25 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                    >
                      {isCreatingEvent ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                      ) : (
                        <><Plus className="mr-2 h-4 w-4" />Create &amp; attach event</>
                      )}
                    </Button>
                    {(inlineEventForm.title || inlineEventForm.date || inlineEventForm.venueName) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetInlineEventForm}
                        className="rounded-xl text-slate-400 hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {inlineEventMode === "attach" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Find and attach events that already exist in your organization.
                </p>
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
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-slate-950/65 p-3 text-left transition hover:border-cyan-400/30 hover:bg-slate-900/70"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{event.name}</p>
                            <p className="truncate text-xs text-slate-400">{event.event_date || "Date TBD"} · {event.venue_name || "Venue TBD"}</p>
                          </div>
                          <Badge className={attached ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-slate-600/60 bg-slate-800/50 text-slate-300"}>
                            {attached ? "Attached" : "Attach"}
                          </Badge>
                        </button>
                      )
                    })}
                    {filteredEvents.length === 0 && !isLoadingEvents && (
                      <p className="py-6 text-center text-sm text-slate-500">No events found. Try a different search or create a new event above.</p>
                    )}
                  </div>
                )}
                </EntitySearchDrawer>
              </div>
            )}
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
          <Panel title="Logistics" icon={Truck} action={<Button type="button" size="sm" variant="outline" onClick={addStop}><Plus className="mr-2 h-4 w-4" />Add stop</Button>}>
            <div className="mb-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Tour Route
              </p>
              <RouteStopTable
                stops={form.stops}
                onChange={updateStop}
                onRemove={removeStop}
                onReorder={reorderStops}
                onMove={moveStop}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <Field label="Transportation"><Textarea value={form.transportation} onChange={(event) => updateForm({ transportation: event.target.value })} /></Field>
              <Field label="Hotels and lodging"><Textarea value={form.lodging} onChange={(event) => updateForm({ lodging: event.target.value })} /></Field>
              <Field label="Equipment"><Textarea value={form.equipment} onChange={(event) => updateForm({ equipment: event.target.value })} /></Field>
              <Field label="Freight"><Textarea value={form.freight} onChange={(event) => updateForm({ freight: event.target.value })} /></Field>
              <Field label="Supplies"><Textarea value={form.supplies} onChange={(event) => updateForm({ supplies: event.target.value })} /></Field>
              <Field label="Site maps notes">
                <Textarea value={form.siteMaps} onChange={(event) => updateForm({ siteMaps: event.target.value })} placeholder="Optional notes. Manage interactive site maps in Logistics." />
                <a
                  href={buildAdminSiteMapHref({ tourId })}
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
                <div key={item.id} className={cn(artistEventUI.inset, "p-4")}>
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

      <AlertDialog
        open={Boolean(reconcilePreview)}
        onOpenChange={(open) => {
          if (!open) {
            setReconcilePreview(null)
            setPendingSave(null)
          }
        }}
      >
        <AlertDialogContent className={cn(artistEventUI.dialog, "max-w-lg")}>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm plan changes</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-slate-400">
              <span className="block">
                Review relational and downstream consequences before saving. Detach removes the tour link only — event records stay.
              </span>
              {reconcilePreview?.detachments?.length ? (
                <span className="block">
                  Detach ({reconcilePreview.detachments.length}):{" "}
                  {reconcilePreview.detachments.map((stop) => stop.name).join(", ")}
                </span>
              ) : null}
              {reconcilePreview?.additions?.length ? (
                <span className="block">
                  Add ({reconcilePreview.additions.length}):{" "}
                  {reconcilePreview.additions.map((stop) => stop.name).join(", ")}
                </span>
              ) : null}
              {reconcilePreview?.modifications?.length ? (
                <span className="block">
                  Modify:{" "}
                  {reconcilePreview.modifications
                    .map((stop) => `${stop.name} (${stop.fields.join(", ")})`)
                    .join("; ")}
                </span>
              ) : null}
              {reconcilePreview?.reorders ? (
                <span className="block">Stop order will change (route/day-sheet ordinals may recompute).</span>
              ) : null}
              {reconcilePreview?.downstream?.length ? (
                <ul className="list-disc space-y-1 pl-4">
                  {reconcilePreview.downstream.slice(0, 6).map((item, index) => (
                    <li key={`${item.kind}-${index}`}>{item.summary}</li>
                  ))}
                </ul>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-transparent">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-cyan-600 text-white hover:bg-cyan-500"
              onClick={() => {
                const next = pendingSave
                setReconcilePreview(null)
                setPendingSave(null)
                confirmedReconcileRef.current = true
                if (next) void persistTour(next.publish, { redirect: next.redirect, silent: next.silent })
              }}
            >
              Save with these changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function TourHandoffPanel({ tourId }: { tourId: string | null }) {
  const logisticsHref = buildAdminLogisticsHref({ tourId, tab: "overview" })
  const items = [
    { label: "Events", href: "/admin/dashboard/events", icon: Plus },
    { label: "Logistics", href: logisticsHref, icon: Truck },
    { label: "Calendar", href: "/admin/dashboard/calendar", icon: CalendarDays },
    { label: "Finance", href: "/admin/dashboard/finances", icon: Banknote },
    { label: "Comms", href: "/admin/dashboard/communications", icon: Megaphone },
  ]

  return (
    <div className={cn(artistEventUI.panelPadded)}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">After save</p>
      {tourId ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <a key={item.label} href={item.href} className={cn(artistEventUI.inset, artistEventUI.interactive, "flex min-h-10 items-center gap-2 px-2.5 text-xs text-slate-400 hover:text-white")}>
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </a>
            )
          })}
        </div>
      ) : (
        <p className={cn(artistEventUI.muted, "py-2 text-center text-xs")}>Save the draft to unlock hub links.</p>
      )}
    </div>
  )
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: React.ComponentType<{ className?: string }>; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="w-full">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn(artistEventUI.iconWell, "h-8 w-8")}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-[0.13em] text-slate-400">{label}</Label>
      <div className={cn(
        "[&_input]:rounded-xl [&_input]:border-slate-700/70 [&_input]:bg-slate-900/80 [&_input]:text-white [&_input]:placeholder:text-slate-500",
        "[&_input]:focus-visible:border-cyan-400/50 [&_input]:focus-visible:ring-cyan-500/25",
        "[&_textarea]:rounded-xl [&_textarea]:border-slate-700/70 [&_textarea]:bg-slate-900/80 [&_textarea]:text-white [&_textarea]:placeholder:text-slate-500",
        "[&_textarea]:focus-visible:border-cyan-400/50 [&_textarea]:focus-visible:ring-cyan-500/25",
        "[&_button[role=combobox]]:rounded-xl [&_button[role=combobox]]:border-slate-700/70 [&_button[role=combobox]]:bg-slate-900/80 [&_button[role=combobox]]:text-white",
      )}>
        {children}
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
