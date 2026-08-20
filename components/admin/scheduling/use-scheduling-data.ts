"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { useActingContext } from "@/hooks/use-acting-context"
import {
  getEmployerQueryString,
  getLiveSchedulingScopeFlags,
  resolveSchedulingVenueId,
} from "@/lib/hiring/hiring-dashboard-utils"
import type { HiringEntity } from "@/types/hiring-entity"
import {
  AVAILABILITY as FALLBACK_AVAILABILITY,
  CONFLICTS as FALLBACK_CONFLICTS,
  EVENTS as FALLBACK_EVENTS,
  OPEN_SHIFTS as FALLBACK_OPEN_SHIFTS,
  SHIFTS as FALLBACK_SHIFTS,
  STAFF as FALLBACK_STAFF,
  DEMO_SHIFT_TEMPLATES,
  VENUES as FALLBACK_VENUES,
  type AvailabilityStatus,
  type ConfirmationStatus,
  type Department,
  type OpenShift,
  type Priority,
  type SchedulingConflict,
  type Shift,
  type ShiftStatus,
  type ShiftTemplate,
  type ShiftType,
  type StaffAvailability,
  type StaffMember,
  type WeekDay,
} from "@/components/admin/scheduling/scheduling-data"

export type SchedulingMode = "demo" | "live"

export interface SchedulingEventOption {
  id: string
  name: string
  venueId?: string | null
  venueName?: string | null
  startsAt?: string | null
  tourId?: string | null
}

export interface SchedulingVenueOption {
  id: string
  name: string
}

export interface SchedulingDataState {
  loading: boolean
  saving: boolean
  error: string | null
  /** Explicit demo preview vs live schedule. */
  mode: SchedulingMode
  /** True when mode === "demo" (populated sample data). */
  usingFallback: boolean
  /** Deprecated: venue is optional for live scheduling. Always false. */
  needsVenue: boolean
  /** True in live mode when no hiring employer is available. */
  needsEmployer: boolean
  hasEmployer: boolean
  weekStart: Date
  weekDays: WeekDay[]
  eventId: string
  venueId: string | null
  events: SchedulingEventOption[]
  venues: SchedulingVenueOption[]
  staff: StaffMember[]
  shifts: Shift[]
  openShifts: OpenShift[]
  conflicts: SchedulingConflict[]
  templates: ShiftTemplate[]
  availability: StaffAvailability[]
  reload: () => Promise<void>
  setWeekStart: (date: Date) => void
  setEventId: (eventId: string) => void
  setVenueId: (venueId: string | null) => void
  setMode: (mode: SchedulingMode) => void
  createShift: (input: PersistShiftInput) => Promise<SchedulingMutationResult>
  updateShift: (shiftId: string, input: PersistShiftInput) => Promise<SchedulingMutationResult>
  updateShiftStatus: (
    shiftId: string,
    status: "scheduled" | "confirmed" | "completed" | "cancelled",
    options?: { notify?: boolean }
  ) => Promise<SchedulingMutationResult>
  deleteShift: (shiftId: string) => Promise<SchedulingMutationResult>
  assignStaff: (shiftId: string, staffIds: string[]) => Promise<SchedulingMutationResult>
  publishShifts: (shiftIds: string[], options?: { notify?: boolean }) => Promise<SchedulingMutationResult>
  duplicateShift: (shiftId: string, options?: { date?: string }) => Promise<SchedulingMutationResult>
}

export const DEMO_MUTATION_ERROR = "Switch to Live to edit real shifts."

/** WORK-104 — templates exposed in live mode (empty until org-owned templates exist). */
export const LIVE_SHIFT_TEMPLATES: ShiftTemplate[] = []

export function shouldLoadLiveSchedulingDetails(args: {
  mode: SchedulingMode
  employer: HiringEntity | null
  venueId?: string | null
}): boolean {
  return args.mode === "live" && Boolean(args.employer)
}

/**
 * WORK-104 — Live availability from persisted shift assignments only.
 * Does not invent available/pending patterns from demo cycles.
 */
export function deriveLiveAvailability(
  staff: StaffMember[],
  weekDays: WeekDay[],
  shifts: Shift[],
): StaffAvailability[] {
  return staff.map((member) => ({
    staffId: member.id,
    preferredHours: "No persisted availability intervals",
    unavailableWindows: [],
    slots: weekDays.map((day) => {
      const hasShift = shifts.some(
        (shift) =>
          shift.date === day.date
          && (shift.assignedStaff?.id === member.id
            || (Array.isArray((shift as { assignedStaffIds?: string[] }).assignedStaffIds)
              && (shift as { assignedStaffIds?: string[] }).assignedStaffIds?.includes(member.id))),
      )
      return {
        day: day.key,
        status: hasShift ? "scheduled" : "unavailable",
      }
    }),
  }))
}

export function selectSchedulingTemplates(mode: SchedulingMode): ShiftTemplate[] {
  return mode === "demo" ? DEMO_SHIFT_TEMPLATES : LIVE_SHIFT_TEMPLATES
}

const ACTING_CONTEXT_ERROR_CODES = new Set([
  "organization_access_required",
  "organization_access_denied",
  "acting_context_required",
  "acting_context_unavailable",
  "acting_context_mismatch",
  "organization_scope_required",
  "membership_unavailable",
])

export function parseSchedulingApiError(raw: string): { message: string; code?: string; isActingContextError: boolean } {
  const trimmed = raw.trim()
  if (!trimmed) return { message: "Request failed", isActingContextError: false }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: string | { message?: string; code?: string }
      message?: string
      code?: string
    }
    const code =
      typeof parsed.code === "string"
        ? parsed.code
        : typeof parsed.error === "object" && parsed.error && typeof parsed.error.code === "string"
          ? parsed.error.code
          : undefined
    const message =
      typeof parsed.error === "string"
        ? parsed.error
        : typeof parsed.error === "object" && parsed.error && typeof parsed.error.message === "string"
          ? parsed.error.message
          : typeof parsed.message === "string"
            ? parsed.message
            : trimmed
    return {
      message,
      code,
      isActingContextError: Boolean(code && ACTING_CONTEXT_ERROR_CODES.has(code)),
    }
  } catch {
    return { message: trimmed, isActingContextError: false }
  }
}

/** Extract venue id from admin event rows (column or settings.venue_account_id). */
export function extractEventVenueId(row: Record<string, unknown>): string | null {
  if (typeof row.venue_id === "string" && row.venue_id) return row.venue_id
  const settings = row.settings
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    const venueAccountId = (settings as Record<string, unknown>).venue_account_id
    if (typeof venueAccountId === "string" && venueAccountId) return venueAccountId
  }
  const nestedVenue = row.venue
  if (nestedVenue && typeof nestedVenue === "object" && !Array.isArray(nestedVenue)) {
    const id = (nestedVenue as Record<string, unknown>).id
    if (typeof id === "string" && id) return id
  }
  return null
}

export function extractEventVenueName(row: Record<string, unknown>): string | null {
  if (typeof row.venue_name === "string" && row.venue_name) return row.venue_name
  const nestedVenue = row.venue
  if (nestedVenue && typeof nestedVenue === "object" && !Array.isArray(nestedVenue)) {
    const name = (nestedVenue as Record<string, unknown>).name
    if (typeof name === "string" && name) return name
  }
  return null
}

export interface PersistShiftInput {
  title?: string
  eventName?: string
  venueName?: string
  department?: string
  role?: string
  shiftType?: ShiftType
  priority?: Priority
  date: string
  startTime: string
  endTime: string
  breakMinutes?: number
  neededStaffCount?: number
  requiredSkills?: string[]
  notes?: string
  staffInstructions?: string
  assignedStaffIds?: string[]
  /** When true, notify assigned workers immediately (Save & publish). */
  notify?: boolean
}

export interface SchedulingMutationResult {
  ok: boolean
  error?: string
}

interface RawShift {
  id: string
  staff_shift_plan_id?: string | null
  venue_id?: string | null
  org_id?: string | null
  adhoc_venue_id?: string | null
  event_id?: string | null
  staff_member_id?: string | null
  staff_member_name?: string | null
  shift_date?: string | null
  start_time?: string | null
  end_time?: string | null
  break_duration?: number | null
  zone_assignment?: string | null
  role_assignment?: string | null
  notes?: string | null
  status?: string | null
  updated_at?: string | null
}

interface RawRosterMember {
  id: string
  userId?: string | null
  user_id?: string | null
  name?: string | null
  full_name?: string | null
  email?: string | null
  phone?: string | null
  position?: string | null
  role?: string | null
  department?: string | null
  status?: string | null
  complianceStatus?: string | null
  compliance_status?: string | null
}

function normalizeRosterPayload(payload: unknown): RawRosterMember[] {
  if (Array.isArray(payload)) return payload as RawRosterMember[]

  if (payload && typeof payload === "object" && Array.isArray((payload as { members?: unknown }).members)) {
    return ((payload as { members: Array<Record<string, unknown>> }).members).map((member) => {
      const profile = (member.profile ?? {}) as Record<string, unknown>
      return {
        id: String(member.id),
        userId: typeof member.userId === "string" ? member.userId : null,
        user_id: typeof member.userId === "string" ? member.userId : null,
        name: typeof profile.fullName === "string" ? profile.fullName : typeof member.name === "string" ? member.name : null,
        full_name: typeof profile.fullName === "string" ? profile.fullName : null,
        email: typeof profile.email === "string" ? profile.email : typeof member.email === "string" ? member.email : null,
        phone: typeof profile.phone === "string" ? profile.phone : typeof member.phone === "string" ? member.phone : null,
        position: typeof member.position === "string" ? member.position : typeof member.role === "string" ? member.role : null,
        role: typeof member.position === "string" ? member.position : typeof member.role === "string" ? member.role : null,
        department: typeof member.department === "string" ? member.department : null,
        status: typeof member.status === "string" ? member.status : null,
        complianceStatus: typeof member.complianceStatus === "string" ? member.complianceStatus : null,
        compliance_status: typeof member.complianceStatus === "string" ? member.complianceStatus : null,
      }
    })
  }

  return []
}

interface RawZone {
  id: string
  zone_name?: string | null
  name?: string | null
  zone_type?: string | null
  venue_id?: string | null
  event_id?: string | null
  required_staff_count?: number | null
  assigned_staff_count?: number | null
}

interface RawEvent {
  id: string
  name?: string | null
  title?: string | null
  event_date?: string | null
  start_at?: string | null
  venue_id?: string | null
  venue_name?: string | null
  tour_id?: string | null
  settings?: Record<string, unknown> | null
  venue?: { id?: string | null; name?: string | null } | null
}

function isHiringEntity(value: unknown): value is HiringEntity {
  return Boolean(
    value &&
      typeof value === "object" &&
      "entityType" in value &&
      "entityId" in value &&
      "displayName" in value &&
      typeof (value as HiringEntity).entityType === "string" &&
      typeof (value as HiringEntity).entityId === "string" &&
      typeof (value as HiringEntity).displayName === "string",
  )
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function buildWeekDays(weekStart: Date): WeekDay[] {
  const today = isoDate(new Date())
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const label = date.toLocaleDateString("en-US", { weekday: "long" })
    return {
      key: label.slice(0, 3).toLowerCase(),
      label,
      short: label.slice(0, 3),
      date: isoDate(date),
      dayNumber: date.getDate(),
      isToday: isoDate(date) === today,
    }
  })
}

function normalizeDepartment(value?: string | null): Department {
  const normalized = (value ?? "").toLowerCase()
  if (normalized.includes("production") || normalized.includes("stage") || normalized.includes("audio") || normalized.includes("lighting")) return "Production"
  if (normalized.includes("front") || normalized.includes("door") || normalized.includes("guest")) return "Front of House"
  if (normalized.includes("security")) return "Security"
  if (normalized.includes("hospitality") || normalized.includes("bar")) return "Hospitality"
  if (normalized.includes("box") || normalized.includes("ticket")) return "Box Office"
  if (normalized.includes("merch")) return "Merch"
  return "Operations"
}

function normalizeShiftStatus(value?: string | null, assignedStaff?: StaffMember): ShiftStatus {
  if (value === "confirmed" || value === "completed") return "confirmed"
  if (value === "cancelled") return "cancelled"
  if (value === "declined") return "declined"
  if (!assignedStaff) return "open"
  if (value === "scheduled") return "pending"
  return "published"
}

function confirmationFor(value?: string | null): ConfirmationStatus {
  if (value === "confirmed" || value === "completed") return "confirmed"
  if (value === "declined") return "declined"
  if (value === "cancelled") return "declined"
  if (value === "scheduled") return "pending"
  return "none"
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  if (![sh, sm, eh, em].every(Number.isFinite)) return 0
  const startMinutes = sh * 60 + sm
  let endMinutes = eh * 60 + em
  if (endMinutes <= startMinutes) endMinutes += 24 * 60
  return endMinutes - startMinutes
}

function overlaps(a: RawShift, b: RawShift) {
  if (!a.shift_date || a.shift_date !== b.shift_date) return false
  const aStart = minutesFromMidnight(a.start_time)
  const aEnd = minutesFromMidnight(a.end_time, aStart)
  const bStart = minutesFromMidnight(b.start_time)
  const bEnd = minutesFromMidnight(b.end_time, bStart)
  return aStart < bEnd && bStart < aEnd
}

function minutesFromMidnight(time?: string | null, start?: number) {
  if (!time) return 0
  const [h, m] = time.split(":").map(Number)
  let minutes = (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
  if (start !== undefined && minutes <= start) minutes += 24 * 60
  return minutes
}

function priorityForShift(status: ShiftStatus, hasConflict: boolean): Priority {
  if (hasConflict) return "critical"
  if (status === "open" || status === "declined") return "high"
  if (status === "pending") return "medium"
  return "low"
}

function eventNameFor(row: RawShift, events: SchedulingEventOption[]) {
  return events.find((event) => event.id === row.event_id)?.name ?? "Unassigned event"
}

function venueNameFor(row: RawShift, events: SchedulingEventOption[], fallbackVenueName?: string | null) {
  const event = events.find((candidate) => candidate.id === row.event_id)
  return event?.venueName ?? fallbackVenueName ?? "Venue TBD"
}

function mapEvents(rows: RawEvent[]): SchedulingEventOption[] {
  return rows
    .map((row) => {
      const asRecord = row as unknown as Record<string, unknown>
      return {
        id: String(row.id),
        name: String(row.name ?? row.title ?? "Untitled event"),
        venueId: extractEventVenueId(asRecord),
        venueName: extractEventVenueName(asRecord) ?? row.venue_name ?? null,
        startsAt: row.event_date ?? row.start_at ?? null,
        tourId: typeof row.tour_id === "string" ? row.tour_id : null,
      }
    })
    .filter((event) => event.id)
}

function deriveStaff(rows: RawRosterMember[], shifts: RawShift[], conflicts: SchedulingConflict[]): StaffMember[] {
  return rows.map((row) => {
    const memberShifts = shifts.filter((shift) => shift.staff_member_id === row.id)
    const confirmed = memberShifts.some((shift) => shift.status === "confirmed" || shift.status === "completed")
    const pending = memberShifts.some((shift) => shift.status === "scheduled")
    const scheduled = memberShifts.length > 0
    const weeklyMinutes = memberShifts.reduce((total, shift) => total + minutesBetween(shift.start_time, shift.end_time), 0)
    const conflictCount = conflicts.filter((conflict) => conflict.staffName === (row.name ?? row.full_name)).length
    const department = normalizeDepartment(row.department ?? row.role ?? row.position)
    const role = row.position ?? row.role ?? "Staff"
    const name = row.name ?? row.full_name ?? row.email ?? "Unnamed staff"
    const compliance = row.complianceStatus ?? row.compliance_status

    return {
      id: row.id,
      name,
      role,
      department,
      // WORK-104 — without persisted intervals, unscheduled ≠ available.
      availabilityStatus: scheduled ? "scheduled" : "pending",
      confirmationStatus: confirmed ? "confirmed" : pending ? "pending" : "none",
      skills: [role, department].filter(Boolean),
      email: row.email ?? "No email on file",
      phone: row.phone ?? "No phone on file",
      credentials: compliance && compliance !== "not_started" ? [compliance.replace(/_/g, " ")] : [],
      confirmationRate: confirmed ? 100 : pending ? 0 : 0,
      upcomingShifts: memberShifts.length,
      weeklyHours: Math.round(weeklyMinutes / 60),
      conflictCount,
      notes: row.status && row.status !== "active" ? `Roster status: ${row.status}` : undefined,
      workedEvents: [],
      lastAssignedDaysAgo: memberShifts.length > 0 ? 0 : 0,
    }
  })
}

function deriveRawConflicts(shifts: RawShift[], rosterRows: RawRosterMember[], events: SchedulingEventOption[]) {
  const conflicts: SchedulingConflict[] = []
  const activeStaffIds = new Set(rosterRows.map((row) => row.id))
  const byStaff = new Map<string, RawShift[]>()

  for (const shift of shifts) {
    if (!shift.staff_member_id) continue
    byStaff.set(shift.staff_member_id, [...(byStaff.get(shift.staff_member_id) ?? []), shift])
  }

  for (const [staffId, staffShifts] of byStaff) {
    const staffName = rosterRows.find((row) => row.id === staffId)?.name ?? rosterRows.find((row) => row.id === staffId)?.full_name
    for (let i = 0; i < staffShifts.length; i += 1) {
      for (let j = i + 1; j < staffShifts.length; j += 1) {
        if (!overlaps(staffShifts[i], staffShifts[j])) continue
        conflicts.push({
          id: `overlap-${staffShifts[i].id}-${staffShifts[j].id}`,
          type: "double-booked",
          title: `${staffName ?? "Staff"} double-booked`,
          detail: `Two assignments overlap on ${staffShifts[i].shift_date}.`,
          severity: "critical",
          staffName: staffName ?? undefined,
          shiftTitle: staffShifts[i].role_assignment ?? "Shift",
          suggestedResolution: "Reassign one shift or adjust the times.",
          suggestedReplacements: [],
        })
      }
    }
  }

  for (const shift of shifts) {
    if (shift.staff_member_id && !activeStaffIds.has(shift.staff_member_id)) {
      conflicts.push({
        id: `inactive-${shift.id}`,
        type: "missing-role",
        title: "Assigned staff is not in active roster",
        detail: `${shift.role_assignment ?? "Shift"} is assigned to a staff member outside the active roster.`,
        severity: "high",
        shiftTitle: shift.role_assignment ?? "Shift",
        suggestedResolution: "Assign an active onboarded staff member.",
        suggestedReplacements: rosterRows.slice(0, 3).map((row) => row.name ?? row.full_name ?? "Staff"),
      })
    }

    if (!shift.event_id || !events.some((event) => event.id === shift.event_id)) {
      conflicts.push({
        id: `event-${shift.id}`,
        type: "no-venue",
        title: "Shift is missing event context",
        detail: `${shift.role_assignment ?? "Shift"} is not linked to a known event.`,
        severity: "low",
        shiftTitle: shift.role_assignment ?? "Shift",
        suggestedResolution: "Attach the shift to an event before publishing.",
        suggestedReplacements: [],
      })
    }
  }

  return conflicts
}

function deriveShifts(rawShifts: RawShift[], staff: StaffMember[], events: SchedulingEventOption[], conflicts: SchedulingConflict[]): Shift[] {
  const conflictShiftTitles = new Set(conflicts.map((conflict) => conflict.shiftTitle))

  return rawShifts.map((row) => {
    const assignedStaff = staff.find((member) => member.id === row.staff_member_id)
    const status = normalizeShiftStatus(row.status, assignedStaff)
    const department = normalizeDepartment(row.zone_assignment ?? row.role_assignment)
    const role = row.role_assignment ?? row.zone_assignment ?? "Staff"
    const title = row.role_assignment || row.zone_assignment || `${role} shift`
    const hasConflict = conflictShiftTitles.has(row.role_assignment ?? "Shift")

    return {
      id: row.id,
      title,
      eventName: eventNameFor(row, events),
      venueName: venueNameFor(row, events),
      department,
      role,
      date: row.shift_date ?? isoDate(new Date()),
      startTime: (row.start_time ?? "09:00").slice(0, 5),
      endTime: (row.end_time ?? "17:00").slice(0, 5),
      status,
      assignedStaff,
      neededStaffCount: 1,
      notes: row.notes ?? undefined,
      hasConflict,
      priority: priorityForShift(status, hasConflict),
      shiftType: row.event_id ? "event" : "venue",
      updatedAt: row.updated_at ? new Date(row.updated_at).toLocaleDateString("en-US") : "Live",
      requiredSkills: [role].filter(Boolean),
    }
  })
}

function deriveOpenShifts(shifts: Shift[], _zones: RawZone[], _events: SchedulingEventOption[], staff: StaffMember[]): OpenShift[] {
  const fromUnassigned = shifts
    .filter((shift) => !shift.assignedStaff || shift.status === `open` || shift.status === `declined`)
    .map<OpenShift>((shift) => ({
      id: shift.id,
      role: shift.role,
      department: shift.department,
      eventName: shift.eventName,
      venueName: shift.venueName,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      priority: shift.priority === "critical" ? "high" : shift.priority,
      suggestedStaff: staff
        .filter(
          (member) =>
            member.department === shift.department
            || member.availabilityStatus === "pending"
            || member.availabilityStatus === "scheduled",
        )
        .slice(0, 3)
        .map((member) => member.name),
    }))

  // Zone coverage is an event requirement, not a shift. It becomes an open shift only
  // after a manager creates a real shared shift plan with explicit dates and times.
  return fromUnassigned
}

/** @deprecated Demo-only invent path removed from live; use deriveLiveAvailability. */
function deriveAvailability(staff: StaffMember[], weekDays: WeekDay[], shifts: Shift[] = []): StaffAvailability[] {
  return deriveLiveAvailability(staff, weekDays, shifts)
}

async function getJson(url: string, extraHeaders?: Record<string, string>) {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    headers: extraHeaders,
  })
  if (!res.ok) {
    const raw = await res.text()
    const parsed = parseSchedulingApiError(raw)
    const error = new Error(parsed.message) as Error & { code?: string; isActingContextError?: boolean }
    error.code = parsed.code
    error.isActingContextError = parsed.isActingContextError
    throw error
  }
  return res.json()
}

function buildShiftsQuery(args: {
  employer: HiringEntity
  venueId: string | null
  eventId: string
  dateFrom: string
  dateTo: string
}): string {
  const params = new URLSearchParams()
  params.set("entity_type", args.employer.entityType)
  params.set("entity_id", args.employer.entityId)
  params.set("date_from", args.dateFrom)
  params.set("date_to", args.dateTo)
  if (args.venueId) params.set("venueId", args.venueId)
  if (args.eventId !== "all") params.set("eventId", args.eventId)
  return params.toString()
}

export function useSchedulingData(
  employerInput?: unknown,
  initialEventId?: string | null,
  initialVenueId?: string | null,
  initialMode?: SchedulingMode | null,
): SchedulingDataState {
  const { actingHeaders } = useActingContext()
  const employer = isHiringEntity(employerInput) ? employerInput : null
  const defaultMode: SchedulingMode = initialMode ?? (employer ? "live" : "demo")
  const [mode, setModeState] = useState<SchedulingMode>(defaultMode)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [eventId, setEventId] = useState(initialEventId ?? employer?.scope?.eventId ?? "all")
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(
    initialVenueId ?? (employer ? resolveSchedulingVenueId(employer) : null),
  )
  const [rawEvents, setRawEvents] = useState<SchedulingEventOption[]>([])
  const [rawRoster, setRawRoster] = useState<RawRosterMember[]>([])
  const [rawShifts, setRawShifts] = useState<RawShift[]>([])
  const [rawZones, setRawZones] = useState<RawZone[]>([])
  const [loading, setLoading] = useState(Boolean(employer) && defaultMode === "live")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const usingFallback = mode === "demo"
  const weekDays = useMemo(() => buildWeekDays(weekStart), [weekStart])
  const selectedEvent = rawEvents.find((event) => event.id === eventId)
  const venueId =
    selectedEvent?.venueId ?? selectedVenueId ?? (employer ? resolveSchedulingVenueId(employer) : null)

  const setMode = useCallback((next: SchedulingMode) => {
    setModeState(next)
    setError(null)
  }, [])

  const setVenueId = useCallback((next: string | null) => {
    setSelectedVenueId(next)
  }, [])

  const reload = useCallback(async () => {
    if (mode === "demo") {
      setLoading(false)
      setError(null)
      return
    }

    if (!employer) {
      setLoading(false)
      setRawEvents([])
      setRawRoster([])
      setRawShifts([])
      setRawZones([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      if (!shouldLoadLiveSchedulingDetails({ mode, employer })) {
        setRawEvents([])
        setRawRoster([])
        setRawShifts([])
        setRawZones([])
        return
      }

      const employerQuery = getEmployerQueryString(employer)
      const [eventsResult, rosterResult] = await Promise.allSettled([
        getJson("/api/admin/events", actingHeaders),
        getJson(`/api/hiring/roster?${employerQuery}&status=active&limit=200`, actingHeaders),
      ])

      let softNotice: string | null = null

      if (eventsResult.status === "rejected") {
        const reason = eventsResult.reason
        const isActingContext =
          reason instanceof Error && Boolean((reason as Error & { isActingContextError?: boolean }).isActingContextError)
        if (isActingContext) {
          softNotice = "Events unavailable for this account — you can still schedule org-wide shifts."
        } else {
          softNotice = reason instanceof Error ? reason.message : "Failed to load events"
        }
      }
      if (rosterResult.status === "rejected") {
        setError(rosterResult.reason instanceof Error ? rosterResult.reason.message : "Failed to load roster")
      } else if (softNotice) {
        setError(softNotice)
      }

      const eventRows = eventsResult.status === "fulfilled" ? (eventsResult.value.events ?? []) : []
      const nextEvents = mapEvents(eventRows)
      setRawEvents(nextEvents)

      const rosterPayload = rosterResult.status === "fulfilled" ? rosterResult.value.data : null
      const rosterRows = normalizeRosterPayload(rosterPayload)
      setRawRoster(rosterRows)

      const resolvedEventId = eventId !== "all" ? eventId : employer.scope?.eventId ?? "all"
      const selected = nextEvents.find((event) => event.id === resolvedEventId)
      const resolvedVenueId =
        selected?.venueId ?? selectedVenueId ?? initialVenueId ?? resolveSchedulingVenueId(employer)

      const from = isoDate(weekStart)
      const to = isoDate(addDays(weekStart, 6))
      const shiftsQs = buildShiftsQuery({
        employer,
        venueId: resolvedVenueId,
        eventId: resolvedEventId,
        dateFrom: from,
        dateTo: to,
      })

      const zonesPromise = resolvedVenueId
        ? getJson(
            `/api/admin/staffing/zones?venue_id=${encodeURIComponent(resolvedVenueId)}${
              resolvedEventId !== "all" ? `&eventId=${encodeURIComponent(resolvedEventId)}` : ""
            }`,
            actingHeaders,
          )
        : Promise.resolve({ data: [] as RawZone[] })

      const [shiftsResult, zonesResult] = await Promise.allSettled([
        getJson(`/api/admin/staffing/shifts?${shiftsQs}`, actingHeaders),
        zonesPromise,
      ])

      if (shiftsResult.status === "rejected") {
        setError(shiftsResult.reason instanceof Error ? shiftsResult.reason.message : "Failed to load shifts")
        setRawShifts([])
      } else {
        setRawShifts(shiftsResult.value.data ?? [])
        if (softNotice && rosterResult.status === "fulfilled") {
          // Keep soft events notice only when shifts loaded successfully.
          setError(softNotice)
        }
      }

      if (zonesResult.status === "rejected") {
        setRawZones([])
      } else {
        setRawZones(zonesResult.value.data ?? zonesResult.value.zones ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load scheduling data")
      setRawShifts([])
      setRawZones([])
    } finally {
      setLoading(false)
    }
  }, [actingHeaders, employer, eventId, initialVenueId, mode, selectedVenueId, weekStart])

  useEffect(() => {
    void reload()
  }, [reload])

  const conflictsFromRows = useMemo(
    () => deriveRawConflicts(rawShifts, rawRoster, rawEvents),
    [rawEvents, rawRoster, rawShifts],
  )
  const liveStaff = useMemo(() => deriveStaff(rawRoster, rawShifts, conflictsFromRows), [conflictsFromRows, rawRoster, rawShifts])
  const liveShifts = useMemo(() => deriveShifts(rawShifts, liveStaff, rawEvents, conflictsFromRows), [conflictsFromRows, liveStaff, rawEvents, rawShifts])
  const liveOpenShifts = useMemo(() => deriveOpenShifts(liveShifts, rawZones, rawEvents, liveStaff), [liveShifts, liveStaff, rawEvents, rawZones])
  const liveAvailability = useMemo(
    () => deriveLiveAvailability(liveStaff, weekDays, liveShifts),
    [liveStaff, liveShifts, weekDays],
  )

  const fallbackEvents = useMemo(() => FALLBACK_EVENTS.map((name, index) => ({ id: `fallback-event-${index}`, name })), [])
  const fallbackVenues = useMemo(() => FALLBACK_VENUES.map((name, index) => ({ id: `fallback-venue-${index}`, name })), [])

  const liveVenues = useMemo(() => {
    const map = new Map<string, string>()
    for (const event of rawEvents) {
      if (event.venueId) map.set(event.venueId, event.venueName ?? "Venue")
    }
    if (selectedVenueId && !map.has(selectedVenueId)) map.set(selectedVenueId, "Selected venue")
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [rawEvents, selectedVenueId])

  const setEvent = useCallback((nextEventId: string) => {
    setEventId(nextEventId)
    const event = rawEvents.find((candidate) => candidate.id === nextEventId)
    if (event?.venueId) setSelectedVenueId(event.venueId)
  }, [rawEvents])

  const persist = useCallback(
    async (action: () => Promise<void>): Promise<SchedulingMutationResult> => {
      if (mode === "demo") return { ok: false, error: DEMO_MUTATION_ERROR }
      if (!employer) return { ok: false, error: "A hiring account is required before saving shifts." }
      setSaving(true)
      try {
        await action()
        await reload()
        return { ok: true }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Scheduling update failed" }
      } finally {
        setSaving(false)
      }
    },
    [employer, mode, reload],
  )

  const resolveEventIdForInput = useCallback(
    (input: PersistShiftInput) => {
      if (eventId !== "all") return eventId
      return rawEvents.find((event) => event.name === input.eventName)?.id ?? employer?.scope?.eventId ?? undefined
    },
    [employer?.scope?.eventId, eventId, rawEvents],
  )

  const createShift = useCallback(
    async (input: PersistShiftInput) =>
      persist(async () => {
        if (!employer) throw new Error("A hiring account is required before saving this shift.")
        const staffIds = input.assignedStaffIds?.filter(Boolean) ?? []
        if (input.notify && staffIds.length === 0) throw new Error("Select at least one staff member before publishing this shift.")
        const resolvedEventId = resolveEventIdForInput(input)
        // Venue resolution: event's venue → the venue picked in the form
        // (matched by name against live venue options) → page-level venue context.
        const resolvedVenueId =
          rawEvents.find((event) => event.id === resolvedEventId)?.venueId
          ?? liveVenues.find((venue) => venue.name === input.venueName)?.id
          ?? venueId

        const start = new Date(`${input.date}T${input.startTime || "00:00"}:00`)
        const end = new Date(`${input.date}T${input.endTime || "00:00"}:00`)
        if (end <= start) end.setDate(end.getDate() + 1)
        const event = rawEvents.find((candidate) => candidate.id === resolvedEventId)
        const createResponse = await fetch("/api/admin/staffing/shift-plans", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            employerEntityType: employer.entityType,
            employerEntityId: employer.entityId,
            tourId: event?.tourId ?? null,
            eventId: resolvedEventId ?? null,
            title: input.title || input.role || "Shift",
            role: input.role || null,
            department: input.department || null,
            shiftType: input.shiftType || "event",
            priority: input.priority || "medium",
            requiredHeadcount: input.neededStaffCount || 1,
            requiredSkills: input.requiredSkills || [],
            startsAt: start.toISOString(),
            endsAt: end.toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            breakDurationMinutes: input.breakMinutes || 0,
            location: {
              type: "onsite",
              venueId: resolvedVenueId ?? null,
              name: input.venueName || event?.venueName || null,
              address: null,
            },
            workerInstructions: input.staffInstructions || null,
            managerNotes: input.notes || null,
          }),
        })
        const createBody = await createResponse.json().catch(() => null)
        if (!createResponse.ok) throw new Error(createBody?.error || "Failed to create shared shift")

        if (input.notify) {
          const publishResponse = await fetch(`/api/admin/staffing/shift-plans/${createBody.plan.id}/publish`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json", ...actingHeaders },
            body: JSON.stringify({ staffMemberIds: staffIds }),
          })
          const publishBody = await publishResponse.json().catch(() => null)
          if (!publishResponse.ok) throw new Error(publishBody?.error || "Failed to publish shared shift")
        }
      }),
    [actingHeaders, employer, persist, rawEvents, resolveEventIdForInput, liveVenues, venueId],
  )

  const updateShift = useCallback(
    async (shiftId: string, input: PersistShiftInput) =>
      persist(async () => {
        const resolvedEventId = resolveEventIdForInput(input)
        const response = await fetch(`/api/admin/staffing/shifts/${shiftId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            event_id: resolvedEventId ?? null,
            shift_date: input.date,
            start_time: input.startTime,
            end_time: input.endTime,
            break_duration: input.breakMinutes ?? 0,
            zone_assignment: input.venueName || null,
            role_assignment: input.role || input.title || null,
            notes: input.notes || input.staffInstructions || null,
            notify: input.notify !== false,
          }),
        })
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Failed to update shift")
      }),
    [persist, resolveEventIdForInput],
  )

  const updateShiftStatus = useCallback(
    async (
      shiftId: string,
      status: "scheduled" | "confirmed" | "completed" | "cancelled",
      options?: { notify?: boolean }
    ) =>
      persist(async () => {
        const response = await fetch(`/api/admin/staffing/shifts/${shiftId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({ status, notify: options?.notify !== false }),
        })
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Failed to update shift status")
      }),
    [persist],
  )

  const deleteShift = useCallback(
    async (shiftId: string) =>
      persist(async () => {
        const response = await fetch(`/api/admin/staffing/shifts/${shiftId}`, {
          method: "DELETE",
          credentials: "include",
          headers: actingHeaders,
        })
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Failed to delete shift")
      }),
    [persist],
  )

  const duplicateShift = useCallback(
    async (shiftId: string, options?: { date?: string }) =>
      persist(async () => {
        const existing = rawShifts.find((row) => row.id === shiftId)
        if (!existing) throw new Error("Shift not found")
        if (!employer) throw new Error("A hiring account is required before duplicating this shift.")

        const newDate = options?.date ?? addDays(new Date(existing.shift_date ?? isoDate(new Date())), 7)
        const resolvedVenueId = existing.venue_id ?? venueId

        const response = await fetch("/api/admin/staffing/shifts", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            venue_id: resolvedVenueId ?? undefined,
            org_id: existing.org_id ?? undefined,
            entity_type: employer.entityType,
            entity_id: employer.entityId,
            event_id: existing.event_id ?? undefined,
            staff_member_id: existing.staff_member_id ?? undefined,
            shift_date: isoDate(newDate),
            start_time: existing.start_time,
            end_time: existing.end_time,
            break_duration: existing.break_duration ?? 0,
            zone_assignment: existing.zone_assignment ?? undefined,
            role_assignment: existing.role_assignment ?? undefined,
            notes: existing.notes ?? undefined,
            notify: false,
          }),
        })
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Failed to duplicate shift")
      }),
    [employer, persist, rawShifts, venueId, actingHeaders],
  )

  const assignStaff = useCallback(
    async (shiftId: string, staffIds: string[]) =>
      persist(async () => {
        if (shiftId.startsWith("zone-open-")) {
          throw new Error("This coverage gap comes from a staffing zone. Create a shift first, then assign staff.")
        }
        const uniqueIds = Array.from(new Set(staffIds.filter(Boolean)))
        if (uniqueIds.length === 0) throw new Error("Select a staff member before assigning.")

        const existing = rawShifts.find((row) => row.id === shiftId)
        if (!existing) throw new Error("Shift not found")
        if (!existing.staff_shift_plan_id) {
          throw new Error("This historical shift must be converted to a shared shift before changing its crew. Create a shared shift from its details to continue.")
        }
        const publishResponse = await fetch(`/api/admin/staffing/shift-plans/${existing.staff_shift_plan_id}/publish`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({ staffMemberIds: uniqueIds }),
        })
        if (!publishResponse.ok) throw new Error((await publishResponse.json().catch(() => null))?.error || "Failed to assign staff")
      }),
    [actingHeaders, persist, rawShifts],
  )

  const publishShifts = useCallback(
    async (shiftIds: string[], options?: { notify?: boolean }) =>
      persist(async () => {
        if (shiftIds.length === 0) throw new Error("Select at least one shift to publish.")
        const response = await fetch("/api/admin/staffing/shifts/publish", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...actingHeaders },
          body: JSON.stringify({
            shift_ids: shiftIds,
            notify: options?.notify !== false,
          }),
        })
        if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Failed to publish shifts")
      }),
    [persist],
  )

  const { needsEmployer, needsVenue } = getLiveSchedulingScopeFlags({
    mode,
    employer,
    venueId,
  })

  return {
    loading,
    saving,
    error,
    mode,
    usingFallback,
    needsVenue,
    needsEmployer,
    hasEmployer: Boolean(employer),
    weekStart,
    weekDays,
    eventId,
    venueId,
    events: usingFallback ? fallbackEvents : rawEvents,
    venues: usingFallback ? fallbackVenues : liveVenues,
    staff: usingFallback ? FALLBACK_STAFF : liveStaff,
    shifts: usingFallback ? FALLBACK_SHIFTS : liveShifts,
    openShifts: usingFallback ? FALLBACK_OPEN_SHIFTS : liveOpenShifts,
    conflicts: usingFallback ? FALLBACK_CONFLICTS : conflictsFromRows,
    templates: selectSchedulingTemplates(mode),
    availability: usingFallback ? FALLBACK_AVAILABILITY : liveAvailability,
    reload,
    setWeekStart,
    setEventId: setEvent,
    setVenueId,
    setMode,
    createShift,
    updateShift,
    updateShiftStatus,
    deleteShift,
    duplicateShift,
    assignStaff,
    publishShifts,
  }
}
