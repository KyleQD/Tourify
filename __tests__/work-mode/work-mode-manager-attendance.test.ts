import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/auth/api-auth", () => ({
  withAdminCapability: vi.fn((_capability, handler) => (request: NextRequest) =>
    handler(request, {
      user: { id: "manager-1" },
      supabase: { from: vi.fn() },
      admin: { orgId: "org-1" },
    })),
}))
vi.mock("@/lib/admin/admin-tour-event-access", () => ({
  assertAdminEventAccess: vi.fn(),
  adminAccessErrorResponse: vi.fn(() => ({ status: 404, message: "Event not found." })),
}))
vi.mock("@/lib/supabase/service-role-job", () => ({
  executeServiceRoleJob: vi.fn(),
}))

import { GET } from "@/app/api/admin/events/[id]/work-mode/attendance/route"
import { assertAdminEventAccess } from "@/lib/admin/admin-tour-event-access"
import { executeServiceRoleJob } from "@/lib/supabase/service-role-job"

const eventId = "984db49b-7286-4bf4-8e42-5be522a5ab38"
const request = () => new NextRequest(`https://tourify.test/api/admin/events/${eventId}/work-mode/attendance`)

describe("event-scoped manager worker attendance", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(assertAdminEventAccess).mockReset()
    vi.mocked(executeServiceRoleJob).mockReset()
    delete process.env.FEATURE_WORK_MODE_WORKER_ACTIONS
  })

  it("requires workforce view and stays disabled before SQL verification", async () => {
    const response = await GET(request())
    expect(response.status).toBe(503)
    expect(assertAdminEventAccess).not.toHaveBeenCalled()
    expect(executeServiceRoleJob).not.toHaveBeenCalled()
  })

  it("never starts a privileged read when event access fails", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    vi.mocked(assertAdminEventAccess).mockRejectedValue(new Error("Event denied"))
    const response = await GET(request())
    expect(response.status).toBe(404)
    expect(assertAdminEventAccess).toHaveBeenCalledWith(expect.objectContaining({
      userId: "manager-1", eventId, orgId: "org-1",
    }))
    expect(executeServiceRoleJob).not.toHaveBeenCalled()
  })

  it("queries only the authorized event and returns persisted rows", async () => {
    process.env.FEATURE_WORK_MODE_WORKER_ACTIONS = "1"
    const limit = vi.fn().mockResolvedValue({
      data: [{ id: "entry-1", assignment_id: "assignment-1", user_id: "worker-1", action: "check_in", occurred_at: "2026-07-28T17:00:00Z" }],
      error: null,
    })
    const order = vi.fn().mockReturnValue({ limit })
    const eq = vi.fn().mockReturnValue({ order })
    const inQuery = vi.fn()
      .mockResolvedValueOnce({ data: [{ id: "assignment-1", role_title: "Stagehand" }], error: null })
      .mockResolvedValueOnce({ data: [{ id: "worker-1", full_name: "Worker One" }], error: null })
    const from = vi.fn((table: string) => table === "work_mode_check_in_events"
      ? { select: vi.fn().mockReturnValue({ eq }) }
      : { select: vi.fn().mockReturnValue({ in: inQuery }) })
    vi.mocked(executeServiceRoleJob).mockImplementation(async (_context, run) =>
      run({ from } as never, _context))

    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect((await response.json()).data).toEqual([expect.objectContaining({
      id: "entry-1", workerName: "Worker One", roleTitle: "Stagehand", action: "check_in",
    })])
    expect(executeServiceRoleJob).toHaveBeenCalledWith(expect.objectContaining({
      orgId: "org-1", moduleId: "admin.workforce.attendance", target: { eventId },
    }), expect.any(Function))
    expect(eq).toHaveBeenCalledWith("event_id", eventId)
    expect(from).toHaveBeenCalledWith("work_mode_check_in_events")
  })
})
