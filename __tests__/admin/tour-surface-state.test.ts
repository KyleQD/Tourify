import { describe, expect, it } from "vitest"

import { classifyTourSurfaceState } from "@/lib/admin/tour-surface-state"

describe("TOUR-105 tour surface states", () => {
  it("classifies permission, dependency, stale, empty, and system error", () => {
    expect(
      classifyTourSurfaceState({ status: 403, code: "capability_denied", correlationId: "c-1" }).kind,
    ).toBe("permission")

    expect(
      classifyTourSurfaceState({
        status: 503,
        code: "dependency_unavailable",
        correlationId: "c-2",
      }).kind,
    ).toBe("unavailable_dependency")

    expect(
      classifyTourSurfaceState({
        ok: true,
        isStale: true,
        itemCount: 3,
        correlationId: "c-3",
      }).kind,
    ).toBe("stale_snapshot")

    expect(classifyTourSurfaceState({ ok: true, itemCount: 0 }).kind).toBe("empty")

    const system = classifyTourSurfaceState({
      status: 500,
      message: "boom",
      correlationId: "c-4",
      ok: false,
    })
    expect(system.kind).toBe("system_error")
    expect(system.canRetry).toBe(true)
    expect(system.correlationId).toBe("c-4")
  })

  it("marks ready when ok with records", () => {
    expect(classifyTourSurfaceState({ ok: true, itemCount: 2 }).kind).toBe("ready")
  })
})
