"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  ClipboardCheck,
  LayoutTemplate,
  MapPin,
  Megaphone,
  Music,
  Search,
  Save,
  Ticket,
  Users,
  X,
} from "lucide-react"
import { toast as sonnerToast } from "sonner"

import {
  BuilderSection,
  BuilderShell,
  SummaryLine,
} from "@/components/admin/operations-builder/primitives"
import { EventPageDesignPanel } from "@/components/events/event-page-design-panel"
import { artistEventStatusClass, artistEventUI } from "@/components/events/artist-event-ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getArtistEventReadiness } from "@/lib/artist/artist-event-readiness"
import {
  ArtistEventProducerFormState,
  ArtistProducerSelection,
  buildArtistEventProducerPayload,
  hydrateArtistEventProducerForm,
  initialArtistEventProducerForm,
  prefillFromBooking,
} from "@/lib/artist/event-producer-builder"
import { useBuilderAutosave } from "@/lib/admin/use-builder-autosave"
import type { ReadinessState } from "@/lib/admin/operations-readiness"
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

const sectionConfig: BuilderSection[] = [
  { id: "basics", label: "Basics", mode: "plan", icon: Music },
  { id: "schedule", label: "Schedule", mode: "plan", icon: CalendarClock },
  { id: "page-design", label: "Page Design", mode: "plan", icon: LayoutTemplate },
  { id: "venue", label: "Venue", mode: "advance", icon: MapPin },
  { id: "lineup", label: "Lineup", mode: "advance", icon: Users },
  { id: "ticketing", label: "Ticketing", mode: "review", icon: Ticket },
  { id: "marketing", label: "Marketing", mode: "review", icon: Megaphone },
  { id: "review", label: "Review", mode: "review", icon: ClipboardCheck },
]

const selectContentClass =
  "border-slate-700/70 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/40"

const sectionByReadiness: Record<string, string> = {
  basics: "basics",
  schedule: "schedule",
  venue: "venue",
  lineup: "lineup",
  ticketing: "ticketing",
  marketing: "marketing",
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function BuilderPanel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

export default function ArtistEventCreatePage() {
  const router = useRouter()
  const [form, setForm] = React.useState<ArtistEventProducerFormState>(initialArtistEventProducerForm)
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
  const [artistResults, setArtistResults] = React.useState<ArtistProducerSelection[]>([])
  const [isArtistLoading, setIsArtistLoading] = React.useState(false)
  const [autosaveReady, setAutosaveReady] = React.useState(false)
  const [publicSlug, setPublicSlug] = React.useState<string | null>(null)
  const skipAutosaveRef = React.useRef(true)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get("draft") || params.get("id")
    const bookingParam = params.get("fromBooking")

    if (bookingParam && !id) {
      try {
        const booking = JSON.parse(decodeURIComponent(bookingParam))
        setForm(prefillFromBooking(booking))
        setSaveStatus("unsaved")
      } catch {
        // ignore bad booking prefills
      }
      setIsHydrating(false)
      window.setTimeout(() => {
        skipAutosaveRef.current = false
        setAutosaveReady(true)
      }, 400)
      return
    }

    if (!id) {
      setIsHydrating(false)
      return
    }

    let cancelled = false
    async function hydrate() {
      setIsHydrating(true)
      try {
        const response = await fetch(`/api/artist/events/${id}`, { credentials: "include", cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to load draft")
        if (cancelled) return
        setEventId(String(data.event?.id || id))
        setPublicSlug(data.event?.slug || null)
        setForm(hydrateArtistEventProducerForm(data.event))
        setSaveStatus("saved")
        sonnerToast.success(
          data.event?.status === "published" ? "Event loaded" : "Draft resumed",
          { description: "Continuing where you left off." },
        )
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
        setArtistResults(
          response.ok
            ? (data.artists || []).map((item: any) => ({
                id: String(item?.id || item?.name),
                label: item?.name || item?.display_name || "Artist",
                meta: item?.location || item?.genre || "Artist",
              }))
            : [],
        )
      } catch {
        setArtistResults([])
      } finally {
        setIsArtistLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(handle)
  }, [artistQuery])

  const updateForm = (patch: Partial<ArtistEventProducerFormState>) => {
    setForm((current) => ({ ...current, ...patch }))
    setSaveStatus("unsaved")
  }

  const addSupportingArtist = (selection: ArtistProducerSelection) => {
    setForm((current) => {
      if (current.supportingArtists.some((item) => item.id === selection.id)) return current
      return { ...current, supportingArtists: [...current.supportingArtists, selection] }
    })
    setSaveStatus("unsaved")
  }

  const removeSupportingArtist = (id: string) => {
    setForm((current) => ({
      ...current,
      supportingArtists: current.supportingArtists.filter((item) => item.id !== id),
    }))
    setSaveStatus("unsaved")
  }

  const readiness = React.useMemo(() => getArtistEventReadiness(form), [form])

  const sections = React.useMemo(
    () =>
      sectionConfig.map((section) => {
        const matchingItem = readiness.items.find(
          (item) => sectionByReadiness[item.id] === section.id || item.id === section.id,
        )
        return { ...section, status: matchingItem?.state as ReadinessState | undefined }
      }),
    [readiness.items],
  )

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
      address: venue.fullAddress || form.address,
      city: venue.city || form.city,
      state: venue.state || form.state,
      capacity: venue.capacity ? String(venue.capacity) : form.capacity,
      venueContactEmail: venue.contact?.email || form.venueContactEmail,
      venueContactPhone: venue.contact?.phone || form.venueContactPhone,
      venueContactName: venue.contact?.name || form.venueContactName,
    })
    setVenueQuery(venue.name)
    setVenueResults([])
  }

  const persistEvent = React.useCallback(async (
    publish = false,
    { redirect = true, silent = false }: { redirect?: boolean; silent?: boolean } = {},
  ) => {
    const hasTitle = Boolean(form.title?.trim())
    const hasDate = Boolean(form.date)
    if (!hasDate && !hasTitle) {
      if (!silent) {
        sonnerToast.error("Details required", { description: "Add a title or date before saving." })
        setActiveMode("plan")
        setActiveSection("basics")
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
      const payload = buildArtistEventProducerPayload(form, { publish })
      const response = await fetch(eventId ? `/api/artist/events/${eventId}` : "/api/artist/events", {
        method: eventId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to save event")

      const savedId = String(data.event?.id || eventId || "")
      if (data.event?.slug) setPublicSlug(data.event.slug)

      if (savedId && !eventId) {
        setEventId(savedId)
        const url = new URL(window.location.href)
        url.searchParams.delete("draft")
        url.searchParams.set("id", savedId)
        window.history.replaceState({}, "", url.toString())
        skipAutosaveRef.current = false
        setAutosaveReady(true)
      }

      if (publish && savedId) {
        const publishRes = await fetch(`/api/artist/events/${savedId}/publish`, {
          method: "POST",
          credentials: "include",
        })
        if (!publishRes.ok) {
          const publishData = await publishRes.json().catch(() => ({}))
          throw new Error(publishData?.error || "Event saved but publish failed")
        }
        const publishData = await publishRes.json().catch(() => ({}))
        const publishedSlug = publishData?.event?.slug || data.event?.slug || null
        if (publishedSlug) setPublicSlug(publishedSlug)
        setForm((current) => ({
          ...current,
          status: "published",
        }))
      }

      setSaveStatus("saved")
      if (!silent) {
        sonnerToast.success(publish ? "Event published" : "Event draft saved", {
          description: redirect
            ? "Opening your event workspace."
            : publish
              ? "Your event is live."
              : "Your changes are saved.",
        })
      }

      if (redirect && savedId) {
        router.push(`/artist/events/${savedId}${publish ? "?published=1" : ""}`)
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
  }, [eventId, form, readiness.blockers, router])

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
  const sharePath = publicSlug ? `/events/${publicSlug}` : eventId ? `/events/${eventId}` : null
  const openPageDesign = React.useCallback(() => {
    setActiveMode("plan")
    setActiveSection("page-design")
  }, [])

  if (isHydrating) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4 py-6 text-slate-300">
        <div className={cn(artistEventUI.panelPadded, "flex items-center gap-3")}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          Loading event producer…
        </div>
      </div>
    )
  }

  return (
    <div className={artistEventUI.page}>
      <div className={artistEventUI.pageGlow} />
    <div className={cn(artistEventUI.shell, "pb-32")}>
      <BuilderShell
        title="Event Producer"
        subtitle="Create a shareable show page with venue, lineup, ticketing links, and marketing — then publish to discover."
        badge={eventId ? (form.status === "published" ? "Published" : "Editing draft") : "New event"}
        sections={activeSections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        activeMode={activeMode}
        onModeChange={setActiveMode}
        readiness={readiness}
        readinessActions={Object.fromEntries(readiness.items.map((item) => [item.id, () => moveToReadinessItem(item.id)]))}
        headerActions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              artistEventUI.buttonOutline,
              "h-9 border-purple-400/35 bg-purple-400/10 text-purple-100 hover:border-cyan-400/45 hover:bg-cyan-400/10",
            )}
            onClick={openPageDesign}
          >
            <LayoutTemplate className="mr-2 h-4 w-4" />
            Page Design
          </Button>
        }
        summary={
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Event summary</p>
            <SummaryLine label="Title" value={form.title || "Untitled event"} />
            <SummaryLine label="When" value={form.date ? `${form.date} ${form.time}` : "Not scheduled"} />
            <SummaryLine label="Where" value={[form.venueName, form.city].filter(Boolean).join(" · ") || "No venue"} />
            <SummaryLine label="Tickets" value={form.ticketUrl || "External link not set"} />
            {sharePath ? (
              <SummaryLine
                label="Public page"
                value={
                  <button
                    type="button"
                    className="text-left text-cyan-300 hover:underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
                      sonnerToast.success("Share link copied")
                    }}
                  >
                    {sharePath}
                  </button>
                }
              />
            ) : null}
          </div>
        }
        bottomBar={
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cyan-400/15 bg-slate-950/95 px-4 py-3 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    saveStatus === "error"
                      ? "bg-red-400"
                      : saveStatus === "saving"
                        ? "animate-pulse bg-amber-400"
                        : saveStatus === "unsaved"
                          ? "bg-blue-400"
                          : "bg-emerald-400"
                  }`}
                />
                {saveStatus === "saved"
                  ? "Event saved"
                  : saveStatus === "saving"
                    ? "Saving…"
                    : saveStatus === "unsaved"
                      ? "Unsaved changes"
                      : "Save failed — retry"}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(artistEventUI.buttonOutline, "h-11 justify-center")}
                  onClick={() => void persistEvent(false, { redirect: false })}
                  disabled={isSaving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save draft
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(artistEventUI.buttonOutline, "h-11 justify-center")}
                  onClick={() => void persistEvent(false, { redirect: true })}
                  disabled={isSaving}
                >
                  Save and exit
                </Button>
                <Button
                  type="button"
                  className={cn(artistEventUI.buttonAccent, "h-11 justify-center")}
                  onClick={() => void persistEvent(true, { redirect: true })}
                  disabled={isSaving}
                >
                  Publish
                </Button>
              </div>
            </div>
          </div>
        }
      >
        {activeSection === "basics" && (
          <BuilderPanel title="Basics" description="Core details fans will see on your public event page.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event title">
                <Input
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  className={artistEventUI.input}
                  placeholder="Friday Night Live"
                />
              </Field>
              <Field label="Event type">
                <Select value={form.type} onValueChange={(value) => updateForm({ type: value })}>
                  <SelectTrigger className={artistEventUI.select}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value="concert">Concert</SelectItem>
                    <SelectItem value="festival">Festival</SelectItem>
                    <SelectItem value="tour">Tour stop</SelectItem>
                    <SelectItem value="recording">Recording</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Visibility">
                <Select value={form.visibility} onValueChange={(value) => updateForm({ visibility: value })}>
                  <SelectTrigger className={artistEventUI.select}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value="public">Public when published</SelectItem>
                    <SelectItem value="unlisted">Unlisted (link only)</SelectItem>
                    <SelectItem value="private">Private draft</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Poster URL" hint="Optional image URL for the public page">
                <Input
                  value={form.posterUrl}
                  onChange={(e) => updateForm({ posterUrl: e.target.value })}
                  className={artistEventUI.input}
                  placeholder="https://..."
                />
              </Field>
            </div>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className={cn(artistEventUI.textarea, "min-h-[120px]")}
                placeholder="Tell fans what to expect..."
              />
            </Field>
            <Field label="Tags" hint="Comma-separated">
              <Input
                value={form.tags}
                onChange={(e) => updateForm({ tags: e.target.value })}
                className={artistEventUI.input}
                placeholder="indie, live, acoustic"
              />
            </Field>
          </BuilderPanel>
        )}

        {activeSection === "schedule" && (
          <BuilderPanel title="Schedule" description="Show date and timing for doors and set.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateForm({ date: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Timezone">
                <Input
                  value={form.timezone}
                  onChange={(e) => updateForm({ timezone: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Doors">
                <Input
                  type="time"
                  value={form.doorsOpen}
                  onChange={(e) => updateForm({ doorsOpen: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Show time">
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => updateForm({ time: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="End time">
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => updateForm({ endTime: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Set times" hint="Comma-separated labels">
                <Input
                  value={form.setTimes}
                  onChange={(e) => updateForm({ setTimes: e.target.value })}
                  className={artistEventUI.input}
                  placeholder="Opener 8pm, Headliner 9:30pm"
                />
              </Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "venue" && (
          <BuilderPanel title="Venue" description="Search venue profiles or enter details manually.">
            <Field label="Search venues">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  value={venueQuery}
                  onChange={(e) => setVenueQuery(e.target.value)}
                  className={cn(artistEventUI.input, "pl-9")}
                  placeholder="Search venues..."
                />
              </div>
              {isVenueLoading ? <p className="mt-2 text-xs text-slate-500">Searching…</p> : null}
              {venueResults.length > 0 && (
                <div className={cn(artistEventUI.inset, "mt-2 space-y-1 p-2")}>
                  {venueResults.map((venue) => (
                    <button
                      key={venue.id}
                      type="button"
                      onClick={() => selectVenue(venue)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                    >
                      <span className="min-w-0 truncate">{venue.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {[venue.city, venue.state].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Venue name">
                <Input
                  value={form.venueName}
                  onChange={(e) => updateForm({ venueName: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Capacity">
                <Input
                  value={form.capacity}
                  onChange={(e) => updateForm({ capacity: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="City">
                <Input
                  value={form.city}
                  onChange={(e) => updateForm({ city: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="State">
                <Input
                  value={form.state}
                  onChange={(e) => updateForm({ state: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Country">
                <Input
                  value={form.country}
                  onChange={(e) => updateForm({ country: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Contact name">
                <Input
                  value={form.venueContactName}
                  onChange={(e) => updateForm({ venueContactName: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Contact email">
                <Input
                  value={form.venueContactEmail}
                  onChange={(e) => updateForm({ venueContactEmail: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "lineup" && (
          <BuilderPanel title="Lineup & collaborators" description="Add supporting artists and notes (org promote comes in Phase 2).">
            <Field label="Search artists">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  value={artistQuery}
                  onChange={(e) => setArtistQuery(e.target.value)}
                  className={cn(artistEventUI.input, "pl-9")}
                  placeholder="Search artists..."
                />
              </div>
              {isArtistLoading ? <p className="mt-2 text-xs text-slate-500">Searching…</p> : null}
              {artistResults.length > 0 && (
                <div className={cn(artistEventUI.inset, "mt-2 space-y-1 p-2")}>
                  {artistResults.map((artist) => (
                    <button
                      key={artist.id}
                      type="button"
                      onClick={() => {
                        addSupportingArtist(artist)
                        setArtistQuery("")
                        setArtistResults([])
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm text-slate-200 transition hover:border-cyan-400/30 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                    >
                      <span className="min-w-0 truncate">{artist.label}</span>
                      <span className="shrink-0 text-xs text-slate-500">{artist.meta}</span>
                    </button>
                  ))}
                </div>
              )}
            </Field>
            {form.supportingArtists.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.supportingArtists.map((artist) => (
                  <Badge key={artist.id} variant="outline" className="gap-1 rounded-full border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                    {artist.label}
                    <button type="button" onClick={() => removeSupportingArtist(artist.id)} aria-label={`Remove ${artist.label}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Field label="Lineup notes">
              <Textarea
                value={form.lineupNotes}
                onChange={(e) => updateForm({ lineupNotes: e.target.value })}
                className={cn(artistEventUI.textarea, "min-h-[100px]")}
                placeholder="Openers, special guests, invite notes..."
              />
            </Field>
          </BuilderPanel>
        )}

        {activeSection === "ticketing" && (
          <BuilderPanel
            title="Ticketing"
            description="Phase 1 uses an external ticket link. Native Tourify tickets unlock after promote in Phase 2."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ticket URL" hint="Fans will use this CTA on the public page">
                <Input
                  value={form.ticketUrl}
                  onChange={(e) => updateForm({ ticketUrl: e.target.value })}
                  className={artistEventUI.input}
                  placeholder="https://tickets.example.com/..."
                />
              </Field>
              <Field label="Capacity">
                <Input
                  value={form.capacity}
                  onChange={(e) => updateForm({ capacity: e.target.value })}
                  className={artistEventUI.input}
                />
              </Field>
              <Field label="Price min">
                <Input
                  value={form.ticketPriceMin}
                  onChange={(e) => updateForm({ ticketPriceMin: e.target.value })}
                  className={artistEventUI.input}
                  placeholder="25"
                />
              </Field>
              <Field label="Price max">
                <Input
                  value={form.ticketPriceMax}
                  onChange={(e) => updateForm({ ticketPriceMax: e.target.value })}
                  className={artistEventUI.input}
                  placeholder="75"
                />
              </Field>
            </div>
          </BuilderPanel>
        )}

        {activeSection === "marketing" && (
          <BuilderPanel title="Marketing" description="Share copy and notes for your public page.">
            <Field label="Share blurb">
              <Textarea
                value={form.shareBlurb}
                onChange={(e) => updateForm({ shareBlurb: e.target.value })}
                className={cn(artistEventUI.textarea, "min-h-[80px]")}
                placeholder="Short text for social shares..."
              />
            </Field>
            <Field label="Marketing notes">
              <Textarea
                value={form.marketingNotes}
                onChange={(e) => updateForm({ marketingNotes: e.target.value })}
                className={cn(artistEventUI.textarea, "min-h-[100px]")}
                placeholder="Promo partners, press, playlist pitches..."
              />
            </Field>
            {sharePath ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(artistEventUI.buttonOutline, "h-10")}
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
                    sonnerToast.success("Share link copied")
                  }}
                >
                  Copy public link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(artistEventUI.buttonOutline, "h-10")}
                  onClick={() => window.open(sharePath, "_blank")}
                >
                  Preview public page
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Save a draft to generate a public page link.</p>
            )}
          </BuilderPanel>
        )}

        {activeSection === "page-design" && (
          <BuilderPanel title="Page Design" description="Customize the public page fans see when they open your event link.">
            <EventPageDesignPanel
              selectedTemplate={form.pageTemplate}
              layout={form.pageLayout}
              previewData={{
                title: form.title || "Untitled event",
                type: form.type,
                status: form.status,
                description: form.description,
                posterUrl: form.posterUrl,
                eventDate: form.date,
                startTime: form.time,
                venueName: form.venueName,
                city: form.city,
                state: form.state,
                ticketUrl: form.ticketUrl,
                capacity: form.capacity,
              }}
              onTemplateChange={(template) => updateForm({ pageTemplate: template })}
              onLayoutChange={(pageLayout) => updateForm({ pageLayout })}
              onSave={() => void persistEvent(false, { redirect: false })}
              isSaving={isSaving}
              publicPath={sharePath}
              onCopyPublicLink={
                sharePath
                  ? () => {
                      void navigator.clipboard.writeText(`${window.location.origin}${sharePath}`)
                      sonnerToast.success("Share link copied")
                    }
                  : undefined
              }
              onOpenPublicPage={
                sharePath ? () => window.open(sharePath, "_blank", "noopener,noreferrer") : undefined
              }
            />
          </BuilderPanel>
        )}

        {activeSection === "review" && (
          <BuilderPanel title="Review & publish" description="Fix blockers, then publish to discover and your public profile.">
            <div className="space-y-3">
              {readiness.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => moveToReadinessItem(item.id)}
                  className={cn(artistEventUI.inset, artistEventUI.interactive, "flex w-full items-center justify-between px-4 py-3 text-left")}
                >
                  <div>
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                  <Badge variant="outline" className={cn("capitalize", artistEventStatusClass(item.state))}>
                    {item.state.replace("_", " ")}
                  </Badge>
                </button>
              ))}
            </div>
            {readiness.blockers.length === 0 ? (
              <p className="text-sm text-emerald-300">Ready to publish. Your event will appear in discover and on your profile.</p>
            ) : (
              <p className="text-sm text-amber-200">
                {readiness.blockers.length} blocker{readiness.blockers.length === 1 ? "" : "s"} before publish.
              </p>
            )}
          </BuilderPanel>
        )}
      </BuilderShell>
    </div>
    </div>
  )
}
