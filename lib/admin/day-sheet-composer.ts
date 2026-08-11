/**
 * LIVE-403 — Build day-sheet composer
 *
 * Assembles a DaySheet from canonical source data:
 *   - Run-of-show timeline items (from LIVE-401)
 *   - Travel segments (departure/arrival)
 *   - Lodging assignment
 *   - Calls/shifts from the work schedule
 *   - Meals / hospitality windows
 *   - Advance-derived contacts
 *   - Site map reference
 *   - Weather placeholder (source + conditions struct, not live data)
 *   - Emergency contacts
 *
 * Field-class policy governs what each audience role may see.
 * Sensitive fields (personal travel docs, individual dietary details,
 * emergency medical notes) are only included when the caller's capability
 * explicitly permits them.
 *
 * Pure domain logic; no Supabase imports.
 */

// ---------------------------------------------------------------------------
// Field class — controls visibility by audience
// ---------------------------------------------------------------------------

export type DaySheetFieldClass =
  | "public"          // visible to everyone holding the day sheet
  | "crew_only"       // visible to internally-assigned crew
  | "sensitive"       // requires explicit capability (e.g. finance, medical)
  | "management_only" // production management and above

// ---------------------------------------------------------------------------
// Weather placeholder
// ---------------------------------------------------------------------------

export interface DaySheetWeather {
  /** True = actual forecast; false = placeholder/source only */
  has_forecast: boolean
  source?: string              // e.g. "weather.gov", "venue contact"
  conditions?: string          // e.g. "Partly cloudy, 72°F"
  fetched_at?: string          // ISO-8601
}

// ---------------------------------------------------------------------------
// Contact entry (from advance)
// ---------------------------------------------------------------------------

export interface DaySheetContact {
  name: string
  role: string
  phone?: string
  email?: string
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Travel segment summary
// ---------------------------------------------------------------------------

export interface DaySheetTravelSegment {
  segment_id: string
  type: "flight" | "bus" | "van" | "train" | "car" | "other"
  departure_local: string   // "HH:MM" local
  departure_utc: string
  arrival_local: string
  arrival_utc: string
  origin_label: string
  destination_label: string
  vehicle_or_flight?: string
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Lodging
// ---------------------------------------------------------------------------

export interface DaySheetLodging {
  property_name: string
  address?: string
  check_in?: string    // local date YYYY-MM-DD
  check_out?: string
  room_label?: string  // "Room 214" — only when caller has crew_only cap
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Call / shift
// ---------------------------------------------------------------------------

export interface DaySheetCall {
  shift_id: string
  title: string
  start_local: string   // "HH:MM"
  start_utc: string
  end_local: string
  end_utc: string
  location?: string
  role_label?: string
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Meal window
// ---------------------------------------------------------------------------

export interface DaySheetMeal {
  meal_id: string
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | "craft_services"
  window_start_utc: string
  window_end_utc: string
  location?: string
  provider?: string
  /** Aggregate dietary flag — never per-person details */
  has_special_dietary_needs: boolean
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Site map reference
// ---------------------------------------------------------------------------

export interface DaySheetMapRef {
  map_version_id: string
  title: string
  thumbnail_url?: string
  offline_token?: string
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Emergency contact
// ---------------------------------------------------------------------------

export interface DaySheetEmergencyContact {
  name: string
  role: string
  phone: string
  /** true = personal/medical context — sensitive field class */
  is_medical: boolean
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// ROS item stub (for day sheet — stripped-down view)
// ---------------------------------------------------------------------------

export interface DaySheetRosItem {
  item_id: string
  category: string
  title: string
  planned_start_local: string
  planned_start_utc: string
  planned_end_utc: string
  location_label?: string
  role_label?: string
  public_note?: string    // only public-visibility notes included
  field_class: DaySheetFieldClass
}

// ---------------------------------------------------------------------------
// Capability set for field-class filtering
// ---------------------------------------------------------------------------

export interface DaySheetCapabilitySet {
  can_see_crew_only: boolean
  can_see_sensitive: boolean
  can_see_management_only: boolean
}

// ---------------------------------------------------------------------------
// DaySheet assembly input
// ---------------------------------------------------------------------------

export interface DaySheetInput {
  event_id: string
  event_date: string        // YYYY-MM-DD
  event_title: string
  ros_items: DaySheetRosItem[]
  travel_segments: DaySheetTravelSegment[]
  lodging?: DaySheetLodging
  calls: DaySheetCall[]
  meals: DaySheetMeal[]
  contacts: DaySheetContact[]
  map_refs: DaySheetMapRef[]
  emergency_contacts: DaySheetEmergencyContact[]
  weather?: DaySheetWeather
}

// ---------------------------------------------------------------------------
// Assembled DaySheet
// ---------------------------------------------------------------------------

export interface DaySheet {
  event_id: string
  event_date: string
  event_title: string
  ros_items: DaySheetRosItem[]
  travel_segments: DaySheetTravelSegment[]
  lodging?: DaySheetLodging
  calls: DaySheetCall[]
  meals: DaySheetMeal[]
  contacts: DaySheetContact[]
  map_refs: DaySheetMapRef[]
  emergency_contacts: DaySheetEmergencyContact[]
  weather?: DaySheetWeather
  assembled_at: string
}

// ---------------------------------------------------------------------------
// Compose day sheet with field-class projection
// ---------------------------------------------------------------------------

function isVisible(fieldClass: DaySheetFieldClass, caps: DaySheetCapabilitySet): boolean {
  switch (fieldClass) {
    case "public": return true
    case "crew_only": return caps.can_see_crew_only
    case "sensitive": return caps.can_see_sensitive
    case "management_only": return caps.can_see_management_only
  }
}

export function composeDaySheet(
  input: DaySheetInput,
  caps: DaySheetCapabilitySet,
  now?: string,
): DaySheet {
  const ts = now ?? new Date().toISOString()

  return {
    event_id: input.event_id,
    event_date: input.event_date,
    event_title: input.event_title,
    ros_items: input.ros_items.filter((i) => isVisible(i.field_class, caps)),
    travel_segments: input.travel_segments.filter((s) => isVisible(s.field_class, caps)),
    lodging: input.lodging && isVisible(input.lodging.field_class, caps) ? input.lodging : undefined,
    calls: input.calls.filter((c) => isVisible(c.field_class, caps)),
    meals: input.meals.filter((m) => isVisible(m.field_class, caps)),
    contacts: input.contacts.filter((c) => isVisible(c.field_class, caps)),
    map_refs: input.map_refs.filter((m) => isVisible(m.field_class, caps)),
    emergency_contacts: input.emergency_contacts.filter((e) => isVisible(e.field_class, caps)),
    weather: input.weather,
    assembled_at: ts,
  }
}

// ---------------------------------------------------------------------------
// Build ROS items for day sheet (strips internal notes, applies field class)
// ---------------------------------------------------------------------------

import type { RosItem } from "./ros-timeline"

export function buildDaySheetRosItems(
  rosItems: RosItem[],
  defaultFieldClass: DaySheetFieldClass = "crew_only",
): DaySheetRosItem[] {
  return rosItems.map((item) => ({
    item_id: item.id,
    category: item.category,
    title: item.title,
    planned_start_local: item.planned_start_local,
    planned_start_utc: item.planned_start_utc,
    planned_end_utc: item.planned_end_utc,
    location_label: item.location?.label,
    role_label: item.role_label,
    // Only include public notes
    public_note: item.notes.filter((n) => n.visibility === "public").map((n) => n.body).join("\n") || undefined,
    field_class: defaultFieldClass,
  }))
}

// ---------------------------------------------------------------------------
// Day-sheet summary (section counts + weather status)
// ---------------------------------------------------------------------------

export interface DaySheetSummary {
  event_id: string
  event_date: string
  ros_item_count: number
  travel_segment_count: number
  call_count: number
  meal_count: number
  contact_count: number
  map_ref_count: number
  emergency_contact_count: number
  has_weather_forecast: boolean
  assembled_at: string
}

export function summarizeDaySheet(ds: DaySheet): DaySheetSummary {
  return {
    event_id: ds.event_id,
    event_date: ds.event_date,
    ros_item_count: ds.ros_items.length,
    travel_segment_count: ds.travel_segments.length,
    call_count: ds.calls.length,
    meal_count: ds.meals.length,
    contact_count: ds.contacts.length,
    map_ref_count: ds.map_refs.length,
    emergency_contact_count: ds.emergency_contacts.length,
    has_weather_forecast: !!ds.weather?.has_forecast,
    assembled_at: ds.assembled_at,
  }
}
