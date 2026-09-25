import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/work-mode/read-model", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/work-mode/read-model")>()
  return {
    ...original,
    getWorkModeHistory: vi.fn(),
  }
})

import { GET as getHistory } from "@/app/api/work-mode/history/route"
import { createClient } from "@/lib/supabase/server"
import {
  getWorkModeHistory as mockedGetWorkModeHistory,
  WorkModeReadError,
} from "@/lib/work-mode/read-model"

const mockedCreateClient = vi.mocked(createClient)
const mockGetWorkModeHistory = vi.mocked(mockedGetWorkModeHistory)

const historyPayload = {
  upcoming: [],
  completed: [{ id: "completed-1", roleTitle: "Stagehand", status: "completed", attendance: { source: "none" }, evaluation: { source: "none" } }],
  sourceAvailability: {
    assignments: "available",
    events: "available",
    publications: "available",
    tasks: "available",
    communications: "available",
    reminders: "available",
  },
  generatedAt: "2026-07-30T12:00:00.000Z",
  workerActionsAvailable: false,
}

describe("Work Mode work history route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.FEATURE_WORK_MODE_WORKER_ACTIONS
  })

  it("fails closed when there is no authenticated user", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    } as never)

    const response = await getHistory()
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: "not_authenticated" })
    expect(mockGetWorkModeHistory).not.toHaveBeenCalled()
  })

  it("returns only the authenticated worker's read model with private no-store caching", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "worker-1" } }, error: null }) },
    } as never)
    mockGetWorkModeHistory.mockResolvedValue(historyPayload as never)

    const response = await getHistory()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect((await response.json()).data.completed[0].id).toBe("completed-1")
    expect(mockGetWorkModeHistory).toHaveBeenCalledWith(expect.anything(), "worker-1")
  })

  it("returns 503 when the worker history read is unavailable", async () => {
    mockedCreateClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "worker-1" } }, error: null }) },
    } as never)
    mockGetWorkModeHistory.mockRejectedValue(new WorkModeReadError())

    const response = await getHistory()
    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: "unavailable" })
  })
})