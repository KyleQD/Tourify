import { resolveAvailability } from "../rights-availability"
import { classifyLicenseRequest } from "../license-classification"
import { canTransitionLicenseRequest } from "../license-request-state-machine"
import { canTransitionQuote } from "../quote-state-machine"
import { evaluateApprovals } from "../approval-matrix"
import { aiUseAllowed } from "../ai-license-policy"
import { validateCueSheet } from "../cue-sheet-validator"
import { validateLicenseGrant } from "../license-grant-validator"
import { evaluateDeliveryGate } from "../delivery-gate"
import { resolveWorkflowModule } from "../workflow-modules"
import { territoryAllowed } from "../territory-resolver"
import { buildPhase3RoyaltyHandoff } from "../phase3-handoff"
import { DISABLED_MUSIC_LICENSING_FLAGS } from "../music-licensing-flags"
import { hashPayload, verifyPartnerWebhookSignature } from "../partner-adapters"

describe("Phase 6 licensing core", () => {
  it("defaults availability to deny without configured authority", () => {
    expect(resolveAvailability({
      configured: false,
      activeAuthority: false,
      disputed: false,
      expired: false,
      territoryAllowed: true,
      useAllowed: true,
      preClearanceEnvelopeMatches: false,
      quoteRuleExists: false,
    })).toBe("not_configured")

    expect(resolveAvailability({
      configured: true,
      activeAuthority: false,
      disputed: false,
      expired: false,
      territoryAllowed: true,
      useAllowed: true,
      preClearanceEnvelopeMatches: false,
      quoteRuleExists: false,
    })).toBe("inquiry_only")

    expect(resolveAvailability({
      configured: true,
      activeAuthority: true,
      disputed: true,
      expired: false,
      territoryAllowed: true,
      useAllowed: true,
      preClearanceEnvelopeMatches: false,
      quoteRuleExists: false,
    })).toBe("conflicted")
  })

  it("classifies sync/master before quote rules", () => {
    const result = classifyLicenseRequest({
      hasMovingImages: true,
      usesExistingRecording: true,
      createsPhonorecords: false,
      samplesExistingAudio: false,
      replaysComposition: false,
      changesLyricsOrFundamentalCharacter: false,
      isLiveEvent: false,
      isUserGeneratedContent: false,
      isAiTraining: false,
      isSyntheticVoice: false,
    })
    expect(result.families).toEqual(expect.arrayContaining(["sync", "master_use"]))
  })

  it("enforces request and quote state machines", () => {
    expect(canTransitionLicenseRequest("draft", "submitted")).toBe(true)
    expect(canTransitionLicenseRequest("draft", "licensed")).toBe(false)
    expect(canTransitionQuote("issued", "accepted")).toBe(true)
    expect(canTransitionQuote("accepted", "issued")).toBe(false)
  })

  it("requires all clearance-leg approvers", () => {
    const result = evaluateApprovals({
      currentRequestVersion: 1,
      legs: [{
        id: "leg-1",
        rightCategory: "sync",
        assetId: "a1",
        requiredApproverPartyIds: ["p1", "p2"],
        authoritySnapshots: [],
        status: "pending",
        blockers: [],
      }],
      approvals: [{ partyId: "p1", requestVersion: 1, approved: true }],
    })
    expect(result.clearable).toBe(false)
    expect(result.missing[0].partyIds).toEqual(["p2"])
  })

  it("keeps AI licensing separately gated by opt-in", () => {
    expect(aiUseAllowed({
      optedIn: false,
      permittedPurposes: ["pretraining"],
      permitsVoiceModel: false,
      permitsDatasetRedistribution: false,
      requiresOutputAttribution: true,
    }, "pretraining")).toBe(false)

    expect(aiUseAllowed({
      optedIn: true,
      permittedPurposes: ["research"],
      permitsVoiceModel: false,
      permitsDatasetRedistribution: false,
      requiresOutputAttribution: true,
    }, "pretraining")).toBe(false)

    expect(resolveWorkflowModule({
      families: ["ai_training"],
      aiFlagEnabled: false,
    }).blocked).toBe(true)
  })

  it("blocks delivery until agreement is effective", () => {
    expect(evaluateDeliveryGate({
      agreementStatus: "executed",
      conditionsSatisfied: true,
      paymentRequired: false,
      paymentConfirmed: false,
      purpose: "final",
    }).allowed).toBe(false)

    expect(evaluateDeliveryGate({
      agreementStatus: "effective",
      conditionsSatisfied: true,
      paymentRequired: false,
      paymentConfirmed: false,
      purpose: "final",
    }).allowed).toBe(true)

    expect(evaluateDeliveryGate({
      agreementStatus: "effective",
      conditionsSatisfied: true,
      paymentRequired: false,
      paymentConfirmed: false,
      purpose: "preview",
    }).holdReason).toBe("preview_is_not_a_licence")
  })

  it("validates grants and cue sheets", () => {
    expect(validateLicenseGrant({
      agreementExecuted: false,
      conditionsSatisfied: true,
      paymentRequired: false,
      paymentConfirmed: false,
      scope: { family: "sync", assetIds: ["a"], territories: ["US"], termStartsAt: "2026-01-01", media: ["film"], uses: ["bg"] },
      legs: [],
    }).effective).toBe(false)

    expect(validateCueSheet([{
      workTitle: "Track",
      durationSeconds: 30,
      useType: "background",
      writers: ["Writer"],
      isrc: "USRC17607839",
    }]).valid).toBe(true)
  })

  it("resolves territories and Phase 3 handoff intents", () => {
    expect(territoryAllowed({
      includes: ["WORLDWIDE"],
      excludes: ["CU"],
      startsAt: "2020-01-01T00:00:00Z",
    }, "US", new Date("2026-07-17"))).toBe(true)

    const handoff = buildPhase3RoyaltyHandoff({ agreementId: "agr-1", invoiceId: "inv-1", amountMinor: 100, currency: "USD" })
    expect(handoff.source).toBe("music_licensing")
    expect(handoff.note).toMatch(/source of truth/i)
  })

  it("keeps licensing flags disabled by default and verifies webhook signatures", () => {
    expect(DISABLED_MUSIC_LICENSING_FLAGS.music_licensing_agreements_enabled).toBe(false)
    const raw = JSON.stringify({ id: "1", type: "invoice.paid" })
    expect(verifyPartnerWebhookSignature({ rawBody: raw, signature: "bad", secret: "s" })).toBe(false)
    expect(hashPayload({ a: 1 })).toHaveLength(64)
  })
})
