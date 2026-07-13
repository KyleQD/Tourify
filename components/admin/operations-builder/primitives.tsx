"use client"

import type React from "react"
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  GripVertical,
  Link2,
  MapPin,
  Route,
  ShieldAlert,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { BuilderConflict, BuilderReadinessSummary, ReadinessItem, ReadinessState } from "@/lib/admin/operations-readiness"

export interface BuilderSection {
  id: string
  label: string
  mode: "plan" | "advance" | "run" | "review"
  icon: LucideIcon
  status?: ReadinessState
}

const modeLabels = {
  plan: "Plan",
  advance: "Advance",
  run: "Run",
  review: "Review",
} as const

const stateLabels: Record<ReadinessState, string> = {
  missing: "Missing",
  needs_advance: "Needs advance",
  in_progress: "In progress",
  ready: "Ready",
  blocked: "Blocked",
  settled: "Settled",
}

const stateClasses: Record<ReadinessState, string> = {
  missing: "border-red-500/40 bg-red-500/10 text-red-200",
  needs_advance: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  in_progress: "border-blue-500/40 bg-blue-500/10 text-blue-200",
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  blocked: "border-red-600/50 bg-red-600/15 text-red-100",
  settled: "border-teal-500/40 bg-teal-500/10 text-teal-200",
}

function SectionStatusIcon({ state }: { state?: ReadinessState }) {
  if (state === "ready" || state === "settled") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
  if (state === "blocked" || state === "missing") return <AlertTriangle className="h-3.5 w-3.5 text-red-300" />
  if (state === "needs_advance" || state === "in_progress") return <Clock3 className="h-3.5 w-3.5 text-amber-300" />
  return <Circle className="h-3.5 w-3.5 text-slate-500" />
}

export function ReadinessBadge({ state }: { state: ReadinessState }) {
  return (
    <Badge variant="outline" className={stateClasses[state]}>
      {stateLabels[state]}
    </Badge>
  )
}

export function BuilderShell({
  title,
  subtitle,
  sections,
  activeSection,
  onSectionChange,
  activeMode,
  onModeChange,
  readiness,
  summary,
  children,
  bottomBar,
  readinessActions,
  asideAfterSummary,
  badge,
  headerActions,
}: {
  title: string
  subtitle: string
  sections: BuilderSection[]
  activeSection: string
  onSectionChange: (section: string) => void
  activeMode: BuilderSection["mode"]
  onModeChange: (mode: BuilderSection["mode"]) => void
  readiness: BuilderReadinessSummary
  summary: React.ReactNode
  children: React.ReactNode
  bottomBar: React.ReactNode
  readinessActions?: Record<string, () => void>
  asideAfterSummary?: React.ReactNode
  badge?: string
  headerActions?: React.ReactNode
}) {
  const visibleSections = sections.filter((section) => section.mode === activeMode)

  return (
    <div className="relative min-h-[calc(100vh-96px)] pb-28 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.14),transparent_34%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.1),transparent_32%)]" />

      <div className="mb-5 overflow-hidden rounded-[1.75rem] border border-slate-700/60 bg-slate-950/70 p-5 shadow-2xl shadow-purple-950/20 backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Operations builder
              </span>
              {badge ? (
                <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-3 py-1 text-xs font-medium text-purple-100">
                  {badge}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
            <p className="text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(modeLabels) as Array<BuilderSection["mode"]>).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={activeMode === mode ? "default" : "outline"}
                className={
                  activeMode === mode
                    ? "h-9 border border-cyan-400/30 bg-cyan-400/15 text-white hover:bg-cyan-400/20"
                    : "h-9 border-slate-700 text-slate-300 hover:bg-slate-800"
                }
                onClick={() => onModeChange(mode)}
              >
                {modeLabels[mode]}
              </Button>
            ))}
            {headerActions}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[236px_minmax(0,1fr)_320px]">
        <BuilderSectionNav
          sections={visibleSections.length ? visibleSections : sections}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
        />
        <main className="min-w-0 space-y-4">
          <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl sm:p-5">
            {children}
          </div>
        </main>
        <aside className="space-y-4">
          <ReadinessPanel readiness={readiness} actions={readinessActions} />
          <ConflictPanel conflicts={readiness.conflicts} />
          <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
            {summary}
          </div>
          {asideAfterSummary}
        </aside>
      </div>

      {bottomBar}
    </div>
  )
}

export function BuilderSectionNav({
  sections,
  activeSection,
  onSectionChange,
}: {
  sections: BuilderSection[]
  activeSection: string
  onSectionChange: (section: string) => void
}) {
  return (
    <nav className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-2 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
      <div className="mb-2 px-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Sections</div>
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon
          const active = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                active ? "border border-cyan-400/30 bg-cyan-500/12 text-white" : "border border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{section.label}</span>
              <SectionStatusIcon state={section.status} />
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function ReadinessPanel({
  readiness,
  actions,
}: {
  readiness: BuilderReadinessSummary
  actions?: Record<string, () => void>
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Readiness</p>
          <p className="text-2xl font-semibold text-white">{readiness.score}%</p>
        </div>
        <Badge variant={readiness.blockers.length ? "destructive" : "outline"}>
          {readiness.blockers.length ? `${readiness.blockers.length} blocker${readiness.blockers.length === 1 ? "" : "s"}` : "No blockers"}
        </Badge>
      </div>
      <Progress value={readiness.score} className="mt-3 h-2" />
      <div className="mt-4 space-y-2">
        {readiness.items.map((item) => (
          <ReadinessRow key={item.id} item={item} onAction={actions?.[item.id]} />
        ))}
      </div>
    </div>
  )
}

function ReadinessRow({ item, onAction }: { item: ReadinessItem; onAction?: () => void }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-100">{item.label}</span>
        <ReadinessBadge state={item.state} />
      </div>
      {item.detail && <p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p>}
      {onAction && item.state !== "ready" && item.state !== "settled" && (
        <Button type="button" variant="ghost" size="sm" className="mt-2 h-7 px-2 text-xs text-cyan-300 hover:bg-slate-800 hover:text-cyan-200" onClick={onAction}>
          Fix
        </Button>
      )}
    </div>
  )
}

export function ConflictPanel({ conflicts }: { conflicts: BuilderConflict[] }) {
  return (
    <div className="rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Conflicts</p>
        <Badge variant="outline" className="border-slate-700 text-slate-300">{conflicts.length}</Badge>
      </div>
      {conflicts.length === 0 ? (
        <p className="text-sm text-slate-400">No date, route, or readiness conflicts detected.</p>
      ) : (
        <div className="space-y-2">
          {conflicts.map((conflict) => (
            <div key={conflict.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
                <ShieldAlert className="h-4 w-4" />
                {conflict.label}
              </div>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">{conflict.detail}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AutosaveBar({
  status,
  primaryLabel,
  secondaryLabel = "Save draft",
  onPrimary,
  onSecondary,
  disabled,
  entityLabel,
}: {
  status: "saved" | "saving" | "unsaved" | "error"
  primaryLabel: string
  secondaryLabel?: string
  onPrimary: () => void
  onSecondary: () => void
  disabled?: boolean
  entityLabel?: string
}) {
  const statusText = {
    saved: entityLabel ? `${entityLabel} saved` : "Saved",
    saving: "Saving…",
    unsaved: "Unsaved changes",
    error: "Save failed — retry",
  }[status]

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/95 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "error"
                ? "bg-red-400"
                : status === "saving"
                  ? "animate-pulse bg-amber-400"
                  : status === "unsaved"
                    ? "bg-blue-400"
                    : "bg-emerald-400"
            }`}
          />
          {statusText}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
            onClick={onSecondary}
            disabled={disabled}
          >
            {secondaryLabel}
          </Button>
          <Button
            type="button"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
            onClick={onPrimary}
            disabled={disabled}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function EntitySearchDrawer({
  title,
  placeholder,
  query,
  onQueryChange,
  children,
}: {
  title: string
  placeholder: string
  query: string
  onQueryChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <Label className="text-slate-300">{title}</Label>
      <Input className="mt-2 border-slate-700 bg-slate-900 text-white" placeholder={placeholder} value={query} onChange={(event) => onQueryChange(event.target.value)} />
      <div className="mt-3 max-h-72 overflow-y-auto">{children}</div>
    </div>
  )
}

export function AssignmentPicker({
  tours,
  selectedTourIds,
  primaryTourId,
  onToggleTour,
  onPrimaryTourChange,
}: {
  tours: Array<{ id: string; name: string; status?: string | null; artist?: string | null; main_artist?: string | null }>
  selectedTourIds: string[]
  primaryTourId: string
  onToggleTour: (tourId: string) => void
  onPrimaryTourChange: (tourId: string) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {tours.map((tour) => {
          const selected = selectedTourIds.includes(tour.id)
          return (
            <button
              key={tour.id}
              type="button"
              onClick={() => onToggleTour(tour.id)}
              className={`rounded-md border p-3 text-left transition ${selected ? "border-cyan-400/60 bg-cyan-500/10" : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{tour.name}</p>
                  <p className="truncate text-xs text-slate-400">{tour.artist || tour.main_artist || "Tour"}</p>
                </div>
                <Badge variant={selected ? "default" : "outline"}>{selected ? "Assigned" : tour.status || "planning"}</Badge>
              </div>
            </button>
          )
        })}
      </div>
      {selectedTourIds.length > 0 && (
        <div>
          <Label className="text-slate-300">Primary tour</Label>
          <Select value={primaryTourId || selectedTourIds[0]} onValueChange={onPrimaryTourChange}>
            <SelectTrigger className="mt-2 border-slate-700 bg-slate-900 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tours.filter((tour) => selectedTourIds.includes(tour.id)).map((tour) => (
                <SelectItem key={tour.id} value={tour.id}>{tour.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}

export interface RouteStopDraft {
  id: string
  name: string
  venue: string
  date: string
  time?: string
  market?: string
  leg_name?: string
  capacity?: number | string
  advance_status?: string
}

export function RouteStopTable({
  stops,
  onChange,
  onRemove,
}: {
  stops: RouteStopDraft[]
  onChange: (id: string, patch: Partial<RouteStopDraft>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-800">
      <div className="grid grid-cols-[36px_1.2fr_1fr_140px_110px_120px_44px] gap-2 border-b border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
        <span />
        <span>Stop</span>
        <span>Venue</span>
        <span>Date</span>
        <span>Time</span>
        <span>Market</span>
        <span />
      </div>
      {stops.map((stop, index) => (
        <div key={stop.id} className="grid grid-cols-[36px_1.2fr_1fr_140px_110px_120px_44px] gap-2 border-b border-slate-900 bg-slate-950/50 px-3 py-2 last:border-b-0">
          <div className="flex items-center gap-1 text-slate-500">
            <GripVertical className="h-4 w-4" />
            <span className="text-xs">{index + 1}</span>
          </div>
          <Input value={stop.name} onChange={(event) => onChange(stop.id, { name: event.target.value })} className="border-slate-700 bg-slate-900 text-white" />
          <Input value={stop.venue} onChange={(event) => onChange(stop.id, { venue: event.target.value })} className="border-slate-700 bg-slate-900 text-white" />
          <Input type="date" value={stop.date} onChange={(event) => onChange(stop.id, { date: event.target.value })} className="border-slate-700 bg-slate-900 text-white" />
          <Input type="time" value={stop.time || ""} onChange={(event) => onChange(stop.id, { time: event.target.value })} className="border-slate-700 bg-slate-900 text-white" />
          <Input value={stop.market || ""} onChange={(event) => onChange(stop.id, { market: event.target.value })} className="border-slate-700 bg-slate-900 text-white" />
          <Button type="button" variant="ghost" size="sm" className="text-red-300 hover:text-red-200" onClick={() => onRemove(stop.id)}>
            Remove
          </Button>
        </div>
      ))}
    </div>
  )
}

export function AdvancingMatrix({
  events,
  onChange,
}: {
  events: RouteStopDraft[]
  onChange: (id: string, status: string) => void
}) {
  const columns = ["venue", "production", "hospitality", "security", "staffing", "documents", "settlement"]
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-slate-950 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left">Event</th>
            {columns.map((column) => <th key={column} className="px-3 py-2 text-left">{column}</th>)}
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t border-slate-900 bg-slate-950/50">
              <td className="px-3 py-3 text-white">{event.name || "Untitled event"}</td>
              {columns.map((column) => {
                const status = event.advance_status || "not_started"
                const label =
                  status === "ready" || status === "settled"
                    ? "Ready"
                    : status === "blocked"
                      ? "Blocked"
                      : status === "in_progress"
                        ? "In progress"
                        : "Needs advance"
                const className =
                  status === "ready" || status === "settled"
                    ? "border-emerald-500/30 text-emerald-200"
                    : status === "blocked"
                      ? "border-rose-500/30 text-rose-200"
                      : status === "in_progress"
                        ? "border-sky-500/30 text-sky-200"
                        : "border-amber-500/30 text-amber-200"
                return (
                  <td key={column} className="px-3 py-3">
                    <Badge variant="outline" className={className}>{label}</Badge>
                  </td>
                )
              })}
              <td className="px-3 py-3">
                <Select value={event.advance_status || "not_started"} onValueChange={(value) => onChange(event.id, value)}>
                  <SelectTrigger className="h-8 w-36 border-slate-700 bg-slate-900 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ItineraryTimeline({ stops }: { stops: RouteStopDraft[] }) {
  return (
    <div className="space-y-3">
      {stops.length === 0 ? (
        <p className="rounded-md border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">Add events or route holds to build the itinerary.</p>
      ) : (
        stops.map((stop, index) => (
          <div key={stop.id} className="grid gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[120px_minmax(0,1fr)_160px]">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Day {index + 1}</p>
              <p className="text-sm font-medium text-white">{stop.date || "Date TBD"}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-white">
                <Route className="h-4 w-4 text-cyan-300" />
                {stop.name || "Untitled stop"}
              </div>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{stop.venue || "Venue TBD"}</span>
                <span>{stop.market || "Market TBD"}</span>
                <span>{stop.time || "Time TBD"}</span>
              </div>
            </div>
            <ReadinessBadge state={stop.advance_status === "ready" ? "ready" : stop.advance_status === "blocked" ? "blocked" : "needs_advance"} />
          </div>
        ))
      )}
    </div>
  )
}

export function DaySheetPreview({
  title,
  date,
  venue,
  schedule,
  notes,
}: {
  title: string
  date?: string
  venue?: string
  schedule: Array<{ label: string; value?: string }>
  notes?: string
}) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-cyan-300" />
        <div>
          <h3 className="text-lg font-semibold text-white">{title || "Day sheet preview"}</h3>
          <p className="text-sm text-slate-400">{date || "Date TBD"} - {venue || "Venue TBD"}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {schedule.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm text-white">{item.value || "TBD"}</p>
          </div>
        ))}
      </div>
      <Textarea readOnly value={notes || "No notes yet."} className="mt-4 min-h-24 border-slate-700 bg-slate-900 text-slate-300" />
    </div>
  )
}

export function SummaryLine({ icon: Icon = Link2, label, value }: { icon?: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2">
      <Icon className="mt-0.5 h-4 w-4 text-cyan-300" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <div className="mt-0.5 text-sm text-slate-200">{value}</div>
      </div>
    </div>
  )
}
