import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/work-mode/read-model", () => ({
  getWorkModeAssignments: vi.fn(),
  findWorkModeAssignment: vi.fn(),
  WorkModeReadError: class WorkModeReadError extends Error {},
}))

import { GET as listAssignments } from "@/app/api/work-mode/assignments/route"
import { GET as getAssignment } from "@/app/api/work-mode/assignments/[id]/route"
import { GET as getWorkerAttendance, POST as submitWorkerAction } from "@/app/api/work-mode/assignments/[id]/actions/route"
import { createClient } from "@/lib/supabase/server"
import {
  findWorkModeAssignment,
  getWorkModeAssignments,
} from "@/lib/work-mode/read-model"

const mockedCreateClient = vi.mocked(createClient)
const mockedGetWorkModeAssignments = vi.mocked(getWorkModeAssignments)
const mockedFindWorkModeAssignment = vi.mocked(findWorkModeAssignment)

const assignment = {
  id: "assignment-1",
  roleTitle: "Stagehand",
  department: "Production",
  eventId: "event-1",
  tourId: null,
  staffShiftId: "shift-1",
  eventContextSource: "assignment" as const,
  venueId: null,
  organizerId: null,
  startsAt: "2026-07-28T17:00:00.000Z",
  endsAt: "2026-07-29T01:00:00.000Z",
  status: "confirmed" as const,
  permissions: { check_in_out: true },
  source: "assignment" as const,
  publicationType: null,
  href: null,
  siteMapId: null,
}

const payload = {
  assignments: [assignment],
  publications: [
    {
      id: "publication-1",
      eventId: "event-1",
      tourId: null,
      siteMapId: "map-1",
      publicationType: "site_map",
      title: "Event map",
      payload: {},
      visibleTo: ["assigned_workers"],
      publishedAt: "2026-07-28T16:00:00.000Z",
      href: "/work/site-maps/map-1",
    },
  ],
  tasks: [],
  sourceAvailability: {
    assignments: "available" as const,
    events: "available" as const,
    publications: "available" as const,
    tasks: "available" as const,
    communications: "available" as const,
    reminders: "available" as const,
  },
  generatedAt: "2026-07-28T16:30:00.000Z",
  workerActionsAvailable: false,
}

const requestId = "984db49b-7286-4bf4-8e42-5be522a5ab38"
const publicationId = "984db49b-7286-4bf4-8e42-5be522a5ab39"

function actionRequest(action: "check_in" | "check_out" | "acknowledge", overrides: Record<string, string> = {}) {
  return new Request("https://tourify.test/api/work-mode/assignments/assignment-1/actions", {
    method: "POST",
    body: JSON.stringify({
      action,
      clientRequestId: requestId,
      ...(action === "acknowledge" ? { publicationId } : {}),
      ...overrides,
    }),
  })
}

function actionClient(insertResult: { data: unknown; error: unknown }, existingResult: { data: unknown; error: unknown }) {
  const select = vi.fn()
  const insert = vi.fn().mockReturnValue({ select })
  const eq = vi.fn()
  const maybeSingle = vi.fn().mockResolvedValue(existingResult)
  const from = vi.fn().mockReturnValue({ insert, select, eq })
  select.mockReturnValueOnce({ single: vi.fn().mockResolvedValue(insertResult) })
  select.mockReturnValue({ eq })
  eq.mockReturnValue({ eq, maybeSingle })
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    from,
  }
  mockedCreateClient.mockResolvedValue(supabase as never)
  mockedGetWorkModeAssignments.mockResolvedValue({
    ...payload,
    publications: [{ ...payload.publications[0], id: publicationId }],
    workerActionsAvailable: true,
  })
  mockedFindWorkModeAssignment.mockReturnValue(assignment)
  return { from, insert }
}

describe("Work Mode assignment API", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FEATURE_WORK_MODE_WORKER_ACTIONS
  })

  it("keeps worker mutations unavailable until manual SQL is confirmed", async () => {
    const response = await submitWorkerAction(
      new Request("https://tourify.test/api/work-mode/assignments/assignment-1/actions", {
        method: "POST",
        body: JSON.stringify({
          action: "check_in",
          clientRequestId: "984db49b-7286-4bf4-8e42-5be522a5ab38",
        }),
      }),
      { params: Promise.resolve({ id: "assignment-1" }) },
    )

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: "unavailable" })
    expect(mockedCreateClient).not.toHaveBeenCalled()
  })

  it("denies check-in when the assignment capability is absent", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    } as never)
    mockedGetWorkModeAssignments.mockResolvedValue({
      ...payload,
      workerActionsAvailable: true,
    })
    mockedFindWorkModeAssignment.mockReturnValue({
      ...assignment,
      permissions: { check_in_out: false },
    })

    const response = await submitWorkerAction(
      new Request("https://tourify.test/api/work-mode/assignments/assignment-1/actions", {
        method: "POST",
        body: JSON.stringify({
          action: "check_in",
          clientRequestId: "984db49b-7286-4bf4-8e42-5be522a5ab38",
        }),
      }),
      { params: Promise.resolve({ id: "assignment-1" }) },
    )

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ code: "forbidden" })
  })

  it("denies an action for an assignment outside the worker read model before writing", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    const { insert } = actionClient({ data: null, error: null }, { data: null, error: null })
    mockedFindWorkModeAssignment.mockReturnValue(null)

    const response = await submitWorkerAction(actionRequest("check_in"), {
      params: Promise.resolve({ id: "assignment-1" }),
    })
    expect(response.status).toBe(404)
    expect(insert).not.toHaveBeenCalled()
  })

  it("replays only the same check-in request for the same assignment and action", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    actionClient(
      { data: null, error: { code: "23505" } },
      { data: { id: "event-1", assignment_id: assignment.id, action: "check_in", occurred_at: "2026-07-28T17:00:00Z" }, error: null },
    )

    const response = await submitWorkerAction(actionRequest("check_in"), {
      params: Promise.resolve({ id: assignment.id }),
    })
    expect(response.status).toBe(200)
    expect((await response.json()).data).toMatchObject({ id: "event-1", action: "check_in", idempotent: true })
  })

  it("rejects a reused request id for a different check-in action", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    actionClient(
      { data: null, error: { code: "23505" } },
      { data: { id: "event-1", assignment_id: assignment.id, action: "check_in", occurred_at: "2026-07-28T17:00:00Z" }, error: null },
    )

    const response = await submitWorkerAction(actionRequest("check_out"), {
      params: Promise.resolve({ id: assignment.id }),
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "conflict" })
  })

  it("rejects a reused acknowledgement request id for a different packet", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    actionClient(
      { data: null, error: { code: "23505" } },
      { data: { id: "ack-1", assignment_id: assignment.id, publication_id: "other-packet", acknowledged_at: "2026-07-28T17:00:00Z" }, error: null },
    )

    const response = await submitWorkerAction(actionRequest("acknowledge"), {
      params: Promise.resolve({ id: assignment.id }),
    })
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "conflict" })
  })

  it("denies a packet with no matching event or tour scope before writing", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    const { insert } = actionClient({ data: null, error: null }, { data: null, error: null })
    mockedGetWorkModeAssignments.mockResolvedValue({
      ...payload,
      publications: [{ ...payload.publications[0], id: publicationId, eventId: null, tourId: "other-tour" }],
      workerActionsAvailable: true,
    })

    const response = await submitWorkerAction(actionRequest("acknowledge"), {
      params: Promise.resolve({ id: assignment.id }),
    })
    expect(response.status).toBe(404)
    expect(insert).not.toHaveBeenCalled()
  })

  it("reads persisted attendance only for the authenticated worker and assignment", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: "event-1", action: "check_in", occurred_at: "2026-07-28T17:00:00Z", device_occurred_at: null }],
      error: null,
    })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn()
    eq.mockReturnValue({ eq, order })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from,
    } as never)
    mockedGetWorkModeAssignments.mockResolvedValue(payload)
    mockedFindWorkModeAssignment.mockReturnValue(assignment)

    const response = await getWorkerAttendance(actionRequest("check_in"), {
      params: Promise.resolve({ id: assignment.id }),
    })
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect((await response.json()).data).toEqual([{
      id: "event-1", action: "check_in", occurredAt: "2026-07-28T17:00:00Z", deviceOccurredAt: null,
    }])
    expect(from).toHaveBeenCalledWith("work_mode_check_in_events")
    expect(eq).toHaveBeenCalledWith("assignment_id", assignment.id)
    expect(eq).toHaveBeenCalledWith("user_id", "user-1")
  })

  it("denies attendance history for another worker's assignment before querying events", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    const from = vi.fn()
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
      from,
    } as never)
    mockedGetWorkModeAssignments.mockResolvedValue(payload)
    mockedFindWorkModeAssignment.mockReturnValue(null)

    const response = await getWorkerAttendance(actionRequest("check_in"), {
      params: Promise.resolve({ id: "another-assignment" }),
    })
    expect(response.status).toBe(404)
    expect(from).not.toHaveBeenCalled()
  })

  it("fails closed when there is no authenticated user", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const response = await listAssignments()
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: "not_authenticated" })
    expect(mockedGetWorkModeAssignments).not.toHaveBeenCalled()
  })

  it("returns only the authenticated user's server read model", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    }
    mockedCreateClient.mockResolvedValue(supabase as never)
    mockedGetWorkModeAssignments.mockResolvedValue(payload)

    const response = await listAssignments()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect((await response.json()).data.assignments[0].id).toBe("assignment-1")
    expect(mockedGetWorkModeAssignments).toHaveBeenCalledWith(supabase, "user-1")
  })

  it("returns 404 instead of leaking an assignment outside the read model", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    } as never)
    mockedGetWorkModeAssignments.mockResolvedValue(payload)
    mockedFindWorkModeAssignment.mockReturnValue(null)

    const response = await getAssignment(new Request("https://tourify.test"), {
      params: Promise.resolve({ id: "assignment-other-user" }),
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ code: "not_found" })
  })
})
