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
import { POST as submitWorkerAction } from "@/app/api/work-mode/assignments/[id]/actions/route"
import { GET as getPublication } from "@/app/api/work/publications/[id]/route"
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
      publishedAt: "2026-07-28T16:00:00.000Z",
      href: "/work/site-maps/map-1",
    },
    {
      id: "publication-2",
      eventId: "event-1",
      tourId: null,
      siteMapId: null,
      publicationType: "day_sheet",
      title: "Day Sheet",
      payload: { version: 1 },
      publishedAt: "2026-07-28T17:00:00.000Z",
      href: "/work/publications/publication-2",
    },
  ],
  generatedAt: "2026-07-28T16:30:00.000Z",
  workerActionsAvailable: false,
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

  it("does not allow check-out before a server-confirmed check-in", async () => {
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
      attendance: { state: "not_checked_in", checkedInAt: null, checkedOutAt: null },
    } as never)

    const response = await submitWorkerAction(
      new Request("https://tourify.test/api/work-mode/assignments/assignment-1/actions", {
        method: "POST",
        body: JSON.stringify({
          action: "check_out",
          clientRequestId: "984db49b-7286-4bf4-8e42-5be522a5ab38",
        }),
      }),
      { params: Promise.resolve({ id: "assignment-1" }) },
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: "conflict" })
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

  it("returns a worker-visible publication detail from the authenticated read model", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    } as never)
    mockedGetWorkModeAssignments.mockResolvedValue(payload)

    const response = await getPublication(new Request("https://tourify.test"), {
      params: Promise.resolve({ id: "publication-2" }),
    })

    expect(response.status).toBe(200)
    expect((await response.json()).data.publication).toMatchObject({
      id: "publication-2",
      href: "/work/publications/publication-2",
    })
  })

  it("does not expose publications outside the authenticated read model", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }),
      },
    } as never)
    mockedGetWorkModeAssignments.mockResolvedValue(payload)

    const response = await getPublication(new Request("https://tourify.test"), {
      params: Promise.resolve({ id: "publication-other-user" }),
    })

    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({ code: "not_found" })
  })
})
