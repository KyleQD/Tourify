import { describe, it, expect } from "vitest"
import {
  composeDaySheet,
  buildDaySheetRosItems,
  summarizeDaySheet,
  type DaySheetInput,
  type DaySheetCapabilitySet,
  type DaySheetContact,
  type DaySheetTravelSegment,
  type DaySheetLodging,
  type DaySheetMeal,
  type DaySheetEmergencyContact,
} from "../../lib/admin/day-sheet-composer"
import { makeRosItem, computePlannedEndUtc, addRosItemNote } from "../../lib/admin/ros-timeline"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALL_CAPS: DaySheetCapabilitySet = {
  can_see_crew_only: true,
  can_see_sensitive: true,
  can_see_management_only: true,
}

const PUBLIC_ONLY_CAPS: DaySheetCapabilitySet = {
  can_see_crew_only: false,
  can_see_sensitive: false,
  can_see_management_only: false,
}

const CREW_CAPS: DaySheetCapabilitySet = {
  can_see_crew_only: true,
  can_see_sensitive: false,
  can_see_management_only: false,
}

function baseInput(overrides: Partial<DaySheetInput> = {}): DaySheetInput {
  return {
    event_id: "ev-1",
    event_date: "2025-09-15",
    event_title: "World Tour — New York",
    ros_items: [],
    travel_segments: [],
    calls: [],
    meals: [],
    contacts: [],
    map_refs: [],
    emergency_contacts: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// composeDaySheet — field-class filtering
// ---------------------------------------------------------------------------

describe("composeDaySheet — field-class filtering", () => {
  it("includes public items for all caps", () => {
    const contacts: DaySheetContact[] = [
      { name: "Jane", role: "Venue Manager", phone: "+1-555-0100", field_class: "public" },
      { name: "Bob", role: "Security Lead", field_class: "crew_only" },
    ]
    const ds = composeDaySheet(baseInput({ contacts }), ALL_CAPS, "2025-09-01T00:00:00Z")
    expect(ds.contacts).toHaveLength(2)
  })

  it("hides crew_only contacts from public caps", () => {
    const contacts: DaySheetContact[] = [
      { name: "Jane", role: "Venue Manager", field_class: "public" },
      { name: "Bob", role: "Security Lead", field_class: "crew_only" },
    ]
    const ds = composeDaySheet(baseInput({ contacts }), PUBLIC_ONLY_CAPS)
    expect(ds.contacts).toHaveLength(1)
    expect(ds.contacts[0].name).toBe("Jane")
  })

  it("hides sensitive contacts from crew caps", () => {
    const contacts: DaySheetContact[] = [
      { name: "Dr. Smith", role: "Medical", field_class: "sensitive" },
      { name: "Jane", role: "PM", field_class: "crew_only" },
    ]
    const ds = composeDaySheet(baseInput({ contacts }), CREW_CAPS)
    expect(ds.contacts).toHaveLength(1)
    expect(ds.contacts[0].name).toBe("Jane")
  })

  it("hides management_only from crew caps", () => {
    const contacts: DaySheetContact[] = [
      { name: "Director", role: "Tour Director", field_class: "management_only" },
    ]
    const ds = composeDaySheet(baseInput({ contacts }), CREW_CAPS)
    expect(ds.contacts).toHaveLength(0)
  })

  it("includes management_only for all caps", () => {
    const contacts: DaySheetContact[] = [
      { name: "Director", role: "Tour Director", field_class: "management_only" },
    ]
    expect(composeDaySheet(baseInput({ contacts }), ALL_CAPS).contacts).toHaveLength(1)
  })
})

describe("composeDaySheet — lodging visibility", () => {
  const lodging: DaySheetLodging = {
    property_name: "Park Hyatt",
    room_label: "Room 201",
    field_class: "crew_only",
  }
  it("includes lodging for crew caps", () => {
    expect(composeDaySheet(baseInput({ lodging }), CREW_CAPS).lodging).toBeDefined()
  })
  it("excludes lodging for public caps", () => {
    expect(composeDaySheet(baseInput({ lodging }), PUBLIC_ONLY_CAPS).lodging).toBeUndefined()
  })
})

describe("composeDaySheet — travel segments", () => {
  const travel: DaySheetTravelSegment[] = [{
    segment_id: "seg-1",
    type: "flight",
    departure_local: "08:00",
    departure_utc: "2025-09-15T12:00:00Z",
    arrival_local: "11:30",
    arrival_utc: "2025-09-15T15:30:00Z",
    origin_label: "JFK",
    destination_label: "ORD",
    field_class: "crew_only",
  }]
  it("includes travel for crew caps", () => {
    expect(composeDaySheet(baseInput({ travel_segments: travel }), CREW_CAPS).travel_segments).toHaveLength(1)
  })
  it("hides travel from public caps", () => {
    expect(composeDaySheet(baseInput({ travel_segments: travel }), PUBLIC_ONLY_CAPS).travel_segments).toHaveLength(0)
  })
})

describe("composeDaySheet — meals", () => {
  const meals: DaySheetMeal[] = [{
    meal_id: "m1",
    meal_type: "lunch",
    window_start_utc: "2025-09-15T17:00:00Z",
    window_end_utc: "2025-09-15T18:00:00Z",
    has_special_dietary_needs: false,
    field_class: "public",
  }]
  it("includes public meals", () => {
    expect(composeDaySheet(baseInput({ meals }), PUBLIC_ONLY_CAPS).meals).toHaveLength(1)
  })
})

describe("composeDaySheet — emergency contacts", () => {
  const contacts: DaySheetEmergencyContact[] = [
    { name: "Dr. Jones", role: "Medical", phone: "+1-555-0200", is_medical: true, field_class: "sensitive" },
    { name: "Fire Marshal", role: "Safety", phone: "+1-555-0300", is_medical: false, field_class: "crew_only" },
  ]
  it("includes sensitive emergency contact only for sensitive caps", () => {
    expect(composeDaySheet(baseInput({ emergency_contacts: contacts }), ALL_CAPS).emergency_contacts).toHaveLength(2)
    expect(composeDaySheet(baseInput({ emergency_contacts: contacts }), CREW_CAPS).emergency_contacts).toHaveLength(1)
  })
})

describe("composeDaySheet — weather", () => {
  it("always includes weather regardless of caps", () => {
    const weather = { has_forecast: true, conditions: "Sunny, 75°F", source: "weather.gov" }
    const ds = composeDaySheet(baseInput({ weather }), PUBLIC_ONLY_CAPS)
    expect(ds.weather?.has_forecast).toBe(true)
  })
  it("handles placeholder weather (no forecast)", () => {
    const weather = { has_forecast: false, source: "venue contact" }
    expect(composeDaySheet(baseInput({ weather }), PUBLIC_ONLY_CAPS).weather?.has_forecast).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildDaySheetRosItems
// ---------------------------------------------------------------------------

describe("buildDaySheetRosItems", () => {
  it("builds ROS stubs with default crew_only field class", () => {
    const rosItem = makeRosItem({
      id: "i1",
      ros_version_id: "v1",
      event_id: "ev-1",
      category: "show",
      title: "Main Show",
      planned_start_local: "20:00",
      planned_start_utc: "2025-09-15T00:00:00Z",
      planned_end_utc: computePlannedEndUtc("2025-09-15T00:00:00Z", 120),
      duration_minutes: 120,
      time_zone: "America/New_York",
      location: { label: "Main Stage" },
      role_label: "Production Manager",
    }, "2025-01-01T00:00:00Z")

    const items = buildDaySheetRosItems([rosItem])
    expect(items).toHaveLength(1)
    expect(items[0].field_class).toBe("crew_only")
    expect(items[0].location_label).toBe("Main Stage")
    expect(items[0].role_label).toBe("Production Manager")
  })

  it("includes only public notes in public_note field", () => {
    let rosItem = makeRosItem({
      id: "i1", ros_version_id: "v1", event_id: "ev-1", category: "show",
      title: "Show", planned_start_local: "20:00",
      planned_start_utc: "2025-09-15T00:00:00Z",
      planned_end_utc: "2025-09-15T22:00:00Z",
      duration_minutes: 120, time_zone: "America/New_York",
    })
    rosItem = addRosItemNote(rosItem, { body: "Public note", visibility: "public", author_id: "u1" })
    rosItem = addRosItemNote(rosItem, { body: "Internal note", visibility: "internal", author_id: "u1" })

    const items = buildDaySheetRosItems([rosItem])
    expect(items[0].public_note).toBe("Public note")
    expect(items[0].public_note).not.toContain("Internal note")
  })
})

// ---------------------------------------------------------------------------
// summarizeDaySheet
// ---------------------------------------------------------------------------

describe("summarizeDaySheet", () => {
  it("counts all sections correctly", () => {
    const contacts: DaySheetContact[] = [
      { name: "A", role: "R", field_class: "public" },
      { name: "B", role: "R", field_class: "public" },
    ]
    const input = baseInput({
      contacts,
      meals: [{ meal_id: "m1", meal_type: "lunch", window_start_utc: "T", window_end_utc: "T", has_special_dietary_needs: false, field_class: "public" }],
      weather: { has_forecast: true, source: "API" },
    })
    const ds = composeDaySheet(input, ALL_CAPS, "2025-09-01T00:00:00Z")
    const summary = summarizeDaySheet(ds)
    expect(summary.contact_count).toBe(2)
    expect(summary.meal_count).toBe(1)
    expect(summary.has_weather_forecast).toBe(true)
    expect(summary.assembled_at).toBe("2025-09-01T00:00:00Z")
  })
})
