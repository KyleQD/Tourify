import { resolveMandate } from "../mandate-policy"
import { canTransitionRegistration } from "../registration-state-machine"
import { canTransitionClaim } from "../claim-state-machine"
import { counterNoticeRestorationWindow } from "../dmca-case-state-machine"
import { rankUsageCandidates } from "../usage-match"
import { reconcileExternalRecord } from "../external-record-reconciliation"
import { reconcileCollection } from "../collection-reconciliation"
import { calculateSection203Candidate } from "../reversion-window"
import { classifyMatchForAction, evaluateOutboundActionGate } from "../action-safety"
import { buildPhase3RecoveryHandoff } from "../phase3-recovery-handoff"
import { DISABLED_MUSIC_RIGHTS_ADMIN_FLAGS } from "../music-rights-admin-flags"
import { hashPayload, verifyPartnerWebhookSignature } from "../partner-adapters"

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1)
    const day = result.getUTCDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return result
}

describe("Phase 7 rights-admin core", () => {
  it("defaults mandate resolution to deny without exact scope", () => {
    const result = resolveMandate({
      action: "register",
      assetId: "a1",
      rightCategory: "composition",
      territoryCode: "US",
      serviceCode: "register",
      at: new Date("2026-07-17T00:00:00Z"),
      mandates: [],
    })
    expect(result.allowed).toBe(false)
    expect(result.reason).toBe("no_active_exact_scope_mandate")
  })

  it("accepts active exact-scope mandates", () => {
    const result = resolveMandate({
      action: "register",
      assetId: "a1",
      rightCategory: "composition",
      territoryCode: "US",
      serviceCode: "register",
      at: new Date("2026-07-17T00:00:00Z"),
      mandates: [{
        id: "m1",
        status: "active",
        assetIds: ["a1"],
        rightCategories: ["composition"],
        territoryCodes: ["WORLDWIDE"],
        serviceCodes: ["register"],
        startsAt: new Date("2026-01-01T00:00:00Z"),
      }],
    })
    expect(result.allowed).toBe(true)
  })

  it("never auto-acts on fingerprint matches alone", () => {
    const high = rankUsageCandidates([{
      assetId: "a1",
      identifierScore: 1,
      metadataScore: 1,
      audioScore: 1,
      versionPenalty: 0,
    }])
    expect(high.decision).toBe("auto_candidate")
    expect(classifyMatchForAction([{
      assetId: "a1",
      identifierScore: 1,
      metadataScore: 1,
      audioScore: 1,
      versionPenalty: 0,
    }]).mayAutoAct).toBe(false)

    expect(evaluateOutboundActionGate({
      hasActiveMandate: true,
      humanReviewed: false,
      automatedSubmissionEnabled: false,
      autoTakedownEnabled: false,
      action: "takedown",
      matchConfidence: 0.99,
    }).allowed).toBe(false)
  })

  it("blocks auto-takedown even when the auto flag is on", () => {
    expect(evaluateOutboundActionGate({
      hasActiveMandate: true,
      humanReviewed: true,
      automatedSubmissionEnabled: true,
      autoTakedownEnabled: true,
      action: "takedown",
    }).reason).toBe("auto_takedown_flag_must_remain_off_without_counsel")
  })

  it("enforces registration and claim state machines", () => {
    expect(canTransitionRegistration("draft", "validated")).toBe(true)
    expect(canTransitionRegistration("accepted", "draft")).toBe(false)
    expect(canTransitionClaim("draft", "review")).toBe(true)
    expect(canTransitionClaim("closed", "draft")).toBe(false)
  })

  it("computes DMCA counter-notice restoration windows", () => {
    const window = counterNoticeRestorationWindow(new Date("2026-07-17T00:00:00Z"), addBusinessDays)
    expect(window.earliest.getTime()).toBeLessThan(window.latest.getTime())
  })

  it("never silently overwrites conflicting external fields without authority", () => {
    const result = reconcileExternalRecord([
      { field: "title", localValue: "A", externalValue: "B", authority: "manual" },
      { field: "iswc", localValue: "X", externalValue: "Y", authority: "external" },
    ])
    expect(result.conflicts).toHaveLength(1)
    expect(result.accepted).toHaveLength(1)
  })

  it("reconciles collections and hands off to Phase 3", () => {
    const recon = reconcileCollection({
      grossMinor: 100n,
      providerFeesMinor: 10n,
      withholdingMinor: 5n,
      currency: "USD",
    }, 85n)
    expect(recon.balanced).toBe(true)
    const handoff = buildPhase3RecoveryHandoff({ caseId: "c1", amountMinor: 85, currency: "USD" })
    expect(handoff.source).toBe("music_rights_admin")
    expect(handoff.note).toMatch(/source of truth/i)
  })

  it("marks reversion windows as candidates only", () => {
    const candidate = calculateSection203Candidate({
      executionDate: new Date("2000-01-01T00:00:00Z"),
      workMadeForHire: false,
      includesPublicationRight: false,
    })
    expect(candidate.eligibleForReview).toBe(true)
    expect(candidate.reason).toMatch(/candidate_only/)
  })

  it("keeps rights-admin flags disabled by default", () => {
    expect(DISABLED_MUSIC_RIGHTS_ADMIN_FLAGS.music_rights_admin_auto_takedown_enabled).toBe(false)
    expect(DISABLED_MUSIC_RIGHTS_ADMIN_FLAGS.music_rights_admin_litigation_enabled).toBe(false)
    expect(hashPayload({ a: 1 })).toHaveLength(64)
    expect(verifyPartnerWebhookSignature({ rawBody: "{}", signature: "x", secret: "s" })).toBe(false)
  })
})
