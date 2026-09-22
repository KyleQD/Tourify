import { describe, expect, it } from "vitest"
import { evaluateTourTransition } from "@/lib/admin/tour-lifecycle"
import {
  assertStateAllowsAction,
  evaluateStateAwareAuth,
  isLegallyRetainedFromSettings,
  readTourPriorLifecycleActor,
  StateAwareAuthDeniedError,
  tourStateStrength,
} from "@/lib/admin/state-aware-authorization"
import { evaluateSeparationOfDuties } from "@/lib/admin/separation-of-duties"

const MANAGE = ["tour.manage"] as const
const DELETE = ["tour.delete"] as const
const FINANCE = ["finance.approve", "finance.pay", "finance.manage"] as const
const ACTOR = "actor-1"
const OTHER = "actor-2"

describe("SEC-202 state-aware authorization", () => {
  it("classifies tour state strength", () => {
    expect(tourStateStrength("draft")).toBe("open")
    expect(tourStateStrength("published")).toBe("strong")
    expect(tourStateStrength("active")).toBe("strong")
    expect(tourStateStrength("settled")).toBe("settled")
    expect(tourStateStrength("archived")).toBe("readonly")
  })

  it("allows metadata edits on published/active with tour.manage", () => {
    for (const state of ["published", "active", "completed"] as const) {
      expect(
        evaluateStateAwareAuth({
          domain: "tour",
          state,
          action: "update_metadata",
          capabilities: MANAGE,
          actorUserId: ACTOR,
        }).ok,
      ).toBe(true)
    }
  })

  it("blocks direct status writes in every lifecycle state (TOUR-202)", () => {
    for (const state of ["draft", "planning", "published", "active"] as const) {
      const result = evaluateStateAwareAuth({
        domain: "tour",
        state,
        action: "update_status_direct",
        capabilities: MANAGE,
        actorUserId: ACTOR,
      })
      expect(result.ok).toBe(false)
      expect(result.code).toBe("use_lifecycle_transition")
    }
  })

  it("blocks hard delete on published/active/settled/archived", () => {
    for (const state of ["published", "active", "settled", "archived"] as const) {
      const result = evaluateStateAwareAuth({
        domain: "tour",
        state,
        action: "delete",
        capabilities: DELETE,
        actorUserId: ACTOR,
      })
      expect(result.ok).toBe(false)
      expect(result.code).toBe("state_forbidden")
    }
    expect(
      evaluateStateAwareAuth({
        domain: "tour",
        state: "draft",
        action: "delete",
        capabilities: DELETE,
        actorUserId: ACTOR,
      }).ok,
    ).toBe(true)
  })

  it("requires elevated capability for settled tour metadata", () => {
    expect(
      evaluateStateAwareAuth({
        domain: "tour",
        state: "settled",
        action: "update_metadata",
        capabilities: MANAGE,
        actorUserId: ACTOR,
      }).ok,
    ).toBe(false)

    expect(
      evaluateStateAwareAuth({
        domain: "tour",
        state: "settled",
        action: "update_metadata",
        capabilities: ["finance.approve"],
        actorUserId: ACTOR,
      }).ok,
    ).toBe(true)

    expect(
      evaluateStateAwareAuth({
        domain: "tour",
        state: "settled",
        action: "update_plan",
        capabilities: FINANCE,
        actorUserId: ACTOR,
      }).ok,
    ).toBe(false)
  })

  it("marks archived/cancelled tours read-only for metadata", () => {
    for (const state of ["archived", "cancelled"] as const) {
      const result = evaluateStateAwareAuth({
        domain: "tour",
        state,
        action: "update_metadata",
        capabilities: MANAGE,
        actorUserId: ACTOR,
      })
      expect(result.ok).toBe(false)
      expect(result.code).toBe("state_readonly")
    }
  })

  it("blocks delete/archive when legally retained", () => {
    expect(isLegallyRetainedFromSettings({ legal_hold: true })).toBe(true)
    expect(isLegallyRetainedFromSettings({ retention_until: "2099-01-01T00:00:00.000Z" })).toBe(true)

    const result = evaluateStateAwareAuth({
      domain: "tour",
      state: "draft",
      action: "delete",
      capabilities: DELETE,
      actorUserId: ACTOR,
      legallyRetained: true,
    })
    expect(result.ok).toBe(false)
    expect(result.code).toBe("legally_retained")

    expect(
      evaluateTourTransition({
        command: "archive",
        currentState: "settled",
        capabilities: ["tour.archive"],
        legallyRetained: true,
      }).ok,
    ).toBe(false)
  })

  it("enforces separation of duties on settle/pay/approve", () => {
    expect(
      evaluateSeparationOfDuties({
        actorUserId: ACTOR,
        priorActorUserId: ACTOR,
        action: "settle",
      }).ok,
    ).toBe(false)

    expect(
      evaluateSeparationOfDuties({
        actorUserId: ACTOR,
        priorActorUserId: OTHER,
        action: "settle",
      }).ok,
    ).toBe(true)

    expect(
      evaluateTourTransition({
        command: "settle",
        currentState: "completed",
        capabilities: ["finance.approve"],
        unmetBlockers: [],
        actorUserId: ACTOR,
        priorActorUserId: ACTOR,
      }).code,
    ).toBe("separation_of_duties")

    expect(
      evaluateStateAwareAuth({
        domain: "finance_transaction",
        state: "pending",
        action: "pay",
        capabilities: ["finance.pay"],
        actorUserId: ACTOR,
        priorActorUserId: ACTOR,
      }).code,
    ).toBe("separation_of_duties")

    expect(
      evaluateStateAwareAuth({
        domain: "finance_transaction",
        state: "pending",
        action: "pay",
        capabilities: ["finance.pay"],
        actorUserId: ACTOR,
        priorActorUserId: OTHER,
      }).ok,
    ).toBe(true)
  })

  it("blocks mutation of posted finance transactions", () => {
    expect(
      evaluateStateAwareAuth({
        domain: "finance_transaction",
        state: "paid",
        action: "update_metadata",
        capabilities: FINANCE,
        actorUserId: ACTOR,
      }).code,
    ).toBe("immutable_record")

    expect(
      evaluateStateAwareAuth({
        domain: "finance_settlement",
        state: "finalized",
        action: "update_metadata",
        capabilities: FINANCE,
        actorUserId: ACTOR,
      }).code,
    ).toBe("immutable_record")
  })

  it("blocks settled/published event hard delete", () => {
    expect(
      evaluateStateAwareAuth({
        domain: "event",
        state: "published",
        action: "delete",
        capabilities: ["event.manage"],
        actorUserId: ACTOR,
      }).ok,
    ).toBe(false)

    expect(
      evaluateStateAwareAuth({
        domain: "event",
        state: "settled",
        action: "update_metadata",
        capabilities: ["event.manage"],
        actorUserId: ACTOR,
      }).ok,
    ).toBe(false)

    expect(
      evaluateStateAwareAuth({
        domain: "event",
        state: "settled",
        action: "update_metadata",
        capabilities: ["finance.approve"],
        actorUserId: ACTOR,
      }).ok,
    ).toBe(true)
  })

  it("reads lifecycle prior actor from settings", () => {
    expect(
      readTourPriorLifecycleActor({
        lifecycle: { published_by: OTHER },
      }),
    ).toBe(OTHER)
  })

  it("assertStateAllowsAction throws typed denial", () => {
    expect(() =>
      assertStateAllowsAction({
        domain: "tour",
        state: "archived",
        action: "update_metadata",
        capabilities: MANAGE,
        actorUserId: ACTOR,
      }),
    ).toThrow(StateAwareAuthDeniedError)
  })
})
