import {
  detectClaimConflicts,
  normalizeShare,
  validateClaimInput,
} from "../rights-validation"
import { coverBlocksCompositionOwnershipClaim, producerPointsDefaultClaimType, validateSpecialCaseRelationship } from "../asset-relationships"

describe("music rights validation", () => {
  it("normalizes rational shares with gcd", () => {
    expect(normalizeShare({ numerator: "50", denominator: "100", unknown: false })).toEqual({
      numerator: "1",
      denominator: "2",
      unknown: false,
    })
  })

  it("treats unknown shares as non-ownership zeros for normalization only", () => {
    expect(normalizeShare({ numerator: "1", denominator: "2", unknown: true })).toEqual({
      numerator: "0",
      denominator: "1",
      unknown: true,
    })
  })

  it("rejects composition claims on sound recordings", () => {
    const issues = validateClaimInput({
      subjectType: "sound_recording",
      subjectId: "rec-1",
      claimantPartyId: "party-1",
      claimType: "ownership",
      rightsCategory: "composition",
      share: { numerator: "1", denominator: "1", unknown: false },
      territoryCodes: ["WORLDWIDE"],
      perpetual: true,
    })
    expect(issues.some((issue) => issue.code === "category_mismatch")).toBe(true)
  })

  it("detects share overflow across overlapping territories", () => {
    const issues = detectClaimConflicts({
      candidate: {
        subjectType: "musical_work",
        subjectId: "work-1",
        claimantPartyId: "party-2",
        claimType: "ownership",
        rightsCategory: "composition",
        share: { numerator: "1", denominator: "2", unknown: false },
        territoryCodes: ["US"],
        perpetual: true,
      },
      existing: [{
        id: "claim-1",
        subjectType: "musical_work",
        subjectId: "work-1",
        claimType: "ownership",
        rightsCategory: "composition",
        share: { numerator: "3", denominator: "4", unknown: false },
        territoryCodes: ["WORLDWIDE"],
        perpetual: true,
        status: "accepted",
      }],
    })
    expect(issues.some((issue) => issue.code === "share_overflow")).toBe(true)
  })

  it("models cover/remix/sample and producer-points defaults", () => {
    expect(producerPointsDefaultClaimType()).toBe("income_participation")
    expect(coverBlocksCompositionOwnershipClaim({
      relationshipType: "cover_of_work",
      claimType: "ownership",
      rightsCategory: "composition",
    })).toBe(true)
    expect(validateSpecialCaseRelationship({
      relationshipType: "sample_of_recording",
      fromSubjectType: "sound_recording",
      fromSubjectId: "a",
      toSubjectType: "sound_recording",
      toSubjectId: "b",
      clearanceStatus: "unknown",
    }).some((issue) => issue.code === "missing_clearance")).toBe(true)
  })
})
