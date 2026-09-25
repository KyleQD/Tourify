import { beforeEach, describe, expect, it, vi } from "vitest"

import { getWorkModeHistory, WorkModeReadError } from "@/lib/work-mode/read-model"

const assignmentRows = [
  {
    id: "completed-1",
    role_title: "Stagehand",
    department: "Production",
    event_id: null,
    event_v2_id: "event-1",
    tour_id: null,
    staff_shift_id: "shift-1",
    staff_member_id: "staff-1",
    venue_id: null,
    organizer_id: null,
    starts_at: "2026-07-28T17:00:00.000Z",
    ends_at: "2026-07-29T01:00:00.000Z",
    status: "completed",
    updated_at: "2026-07-30T12:00:00.000Z",
  },
  {
    id: "upcoming-1",
    role_title: "Merch Seller",
    department: "Retail",
    event_id: null,
    event_v2_id: "event-1",
    tour_id: null,
    staff_shift_id: null,
    staff_member_id: "staff-1",
    venue_id: null,
    organizer_id: null,
    starts_at: "2026-08-10T15:00:00.000Z",
    ends_at: null,
    status: "confirmed",
    updated_at: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "declined-1",
    role_title: "Runner",
    department: null,
    event_id: null,
    event_v2_id: null,
    tour_id: null,
    staff_shift_id: null,
    staff_member_id: null,
    venue_id: null,
    organizer_id: null,
    starts_at: "2026-06-01T10:00:00.000Z",
    ends_at: null,
    status: "declined",
    updated_at: "2026-06-02T10:00:00.000Z",
  },
  {
    id: "foreign-status",
    role_title: "Unknown Lifecycle",
    department: null,
    event_id: null,
    event_v2_id: null,
    tour_id: null,
    staff_shift_id: null,
    staff_member_id: null,
    venue_id: null,
    organizer_id: null,
    starts_at: null,
    ends_at: null,
    status: "archived",
    updated_at: "2026-05-01T10:00:00.000Z",
  },
]

const shiftRows = [
  {
    id: "shift-1",
    event_id: "event-1",
    shift_date: "2026-07-28",
    start_time: "17:00:00",
    end_time: "01:00:00",
    status: "completed",
  },
]

const eventRows = [
  { id: "event-1", title: "Summer Showcase", org_id: "org-1", venue_id: "venue-1", start_at: null, end_at: null },
]

const venueRows = [{ id: "venue-1", name: "The Grand Hall" }]

const organizationRows = [{ id: "org-1", name: "Northstar Promotions" }]

const metricRows = [
  {
    id: "metric-1",
    staff_member_id: "staff-1",
    event_id: "event-1",
    metric_date: "2026-07-30",
    attendance_rate: 95,
    performance_rating: 4.5,
    supervisor_rating: 4.2,
    customer_feedback_score: null,
    commendations_count: 1,
    incidents_count: 0,
    training_completed: true,
    certifications_valid: true,
    notes: "Reliable stage crew.",
    reviewed_at: "2026-07-31T10:00:00.000Z",
  },
]

const attendanceRows = [
  { id: "att-1", assignment_id: "completed-1", action: "check_in", occurred_at: "2026-07-28T17:05:00.000Z" },
  { id: "att-2", assignment_id: "completed-1", action: "check_out", occurred_at: "2026-07-29T00:55:00.000Z" },
]

function queryFor(result: unknown) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    in: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (onFulfilled: (value: unknown) => void) => { onFulfilled(result) },
  }
  return query
}

function supabaseMock(results: Record<string, unknown>) {
  const from = vi.fn((table: string) => queryFor(results[table] ?? { data: [], error: null }))
  return {
    auth: { getUser: vi.fn() },
    from,
  }
}

const baseResults = {
  employment_assignments: { data: assignmentRows, error: null },
  staff_shifts: { data: shiftRows, error: null },
  events_v2: { data: eventRows, error: null },
  venues_v2: { data: venueRows, error: null },
  organizations: { data: organizationRows, error: null },
  staff_performance_metrics: { data: metricRows, error: null },
}

describe("Work Mode work history read model", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FEATURE_WORK_MODE_WORKER_ACTIONS
  })

  it("returns only the owning worker's assignments bucketed into upcoming and completed with context", async () => {
    const supabase = supabaseMock(baseResults)
    const payload = await getWorkModeHistory(supabase as never, "worker-1")

    expect(supabase.from).toHaveBeenCalledWith("employment_assignments")
    const assignmentQuery = (supabase.from as ReturnType<typeof vi.fn>).mock.results[0].value
    expect(assignmentQuery.eq).toHaveBeenCalledWith("user_id", "worker-1")

    expect(payload.upcoming).toHaveLength(1)
    expect(payload.upcoming[0]).toMatchObject({
      id: "upcoming-1",
      roleTitle: "Merch Seller",
      status: "confirmed",
      eventTitle: "Summer Showcase",
      organizationName: "Northstar Promotions",
      venueName: "The Grand Hall",
      startsAt: "2026-08-10T15:00:00.000Z",
    })

    expect(payload.completed).toHaveLength(2)
    expect(payload.completed[0]).toMatchObject({
      id: "completed-1",
      roleTitle: "Stagehand",
      department: "Production",
      status: "completed",
      eventId: "event-1",
      eventTitle: "Summer Showcase",
      organizationName: "Northstar Promotions",
      venueName: "The Grand Hall",
      startsAt: "2026-07-28T17:00:00.000Z",
      attendance: { shiftStatus: "completed", checkIns: 0, checkOuts: 0, source: "shift_status", workerActionsAvailable: false },
      evaluation: { source: "staff_performance_metrics", attendanceRate: 95, performanceRating: 4.5, supervisorRating: 4.2 },
    })

    // terminal rows sort most-recent first; non-canonical statuses never surface
    expect(payload.completed.map((item) => item.id)).toEqual(["completed-1", "declined-1"])
    expect(payload.upcoming.some((item) => item.id === "foreign-status")).toBe(false)
    expect(payload.completed.some((item) => item.id === "foreign-status")).toBe(false)
  })

  it("does not query gated worker check-in/out events while the reviewed worker-actions schema is disabled", async () => {
    const supabase = supabaseMock(baseResults)
    const payload = await getWorkModeHistory(supabase as never, "worker-1")

    expect(payload.workerActionsAvailable).toBe(false)
    expect(supabase.from).not.toHaveBeenCalledWith("work_mode_check_in_events")
    expect(payload.completed[0].attendance).toMatchObject({ checkIns: 0, checkOuts: 0, source: "shift_status" })
  })

  it("counts persisted check-in/out events when worker actions are enabled", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    const supabase = supabaseMock({
      ...baseResults,
      work_mode_check_in_events: { data: attendanceRows, error: null },
    })
    const payload = await getWorkModeHistory(supabase as never, "worker-1")

    expect(payload.workerActionsAvailable).toBe(true)
    expect(supabase.from).toHaveBeenCalledWith("work_mode_check_in_events")
    expect(payload.completed[0].attendance).toMatchObject({
      checkIns: 1,
      checkOuts: 1,
      lastCheckInAt: "2026-07-28T17:05:00.000Z",
      lastCheckOutAt: "2026-07-29T00:55:00.000Z",
      source: "worker_actions",
    })
  })

  it("surfaces an empty evaluation state when no reviewed metric exists", async () => {
    const supabase = supabaseMock({
      ...baseResults,
      staff_performance_metrics: { data: [], error: null },
    })
    const payload = await getWorkModeHistory(supabase as never, "worker-1")

    expect(payload.completed[0].evaluation).toMatchObject({ source: "none", performanceRating: null })
    expect(payload.upcoming[0].evaluation).toMatchObject({ source: "none" })
  })

  it("fails closed with WorkModeReadError when the assignment read fails", async () => {
    const supabase = supabaseMock({
      ...baseResults,
      employment_assignments: { data: null, error: { message: "permission denied" } },
    })
    await expect(getWorkModeHistory(supabase as never, "worker-1")).rejects.toBeInstanceOf(WorkModeReadError)
  })
})