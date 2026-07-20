import { resolveConsent } from "../consent-policy"
import { evaluateAggregationPolicy } from "../aggregation-policy"
import { canPublishBenchmark } from "../benchmark-release"
import { screenCompetitionSensitiveTopic } from "../antitrust-guard"
import { canTransitionNegotiationGroup } from "../negotiation-group-state-machine"
import { authorizeCleanRoomQuery } from "../data-clean-room-access"
import { releasesAffectedByOptOut } from "../opt-out-propagation"
import { policyFreshness } from "../policy-freshness"
import { DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS } from "../music-rights-intelligence-flags"

describe("Phase 8 rights-intelligence core", () => {
  it("denies consent by default when missing", () => {
    const result = resolveConsent({
      consents: [],
      subjectId: "u1",
      purpose: "aggregate_benchmarking",
      nowIso: "2026-07-17T00:00:00.000Z",
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe("missing")
  })

  it("blocks small cohorts and recent observations", () => {
    const result = evaluateAggregationPolicy({
      observations: [
        { participantId: "p1", controllerId: "c1", weight: 10, observedAt: "2026-07-01T00:00:00.000Z" },
        { participantId: "p2", controllerId: "c1", weight: 10, observedAt: "2026-07-01T00:00:00.000Z" },
      ],
      policy: {
        minimumParticipants: 25,
        minimumIndependentControllers: 5,
        maximumParticipantWeightBps: 2000,
        minimumAgeDays: 90,
        suppressOutliers: true,
      },
      nowIso: "2026-07-17T00:00:00.000Z",
    })
    expect(result.allowed).toBe(false)
    expect(result.reasons).toEqual(expect.arrayContaining(["small_cohort", "controller_concentration", "data_too_recent"]))
  })

  it("requires all benchmark gates and forbids recommendations", () => {
    expect(canPublishBenchmark({
      consentPassed: true,
      qualityPassed: true,
      privacyPassed: true,
      competitionPassed: true,
      methodologyPassed: true,
      sourceFresh: true,
      containsRecommendation: true,
    })).toBe(false)

    expect(canPublishBenchmark({
      consentPassed: true,
      qualityPassed: true,
      privacyPassed: true,
      competitionPassed: true,
      methodologyPassed: true,
      sourceFresh: true,
      containsRecommendation: false,
    })).toBe(true)
  })

  it("screens competition-sensitive topics", () => {
    const blocked = screenCompetitionSensitiveTopic("We should set a minimum rate for everyone")
    expect(blocked.allowed).toBe(false)
    expect(blocked.matchedPatterns.length).toBeGreaterThan(0)

    const allowed = screenCompetitionSensitiveTopic("Educational discussion of historical royalty ranges")
    expect(allowed.allowed).toBe(true)
  })

  it("keeps negotiation groups readiness-bound in the state machine", () => {
    expect(canTransitionNegotiationGroup("proposed", "legal_review")).toBe(true)
    expect(canTransitionNegotiationGroup("legal_review", "readiness_only")).toBe(true)
    expect(canTransitionNegotiationGroup("readiness_only", "active")).toBe(false)
    expect(canTransitionNegotiationGroup("readiness_only", "approved_for_simulation")).toBe(true)
  })

  it("default-denies clean-room queries with prohibited columns", () => {
    expect(authorizeCleanRoomQuery({
      query: {
        templateId: "aggregate_descriptive_v1",
        requestedColumns: ["email"],
        requestedFilters: {},
        purposeId: "policy_research",
      },
      policy: {
        allowedTemplateIds: ["aggregate_descriptive_v1"],
        prohibitedColumns: ["email", "peer_user_id"],
      },
    })).toBe(false)
  })

  it("propagates opt-out when cohort thresholds would break", () => {
    const affected = releasesAffectedByOptOut({
      participantId: "p1",
      releases: [
        { releaseId: "r1", participantIds: ["p1", "p2"], minimumParticipants: 2 },
        { releaseId: "r2", participantIds: ["p1", "p2", "p3"], minimumParticipants: 2 },
      ],
    })
    expect(affected).toEqual(["r1"])
  })

  it("marks stale policy education for review", () => {
    expect(policyFreshness({
      publishedAt: "2025-01-01T00:00:00.000Z",
      reviewBy: "2026-01-01T00:00:00.000Z",
    }, "2026-07-17T00:00:00.000Z")).toBe("review_due")
  })

  it("keeps all intelligence flags disabled by default", () => {
    expect(Object.values(DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS).every((value) => value === false)).toBe(true)
    expect(DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS.music_rights_intelligence_external_negotiation_enabled).toBe(false)
    expect(DISABLED_MUSIC_RIGHTS_INTELLIGENCE_FLAGS.music_rights_intelligence_benchmark_public_publish_enabled).toBe(false)
  })
})
