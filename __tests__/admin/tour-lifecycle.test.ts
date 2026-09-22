import { describe, expect, it } from "vitest"
import {
  evaluateTourTransition,
  isTourHardDeleteEligible,
  isTourLifecycleReadOnly,
  LEGACY_TOUR_STATUS_MAP,
  normalizeTourLifecycleState,
  TOUR_LIFECYCLE_STATES,
  TOUR_TRANSITIONS,
} from "@/lib/admin/tour-lifecycle"
import { resolveEffectiveAdminCapabilities } from "@/lib/auth/admin-capabilities"

describe("TOUR-101 lifecycle state machine", () => {
  it("defines the full recommended state set", () => {
    expect(TOUR_LIFECYCLE_STATES).toEqual([
      "draft",
      "planning",
      "ready",
      "published",
      "active",
      "completed",
      "settled",
      "cancelled",
      "archived",
    ])
  })

  it("maps legacy statuses into the canonical model", () => {
    expect(normalizeTourLifecycleState("on_hold")).toBe("planning")
    expect(normalizeTourLifecycleState("canceled")).toBe("cancelled")
    expect(LEGACY_TOUR_STATUS_MAP.active).toBe("active")
  })

  it("allows draft → planning with tour.manage", () => {
    const caps = resolveEffectiveAdminCapabilities({
      role: "tour_manager",
      membershipStatus: "active",
    })
    const result = evaluateTourTransition({
      command: "start_planning",
      currentState: "draft",
      capabilities: caps,
    })
    expect(result.ok).toBe(true)
    expect(result.nextState).toBe("planning")
  })

  it("blocks mark_ready when readiness blockers remain", () => {
    const caps = resolveEffectiveAdminCapabilities({
      role: "tour_manager",
      membershipStatus: "active",
    })
    const result = evaluateTourTransition({
      command: "mark_ready",
      currentState: "planning",
      capabilities: caps,
      unmetBlockers: ["readiness.mandatory"],
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("tour_transition_blocked")
    expect(result.unmetBlockers).toContain("readiness.mandatory")
  })

  it("requires tour.publish for publish and reason for retract/cancel", () => {
    const viewer = resolveEffectiveAdminCapabilities({
      role: "viewer",
      membershipStatus: "active",
    })
    expect(
      evaluateTourTransition({
        command: "publish",
        currentState: "ready",
        capabilities: viewer,
      }).ok,
    ).toBe(false)
    expect(
      evaluateTourTransition({
        command: "publish",
        currentState: "ready",
        capabilities: viewer,
      }).code,
    ).toBe("capability_denied")

    const owner = resolveEffectiveAdminCapabilities({
      role: "owner",
      membershipStatus: "active",
    })
    expect(
      evaluateTourTransition({
        command: "publish",
        currentState: "ready",
        capabilities: owner,
      }).ok,
    ).toBe(true)

    expect(
      evaluateTourTransition({
        command: "cancel",
        currentState: "active",
        capabilities: owner,
      }).code,
    ).toBe("tour_transition_reason_required")

    expect(
      evaluateTourTransition({
        command: "cancel",
        currentState: "active",
        capabilities: owner,
        reason: "Artist illness",
      }).nextState,
    ).toBe("cancelled")
  })

  it("rejects invalid transitions with stable error codes", () => {
    const owner = resolveEffectiveAdminCapabilities({
      role: "owner",
      membershipStatus: "active",
    })
    const result = evaluateTourTransition({
      command: "activate",
      currentState: "draft",
      capabilities: owner,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("tour_transition_invalid_activate")
  })

  it("archives only from terminal states and restores with reason", () => {
    const owner = resolveEffectiveAdminCapabilities({
      role: "owner",
      membershipStatus: "active",
    })
    expect(
      evaluateTourTransition({
        command: "archive",
        currentState: "active",
        capabilities: owner,
      }).ok,
    ).toBe(false)
    expect(
      evaluateTourTransition({
        command: "archive",
        currentState: "settled",
        capabilities: owner,
      }).nextState,
    ).toBe("archived")
    expect(
      evaluateTourTransition({
        command: "restore",
        currentState: "archived",
        capabilities: owner,
        reason: "Reopen closeout",
      }).nextState,
    ).toBe("completed")
  })

  it("documents side effects on every transition", () => {
    for (const transition of TOUR_TRANSITIONS) {
      expect(transition.sideEffects.length).toBeGreaterThan(0)
      expect(transition.sideEffects).toContain("outbox.tour.lifecycle_changed")
    }
  })

  it("limits hard delete to drafts and marks cancelled/archived read-only", () => {
    expect(isTourHardDeleteEligible("draft")).toBe(true)
    expect(isTourHardDeleteEligible("active")).toBe(false)
    expect(isTourLifecycleReadOnly("cancelled")).toBe(true)
    expect(isTourLifecycleReadOnly("archived")).toBe(true)
    expect(isTourLifecycleReadOnly("planning")).toBe(false)
  })
})
