import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/admin/publication-outbox.service", () => ({
  commitDomainWithOutbox: vi.fn(async () => ({
    transactionId: "tx-1",
    outboxId: "ob-1",
    alreadyExisted: false,
    correlationId: "corr-1",
  })),
}))

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(async () => undefined),
}))

vi.mock("@/lib/admin/tour-access.service", () => ({
  requireTourAccess: vi.fn(async (input: { tourId: string; orgId?: string }) => ({
    tourId: input.tourId,
    orgId: input.orgId ?? "org-1",
    status: "published",
    name: "Summer",
    relation: "org_member",
    collaboratorRole: null,
    createdBy: "publisher-1",
    userId: "publisher-1",
  })),
}))

import { commitDomainWithOutbox } from "@/lib/admin/publication-outbox.service"
import { logAuditEvent } from "@/lib/audit"
import {
  executeTourTransition,
  isTourTransitionCommand,
  TourTransitionError,
} from "@/lib/admin/tour-transition.service"

function createSupabaseMock(tourRow: Record<string, unknown>) {
  const state = { tour: { ...tourRow }, rolledBack: false }

  function from(table: string) {
    if (table === "tour_events") {
      return {
        select: () => ({
          eq: async () => ({ data: [], error: null }),
        }),
      }
    }
    if (table === "settlements") {
      return {
        select: () => ({
          eq: async () => ({ data: [], error: { code: "42P01", message: "missing" } }),
        }),
      }
    }
    if (table !== "tours") throw new Error(`unexpected table ${table}`)

    return {
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: state.tour, error: null }),
          }),
        }),
      }),
      update: (patch: Record<string, unknown>) => {
        const chain = {
          eq: () => chain,
          select: () => ({
            maybeSingle: async () => {
              if (patch.status && patch.status !== state.tour.status) {
                state.tour = { ...state.tour, ...patch }
              } else if (patch.status === state.tour.status || !patch.status) {
                // rollback path restores prior status
                state.tour = { ...state.tour, ...patch }
                state.rolledBack = true
              }
              return { data: state.tour, error: null }
            },
          }),
        }
        return chain
      },
    }
  }

  return { from, _state: state }
}

describe("TOUR-202 tour transition commands", () => {
  beforeEach(() => {
    vi.mocked(commitDomainWithOutbox).mockClear()
    vi.mocked(logAuditEvent).mockClear()
  })

  it("recognizes lifecycle commands", () => {
    expect(isTourTransitionCommand("publish")).toBe(true)
    expect(isTourTransitionCommand("patch_status")).toBe(false)
  })

  it("activates a published tour with audit + outbox", async () => {
    const supabase = createSupabaseMock({
      id: "tour-1",
      org_id: "org-1",
      status: "published",
      name: "Summer",
      settings: { lifecycle: { published_by: "publisher-1" } },
      created_by: "publisher-1",
      metadata_version: 2,
    })

    const result = await executeTourTransition({
      supabase: supabase as never,
      userId: "actor-2",
      orgId: "org-1",
      tourId: "tour-1",
      command: "activate",
      capabilities: ["tour.manage", "tour.view"],
      correlationId: "corr-1",
    })

    expect(result.toState).toBe("active")
    expect(result.fromState).toBe("published")
    expect(result.outboxIds.length).toBeGreaterThan(0)
    expect(commitDomainWithOutbox).toHaveBeenCalled()
    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        entityType: "tour",
        entityId: "tour-1",
        oldValues: { status: "published" },
        newValues: expect.objectContaining({ status: "active", command: "activate" }),
      }),
    )
  })

  it("rejects direct capability misses and invalid from-state", async () => {
    const supabase = createSupabaseMock({
      id: "tour-1",
      org_id: "org-1",
      status: "draft",
      name: "Draft",
      settings: {},
      created_by: "u1",
      metadata_version: 1,
    })

    await expect(
      executeTourTransition({
        supabase: supabase as never,
        userId: "u1",
        orgId: "org-1",
        tourId: "tour-1",
        command: "publish",
        capabilities: ["tour.manage"],
      }),
    ).rejects.toMatchObject({ code: "tour_transition_invalid_publish" })

    await expect(
      executeTourTransition({
        supabase: supabase as never,
        userId: "u1",
        orgId: "org-1",
        tourId: "tour-1",
        command: "start_planning",
        capabilities: ["tour.view"],
      }),
    ).rejects.toBeInstanceOf(TourTransitionError)
  })

  it("requires reason for retract/cancel", async () => {
    const supabase = createSupabaseMock({
      id: "tour-1",
      org_id: "org-1",
      status: "published",
      name: "Summer",
      settings: {},
      created_by: "u1",
      metadata_version: 1,
    })

    await expect(
      executeTourTransition({
        supabase: supabase as never,
        userId: "u1",
        orgId: "org-1",
        tourId: "tour-1",
        command: "retract",
        capabilities: ["tour.publish"],
      }),
    ).rejects.toMatchObject({ code: "tour_transition_reason_required" })
  })
})
