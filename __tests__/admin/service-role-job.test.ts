import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const fromMock = vi.fn()

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: () => ({ from: fromMock }),
}))

import {
  executeServiceRoleJob,
  resolveServiceRoleJobOrgId,
  ServiceRoleJobError,
} from "@/lib/supabase/service-role-job"
import { isAllowedServiceRoleModule } from "@/lib/supabase/service-role-allowlist"

function mockOrgOk() {
  fromMock.mockImplementation((table: string) => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: async () => {
        if (table === "organizations") return { data: { id: "org-1" }, error: null }
        if (table === "events_v2") return { data: { id: "event-1", org_id: "org-1" }, error: null }
        if (table === "ticket_sales") return { data: { id: "sale-1", event_id: "event-1", org_id: "org-1" }, error: null }
        return { data: null, error: null }
      },
    }
    return builder
  })
}

describe("SEC-109 service role job", () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it("allowlists named modules", () => {
    expect(isAllowedServiceRoleModule("admin.ticketing.refund")).toBe(true)
    expect(isAllowedServiceRoleModule("random.module")).toBe(false)
  })

  it("requires orgId and reason", async () => {
    await expect(
      executeServiceRoleJob(
        { orgId: "", reason: "refund", moduleId: "admin.ticketing.refund" },
        async () => null,
      ),
    ).rejects.toMatchObject({ code: "org_required" })

    await expect(
      executeServiceRoleJob(
        { orgId: "org-1", reason: "x", moduleId: "admin.ticketing.refund" },
        async () => null,
      ),
    ).rejects.toMatchObject({ code: "reason_required" })
  })

  it("revalidates org then runs the job", async () => {
    mockOrgOk()
    const result = await executeServiceRoleJob(
      {
        orgId: "org-1",
        reason: "admin ticketing refund",
        moduleId: "admin.ticketing.refund",
        target: { eventId: "event-1", saleId: "sale-1" },
      },
      async () => "ok",
    )
    expect(result).toBe("ok")
  })

  it("rejects target org mismatch", async () => {
    fromMock.mockImplementation((table: string) => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => {
          if (table === "organizations") return { data: { id: "org-1" }, error: null }
          if (table === "events_v2") return { data: { id: "event-1", org_id: "org-other" }, error: null }
          return { data: null, error: null }
        },
      }
      return builder
    })

    await expect(
      executeServiceRoleJob(
        {
          orgId: "org-1",
          reason: "admin ticketing refund",
          moduleId: "admin.ticketing.refund",
          target: { eventId: "event-1" },
        },
        async () => null,
      ),
    ).rejects.toBeInstanceOf(ServiceRoleJobError)
  })

  it("revalidates an organization discovered for a scoped job", async () => {
    mockOrgOk()
    const orgId = await resolveServiceRoleJobOrgId({
      reason: "resolve publication share organization",
      moduleId: "admin.publication.share-resolution",
      lookup: async () => "org-1",
    })
    expect(orgId).toBe("org-1")
  })
})
