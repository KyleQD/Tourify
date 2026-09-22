// Dummy data + types for the Scheduling & Shifts prototype.
// Structured to mirror future Tourify staff / roster / shift API responses,
// so these constants can be swapped for real fetches with minimal changes.

export type AvailabilityStatus = "available" | "scheduled" | "pending" | "unavailable"
export type ConfirmationStatus = "confirmed" | "pending" | "declined" | "none"
export type ShiftStatus =
  | "draft"
  | "published"
  | "confirmed"
  | "pending"
  | "declined"
  | "conflict"
  | "open"
  | "cancelled"

export type Priority = "low" | "medium" | "high" | "critical"

export type ShiftType = "event" | "venue" | "tour" | "operations"

export type Department =
  | "Production"
  | "Front of House"
  | "Security"
  | "Hospitality"
  | "Box Office"
  | "Merch"
  | "Operations"

export interface StaffMember {
  id: string
  name: string
  avatar?: string
  role: string
  department: Department
  availabilityStatus: AvailabilityStatus
  confirmationStatus: ConfirmationStatus
  skills: string[]
  email: string
  phone: string
  credentials: string[]
  confirmationRate: number
  upcomingShifts: number
  weeklyHours: number
  conflictCount: number
  notes?: string
  workedEvents: string[]
  lastAssignedDaysAgo: number
}

export interface AvailabilitySlot {
  /** matches WEEK_DAYS key */
  day: string
  status: "available" | "unavailable" | "preferred" | "scheduled" | "pending"
}

export interface ShiftTemplate {
  id: string
  name: string
  department: Department
  role: string
  startTime: string
  endTime: string
  neededStaffCount: number
  requiredSkills: string[]
  defaultNotes: string
  instructions: string
  shiftType: ShiftType
  useCount: number
  /** WORK-104 — demo fixtures only; never treat as live org templates. */
  isDemoFixture?: boolean
}

export interface Shift {
  id: string
  title: string
  eventName: string
  venueName: string
  department: Department
  role: string
  /** ISO date string (yyyy-mm-dd) */
  date: string
  startTime: string
  endTime: string
  status: ShiftStatus
  assignedStaff?: StaffMember
  neededStaffCount: number
  notes?: string
  hasConflict?: boolean
  priority: Priority
  shiftType: ShiftType
  updatedAt: string
  requiredSkills: string[]
}

export interface OpenShift {
  id: string
  role: string
  department: Department
  eventName: string
  venueName: string
  date: string
  startTime: string
  endTime: string
  priority: "low" | "medium" | "high"
  suggestedStaff: string[]
}

export type ConflictType =
  | "double-booked"
  | "outside-availability"
  | "missing-role"
  | "missing-credential"
  | "understaffed"
  | "pending-late"
  | "overlapping"
  | "no-venue"
  | "wrong-department"

export interface SchedulingConflict {
  id: string
  type: ConflictType
  title: string
  detail: string
  severity: Priority
  staffName?: string
  shiftTitle: string
  suggestedResolution: string
  suggestedReplacements: string[]
}

export interface WeekDay {
  key: string
  label: string
  short: string
  date: string
  dayNumber: number
  isToday?: boolean
}

export const ROLES = [
  "Event Manager",
  "Stage Manager",
  "Box Office Lead",
  "Security Lead",
  "Runner",
  "Hospitality",
  "Production Assistant",
  "Lighting Tech",
  "Audio Tech",
  "Merchandise Lead",
  "Bar Staff",
  "Door Staff",
] as const

export const DEPARTMENTS: Department[] = [
  "Production",
  "Front of House",
  "Security",
  "Hospitality",
  "Box Office",
  "Merch",
  "Operations",
]

export const EVENTS = [
  "Neon Skyline Tour",
  "Midnight Echo Festival",
  "Aurora Live Sessions",
  "Velvet Underground Night",
]

export const VENUES = [
  "The Prism Arena",
  "Skyline Amphitheater",
  "Warehouse 9",
  "Grand Vaults Hall",
]

export const WEEK_DAYS: WeekDay[] = [
  { key: "mon", label: "Monday", short: "Mon", date: "2026-07-06", dayNumber: 6 },
  { key: "tue", label: "Tuesday", short: "Tue", date: "2026-07-07", dayNumber: 7 },
  { key: "wed", label: "Wednesday", short: "Wed", date: "2026-07-08", dayNumber: 8, isToday: true },
  { key: "thu", label: "Thursday", short: "Thu", date: "2026-07-09", dayNumber: 9 },
  { key: "fri", label: "Friday", short: "Fri", date: "2026-07-10", dayNumber: 10 },
  { key: "sat", label: "Saturday", short: "Sat", date: "2026-07-11", dayNumber: 11 },
  { key: "sun", label: "Sunday", short: "Sun", date: "2026-07-12", dayNumber: 12 },
]

type RawStaff = Pick<
  StaffMember,
  "id" | "name" | "role" | "department" | "availabilityStatus" | "confirmationStatus" | "skills"
> &
  Partial<StaffMember>

const RAW_STAFF: RawStaff[] = [
  {
    id: "s1",
    name: "Maya Chen",
    role: "Event Manager",
    department: "Operations",
    availabilityStatus: "scheduled",
    confirmationStatus: "confirmed",
    skills: ["Leadership", "Comms", "Budget"],
  },
  {
    id: "s2",
    name: "Diego Ramirez",
    role: "Stage Manager",
    department: "Production",
    availabilityStatus: "scheduled",
    confirmationStatus: "confirmed",
    skills: ["Rigging", "Cue Calling", "Safety"],
  },
  {
    id: "s3",
    name: "Priya Nair",
    role: "Box Office Lead",
    department: "Box Office",
    availabilityStatus: "pending",
    confirmationStatus: "pending",
    skills: ["POS", "Ticketing", "Cash Handling"],
  },
  {
    id: "s4",
    name: "Marcus Webb",
    role: "Security Lead",
    department: "Security",
    availabilityStatus: "scheduled",
    confirmationStatus: "confirmed",
    skills: ["Crowd Control", "First Aid", "Access"],
  },
  {
    id: "s5",
    name: "Lena Sorensen",
    role: "Lighting Tech",
    department: "Production",
    availabilityStatus: "available",
    confirmationStatus: "none",
    skills: ["GrandMA", "Programming", "Focus"],
  },
  {
    id: "s6",
    name: "Toby Fields",
    role: "Audio Tech",
    department: "Production",
    availabilityStatus: "pending",
    confirmationStatus: "pending",
    skills: ["FOH Mix", "Line Check", "Wireless"],
  },
  {
    id: "s7",
    name: "Aisha Bello",
    role: "Hospitality",
    department: "Hospitality",
    availabilityStatus: "available",
    confirmationStatus: "none",
    skills: ["Green Room", "Catering", "Rider"],
  },
  {
    id: "s8",
    name: "Jonas Kraft",
    role: "Runner",
    department: "Operations",
    availabilityStatus: "available",
    confirmationStatus: "none",
    skills: ["Logistics", "Driving", "Errands"],
  },
  {
    id: "s9",
    name: "Sofia Marino",
    role: "Merchandise Lead",
    department: "Merch",
    availabilityStatus: "scheduled",
    confirmationStatus: "declined",
    skills: ["Inventory", "POS", "Display"],
  },
  {
    id: "s10",
    name: "Ravi Patel",
    role: "Door Staff",
    department: "Front of House",
    availabilityStatus: "unavailable",
    confirmationStatus: "none",
    skills: ["Scanning", "Greeting", "Queue Mgmt"],
  },
  {
    id: "s11",
    name: "Grace Okafor",
    role: "Bar Staff",
    department: "Hospitality",
    availabilityStatus: "available",
    confirmationStatus: "none",
    skills: ["Mixology", "Till", "Compliance"],
  },
  {
    id: "s12",
    name: "Elias Wolfe",
    role: "Production Assistant",
    department: "Production",
    availabilityStatus: "pending",
    confirmationStatus: "pending",
    skills: ["Load-in", "Cabling", "Support"],
  },
]

const CREDENTIALS_BY_DEPT: Record<Department, string[]> = {
  Production: ["OSHA 10", "Rigging Cert"],
  "Front of House": ["Guest Services"],
  Security: ["SIA License", "First Aid", "Crowd Safety"],
  Hospitality: ["Food Handler", "Alcohol Service"],
  "Box Office": ["PCI Compliance"],
  Merch: ["Cash Handling"],
  Operations: ["Driver License", "First Aid"],
}

function emailFor(name: string) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@tourify.live`
}

function phoneFor(id: string) {
  const n = Number.parseInt(id.replace(/\D/g, ""), 10) || 0
  return `+1 (555) 0${(100 + n * 7).toString().slice(0, 2)}-${(2000 + n * 137).toString().slice(0, 4)}`
}

// Deterministic enrichment so the roster feels real without a backend.
export const STAFF: StaffMember[] = RAW_STAFF.map((raw, i) => {
  const rate = 72 + ((i * 13) % 27)
  return {
    email: emailFor(raw.name),
    phone: phoneFor(raw.id),
    credentials: CREDENTIALS_BY_DEPT[raw.department],
    confirmationRate: rate,
    upcomingShifts: (i % 4) + (raw.availabilityStatus === "scheduled" ? 3 : 1),
    weeklyHours: 12 + ((i * 9) % 34),
    conflictCount: raw.availabilityStatus === "scheduled" && i % 4 === 0 ? 1 : 0,
    notes:
      i % 3 === 0
        ? "Reliable, prefers evening call times. Strong with high-pressure show days."
        : undefined,
    workedEvents: EVENTS.filter((_, ei) => (i + ei) % 3 === 0),
    lastAssignedDaysAgo: (i * 3) % 21,
    ...raw,
  }
})

const staffById = (id: string) => STAFF.find((s) => s.id === id)

type RawShift = Omit<Shift, "priority" | "shiftType" | "updatedAt" | "requiredSkills"> &
  Partial<Shift>

const RAW_SHIFTS: RawShift[] = [
  {
    id: "sh1",
    title: "Show Call — Event Lead",
    eventName: "Neon Skyline Tour",
    venueName: "The Prism Arena",
    department: "Operations",
    role: "Event Manager",
    date: "2026-07-06",
    startTime: "14:00",
    endTime: "23:00",
    status: "confirmed",
    assignedStaff: staffById("s1"),
    neededStaffCount: 1,
    notes: "Full production day. Owns run-of-show and radio channel 1.",
  },
  {
    id: "sh2",
    title: "Stage Deck",
    eventName: "Neon Skyline Tour",
    venueName: "The Prism Arena",
    department: "Production",
    role: "Stage Manager",
    date: "2026-07-06",
    startTime: "12:00",
    endTime: "23:30",
    status: "confirmed",
    assignedStaff: staffById("s2"),
    neededStaffCount: 1,
  },
  {
    id: "sh3",
    title: "Lighting Focus",
    eventName: "Neon Skyline Tour",
    venueName: "The Prism Arena",
    department: "Production",
    role: "Lighting Tech",
    date: "2026-07-07",
    startTime: "10:00",
    endTime: "18:00",
    status: "published",
    assignedStaff: staffById("s5"),
    neededStaffCount: 2,
  },
  {
    id: "sh4",
    title: "Box Office Open",
    eventName: "Aurora Live Sessions",
    venueName: "Warehouse 9",
    department: "Box Office",
    role: "Box Office Lead",
    date: "2026-07-08",
    startTime: "16:00",
    endTime: "21:00",
    status: "pending",
    assignedStaff: staffById("s3"),
    neededStaffCount: 1,
    notes: "Awaiting confirmation — event is in 2 days.",
  },
  {
    id: "sh5",
    title: "Perimeter & Doors",
    eventName: "Aurora Live Sessions",
    venueName: "Warehouse 9",
    department: "Security",
    role: "Security Lead",
    date: "2026-07-08",
    startTime: "15:00",
    endTime: "23:00",
    status: "confirmed",
    assignedStaff: staffById("s4"),
    neededStaffCount: 3,
  },
  {
    id: "sh6",
    title: "FOH Audio",
    eventName: "Aurora Live Sessions",
    venueName: "Warehouse 9",
    department: "Production",
    role: "Audio Tech",
    date: "2026-07-08",
    startTime: "14:00",
    endTime: "23:00",
    status: "conflict",
    assignedStaff: staffById("s6"),
    neededStaffCount: 1,
    hasConflict: true,
    notes: "Overlaps with Toby's merch load-in shift.",
  },
  {
    id: "sh7",
    title: "Green Room & Rider",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    department: "Hospitality",
    role: "Hospitality",
    date: "2026-07-10",
    startTime: "12:00",
    endTime: "20:00",
    status: "published",
    assignedStaff: staffById("s7"),
    neededStaffCount: 2,
  },
  {
    id: "sh8",
    title: "Merch Stand",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    department: "Merch",
    role: "Merchandise Lead",
    date: "2026-07-10",
    startTime: "17:00",
    endTime: "23:59",
    status: "declined",
    assignedStaff: staffById("s9"),
    neededStaffCount: 1,
    notes: "Sofia declined — needs reassignment.",
  },
  {
    id: "sh9",
    title: "Festival Ops Lead",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    department: "Operations",
    role: "Event Manager",
    date: "2026-07-11",
    startTime: "09:00",
    endTime: "23:59",
    status: "confirmed",
    assignedStaff: staffById("s1"),
    neededStaffCount: 1,
  },
  {
    id: "sh10",
    title: "Main Stage Deck",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    department: "Production",
    role: "Stage Manager",
    date: "2026-07-11",
    startTime: "08:00",
    endTime: "23:59",
    status: "conflict",
    assignedStaff: staffById("s2"),
    neededStaffCount: 1,
    hasConflict: true,
    notes: "Diego double-booked across two stages.",
  },
  {
    id: "sh11",
    title: "Bar Service",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    department: "Hospitality",
    role: "Bar Staff",
    date: "2026-07-11",
    startTime: "16:00",
    endTime: "23:59",
    status: "draft",
    neededStaffCount: 4,
    notes: "Draft — assigning bar team.",
  },
  {
    id: "sh12",
    title: "VIP Doors",
    eventName: "Velvet Underground Night",
    venueName: "Grand Vaults Hall",
    department: "Front of House",
    role: "Door Staff",
    date: "2026-07-12",
    startTime: "18:00",
    endTime: "23:59",
    status: "open",
    neededStaffCount: 2,
  },
  {
    id: "sh13",
    title: "Load-in Runner",
    eventName: "Velvet Underground Night",
    venueName: "Grand Vaults Hall",
    department: "Operations",
    role: "Runner",
    date: "2026-07-12",
    startTime: "10:00",
    endTime: "16:00",
    status: "published",
    assignedStaff: staffById("s8"),
    neededStaffCount: 1,
  },
]

const UPDATED_LABELS = ["2h ago", "5h ago", "Yesterday", "2 days ago", "3 days ago", "1 week ago"]

function priorityFor(shift: RawShift, i: number): Priority {
  if (shift.hasConflict) return "critical"
  if (shift.status === "open" || shift.status === "declined") return "high"
  if (shift.status === "pending") return "medium"
  return (["low", "medium", "high"] as const)[i % 3]
}

export const SHIFTS: Shift[] = RAW_SHIFTS.map((raw, i) => ({
  priority: priorityFor(raw, i),
  shiftType: (["event", "venue", "tour", "operations"] as const)[i % 4],
  updatedAt: UPDATED_LABELS[i % UPDATED_LABELS.length],
  requiredSkills: raw.assignedStaff?.skills?.slice(0, 2) ?? ["Reliability", "Comms"],
  ...raw,
}))

export const OPEN_SHIFTS: OpenShift[] = [
  {
    id: "os1",
    role: "Audio Tech",
    department: "Production",
    eventName: "Aurora Live Sessions",
    venueName: "Warehouse 9",
    date: "2026-07-08",
    startTime: "14:00",
    endTime: "23:00",
    priority: "high",
    suggestedStaff: ["Toby Fields", "Elias Wolfe"],
  },
  {
    id: "os2",
    role: "Door Staff",
    department: "Front of House",
    eventName: "Velvet Underground Night",
    venueName: "Grand Vaults Hall",
    date: "2026-07-12",
    startTime: "18:00",
    endTime: "23:59",
    priority: "medium",
    suggestedStaff: ["Ravi Patel", "Jonas Kraft"],
  },
  {
    id: "os3",
    role: "Bar Staff",
    department: "Hospitality",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    date: "2026-07-11",
    startTime: "16:00",
    endTime: "23:59",
    priority: "high",
    suggestedStaff: ["Grace Okafor", "Aisha Bello"],
  },
  {
    id: "os4",
    role: "Merchandise Lead",
    department: "Merch",
    eventName: "Midnight Echo Festival",
    venueName: "Skyline Amphitheater",
    date: "2026-07-10",
    startTime: "17:00",
    endTime: "23:59",
    priority: "medium",
    suggestedStaff: ["Sofia Marino"],
  },
]

export const CONFLICTS: SchedulingConflict[] = [
  {
    id: "c1",
    type: "double-booked",
    title: "Diego Ramirez double-booked",
    detail: "Assigned to Main Stage & Second Stage on Sat, Jul 11 (08:00–23:59).",
    severity: "critical",
    staffName: "Diego Ramirez",
    shiftTitle: "Main Stage Deck",
    suggestedResolution: "Reassign one stage to another Stage Manager.",
    suggestedReplacements: ["Elias Wolfe", "Lena Sorensen"],
  },
  {
    id: "c2",
    type: "outside-availability",
    title: "Toby Fields outside availability",
    detail: "FOH Audio on Jul 8 overlaps a marked-unavailable window.",
    severity: "critical",
    staffName: "Toby Fields",
    shiftTitle: "FOH Audio",
    suggestedResolution: "Reassign to an available Audio Tech or adjust shift time.",
    suggestedReplacements: ["Lena Sorensen", "Elias Wolfe"],
  },
  {
    id: "c3",
    type: "understaffed",
    title: "VIP Doors understaffed",
    detail: "2 Door Staff needed for Velvet Underground Night (Jul 12) — 0 assigned.",
    severity: "high",
    shiftTitle: "VIP Doors",
    suggestedResolution: "Assign 2 Door Staff from the available pool.",
    suggestedReplacements: ["Ravi Patel", "Jonas Kraft"],
  },
  {
    id: "c4",
    type: "missing-role",
    title: "Missing Stage Manager",
    detail: "No Stage Manager assigned for Aurora Live Sessions (Jul 8).",
    severity: "high",
    shiftTitle: "Aurora Live — Stage",
    suggestedResolution: "Add a Stage Manager shift and assign qualified crew.",
    suggestedReplacements: ["Diego Ramirez"],
  },
  {
    id: "c5",
    type: "pending-late",
    title: "Late confirmation risk",
    detail: "Priya Nair (Box Office) unconfirmed — event in under 48h.",
    severity: "medium",
    staffName: "Priya Nair",
    shiftTitle: "Box Office Open",
    suggestedResolution: "Send confirmation reminder or line up a backup.",
    suggestedReplacements: ["Grace Okafor"],
  },
  {
    id: "c6",
    type: "missing-credential",
    title: "Missing SIA credential",
    detail: "Assigned door crew lacks an active SIA license for Jul 12.",
    severity: "high",
    staffName: "Jonas Kraft",
    shiftTitle: "VIP Doors",
    suggestedResolution: "Swap for licensed security staff.",
    suggestedReplacements: ["Marcus Webb"],
  },
  {
    id: "c7",
    type: "no-venue",
    title: "Shift has no location",
    detail: "Bar Service draft is missing a venue/location assignment.",
    severity: "low",
    shiftTitle: "Bar Service",
    suggestedResolution: "Set the venue before publishing.",
    suggestedReplacements: [],
  },
]

// ---- Visual helpers -------------------------------------------------------

export const departmentAccent: Record<Department, { dot: string; text: string; border: string; bg: string }> = {
  Production: { dot: "bg-neon-purple", text: "text-neon-purple", border: "border-neon-purple/40", bg: "bg-neon-purple/10" },
  "Front of House": { dot: "bg-neon-cyan", text: "text-neon-cyan", border: "border-neon-cyan/40", bg: "bg-neon-cyan/10" },
  Security: { dot: "bg-neon-red", text: "text-neon-red", border: "border-neon-red/40", bg: "bg-neon-red/10" },
  Hospitality: { dot: "bg-neon-pink", text: "text-neon-pink", border: "border-neon-pink/40", bg: "bg-neon-pink/10" },
  "Box Office": { dot: "bg-neon-amber", text: "text-neon-amber", border: "border-neon-amber/40", bg: "bg-neon-amber/10" },
  Merch: { dot: "bg-neon-green", text: "text-neon-green", border: "border-neon-green/40", bg: "bg-neon-green/10" },
  Operations: { dot: "bg-neon-purple", text: "text-neon-purple", border: "border-neon-purple/40", bg: "bg-neon-purple/10" },
}

export const statusMeta: Record<ShiftStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  published: { label: "Published", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40" },
  confirmed: { label: "Confirmed", className: "bg-neon-green/15 text-neon-green border-neon-green/40" },
  pending: { label: "Pending", className: "bg-neon-amber/15 text-neon-amber border-neon-amber/40" },
  declined: { label: "Declined", className: "bg-neon-red/15 text-neon-red border-neon-red/40" },
  conflict: { label: "Conflict", className: "bg-neon-red/20 text-neon-red border-neon-red/50" },
  open: { label: "Open", className: "bg-neon-purple/15 text-neon-purple border-neon-purple/40" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border line-through" },
}

export const priorityMeta: Record<Priority, { label: string; className: string; dot: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  medium: { label: "Medium", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40", dot: "bg-neon-cyan" },
  high: { label: "High", className: "bg-neon-amber/15 text-neon-amber border-neon-amber/40", dot: "bg-neon-amber" },
  critical: { label: "Critical", className: "bg-neon-red/15 text-neon-red border-neon-red/40", dot: "bg-neon-red" },
}

export const shiftTypeMeta: Record<ShiftType, string> = {
  event: "Event Shift",
  venue: "Venue Shift",
  tour: "Tour Shift",
  operations: "General Operations",
}

export const availabilityMeta: Record<AvailabilityStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-neon-green/15 text-neon-green border-neon-green/40" },
  scheduled: { label: "Scheduled", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40" },
  pending: { label: "Pending", className: "bg-neon-amber/15 text-neon-amber border-neon-amber/40" },
  unavailable: { label: "Unavailable", className: "bg-muted text-muted-foreground border-border" },
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour}${period.toLowerCase()}` : `${hour}:${String(m).padStart(2, "0")}${period.toLowerCase()}`
}

export function formatDate(date: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    opts ?? { weekday: "short", month: "short", day: "numeric" },
  )
}

// ---- Shift templates (DEMO FIXTURES ONLY — WORK-104) ----------------------
// Live mode must not consume these. Prefer empty live templates until
// organization-owned templates (WORK-407) persist.

export const DEMO_SHIFT_TEMPLATES: ShiftTemplate[] = [
  {
    id: "t1",
    name: "Standard Concert Load-In",
    department: "Production",
    role: "Production Assistant",
    startTime: "08:00",
    endTime: "14:00",
    neededStaffCount: 6,
    requiredSkills: ["Load-in", "Cabling", "Rigging"],
    defaultNotes: "Truck arrives 07:30. Dock B. Steel-toe boots required.",
    instructions: "Check in with Stage Manager on radio channel 2 before load-in.",
    shiftType: "event",
    useCount: 42,
    isDemoFixture: true,
  },
  {
    id: "t2",
    name: "Box Office Night Shift",
    department: "Box Office",
    role: "Box Office Lead",
    startTime: "16:00",
    endTime: "22:00",
    neededStaffCount: 2,
    requiredSkills: ["POS", "Ticketing", "Cash Handling"],
    defaultNotes: "Float reconciled at close. Two-person cash drop.",
    instructions: "Doors open 18:00. Will-call priority for VIP guests.",
    shiftType: "venue",
    useCount: 28,
    isDemoFixture: true,
  },
  {
    id: "t3",
    name: "Security Door Coverage",
    department: "Security",
    role: "Security Lead",
    startTime: "17:00",
    endTime: "23:59",
    neededStaffCount: 4,
    requiredSkills: ["Crowd Control", "Access", "First Aid"],
    defaultNotes: "High-vis vests. Radio channel 4. Bag check at all entries.",
    instructions: "Brief crew on evacuation routes at call time.",
    shiftType: "event",
    useCount: 35,
    isDemoFixture: true,
  },
  {
    id: "t4",
    name: "Festival Full-Day Crew",
    department: "Operations",
    role: "Runner",
    startTime: "09:00",
    endTime: "23:59",
    neededStaffCount: 8,
    requiredSkills: ["Logistics", "Driving", "Comms"],
    defaultNotes: "Long day — staggered breaks. Golf cart certification required.",
    instructions: "Report to Ops tent. Hydration mandatory.",
    shiftType: "tour",
    useCount: 19,
    isDemoFixture: true,
  },
  {
    id: "t5",
    name: "Merch Booth Coverage",
    department: "Merch",
    role: "Merchandise Lead",
    startTime: "17:00",
    endTime: "23:30",
    neededStaffCount: 3,
    requiredSkills: ["Inventory", "POS", "Display"],
    defaultNotes: "Count-in and count-out with duty manager.",
    instructions: "Restock between sets. Card readers charged.",
    shiftType: "venue",
    useCount: 24,
    isDemoFixture: true,
  },
  {
    id: "t6",
    name: "Hospitality Green Room",
    department: "Hospitality",
    role: "Hospitality",
    startTime: "12:00",
    endTime: "20:00",
    neededStaffCount: 2,
    requiredSkills: ["Green Room", "Rider", "Catering"],
    defaultNotes: "Rider posted in green room. Restock hourly.",
    instructions: "Confirm dietary requirements with tour manager.",
    shiftType: "event",
    useCount: 31,
    isDemoFixture: true,
  },
  {
    id: "t7",
    name: "Production Runner Shift",
    department: "Operations",
    role: "Runner",
    startTime: "10:00",
    endTime: "18:00",
    neededStaffCount: 2,
    requiredSkills: ["Driving", "Errands", "Logistics"],
    defaultNotes: "Vehicle assigned at call. Keep fuel receipts.",
    instructions: "Coordinate runs through Production office.",
    shiftType: "operations",
    useCount: 15,
    isDemoFixture: true,
  },
]

/** @deprecated Use DEMO_SHIFT_TEMPLATES — kept for demo-mode imports. */
export const TEMPLATES = DEMO_SHIFT_TEMPLATES

// ---- Weekly availability matrix (DEMO FIXTURES ONLY — WORK-104) ----------

const AVAIL_CYCLE = ["available", "preferred", "unavailable", "scheduled", "pending"] as const

export const availabilityStatusMeta: Record<
  AvailabilitySlot["status"],
  { label: string; className: string; cell: string }
> = {
  available: {
    label: "Available",
    className: "bg-neon-green/15 text-neon-green border-neon-green/40",
    cell: "bg-neon-green/15 text-neon-green hover:bg-neon-green/25",
  },
  preferred: {
    label: "Preferred",
    className: "bg-neon-purple/15 text-neon-purple border-neon-purple/40",
    cell: "bg-neon-purple/20 text-neon-purple hover:bg-neon-purple/30",
  },
  unavailable: {
    label: "Unavailable",
    className: "bg-muted text-muted-foreground border-border",
    cell: "bg-muted/40 text-muted-foreground hover:bg-muted/60",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40",
    cell: "bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25",
  },
  pending: {
    label: "Pending",
    className: "bg-neon-amber/15 text-neon-amber border-neon-amber/40",
    cell: "bg-neon-amber/15 text-neon-amber hover:bg-neon-amber/25",
  },
}

export interface StaffAvailability {
  staffId: string
  slots: AvailabilitySlot[]
  preferredHours: string
  unavailableWindows: string[]
}

// Deterministic availability grid keyed to WEEK_DAYS.
export const AVAILABILITY: StaffAvailability[] = STAFF.map((staff, i) => ({
  staffId: staff.id,
  preferredHours: i % 2 === 0 ? "Evenings (16:00 – 00:00)" : "Daytime (08:00 – 18:00)",
  unavailableWindows: [
    i % 3 === 0 ? "Mon mornings" : "Sun all day",
    i % 4 === 0 ? "Thu after 20:00" : "None additional",
  ],
  slots: WEEK_DAYS.map((day, di) => ({
    day: day.key,
    status: AVAIL_CYCLE[(i + di) % AVAIL_CYCLE.length],
  })),
}))

export function availabilityFor(staffId: string) {
  return AVAILABILITY.find((a) => a.staffId === staffId)
}

// ---- Publish review data --------------------------------------------------

export interface PublishChange {
  id: string
  type: "new" | "edited" | "cancelled"
  title: string
  detail: string
}

export const PUBLISH_CHANGES: PublishChange[] = [
  { id: "p1", type: "new", title: "Bar Service — Midnight Echo Festival", detail: "4 Bar Staff · Sat Jul 11 · 4pm–12am" },
  { id: "p2", type: "new", title: "VIP Doors — Velvet Underground Night", detail: "2 Door Staff · Sun Jul 12 · 6pm–12am" },
  { id: "p3", type: "edited", title: "Lighting Focus — Neon Skyline Tour", detail: "End time moved 6pm → 7pm" },
  { id: "p4", type: "edited", title: "Box Office Open — Aurora Live Sessions", detail: "Added second POS lead" },
  { id: "p5", type: "cancelled", title: "Merch Stand — Midnight Echo Festival", detail: "Sofia declined · needs reassignment" },
]

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export const PUBLISH_CHECKLIST: ChecklistItem[] = [
  { id: "cl1", label: "All critical roles covered", done: false },
  { id: "cl2", label: "No critical conflicts", done: false },
  { id: "cl3", label: "Open shifts reviewed", done: true },
  { id: "cl4", label: "Staff instructions added", done: true },
  { id: "cl5", label: "Event locations confirmed", done: true },
  { id: "cl6", label: "Notifications ready", done: false },
]

export const publishChangeMeta: Record<PublishChange["type"], { label: string; className: string }> = {
  new: { label: "New", className: "bg-neon-green/15 text-neon-green border-neon-green/40" },
  edited: { label: "Edited", className: "bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40" },
  cancelled: { label: "Cancelled", className: "bg-neon-red/15 text-neon-red border-neon-red/40" },
}
