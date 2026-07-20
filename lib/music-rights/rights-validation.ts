import type {
  ExistingRightsClaim,
  RationalShare,
  RightsClaimInput,
  RightsSubjectType,
} from "./rights-types"

export interface ClaimValidationIssue {
  code:
    | "invalid_share"
    | "share_overflow"
    | "territory_overlap"
    | "date_overlap"
    | "missing_evidence"
    | "scope_conflict"
    | "category_mismatch"
  message: string
  claimIds?: string[]
}

function parseInteger(value: string): bigint {
  if (!/^-?\d+$/.test(value)) throw new Error("Share values must be integers")
  return BigInt(value)
}

export function normalizeShare(share: RationalShare): RationalShare {
  if (share.unknown) return { ...share, numerator: "0", denominator: "1" }

  const numerator = parseInteger(share.numerator)
  const denominator = parseInteger(share.denominator)
  if (denominator <= 0n || numerator < 0n || numerator > denominator)
    throw new Error("Invalid rational share")

  function gcd(a: bigint, b: bigint): bigint {
    let left = a
    let right = b
    while (right !== 0n) {
      const next = left % right
      left = right
      right = next
    }
    return left < 0n ? -left : left
  }

  const divisor = gcd(numerator, denominator)
  return {
    ...share,
    numerator: (numerator / divisor).toString(),
    denominator: (denominator / divisor).toString(),
  }
}

export function shareToRatio(share: RationalShare): number | null {
  if (share.unknown) return null
  const numerator = Number(share.numerator)
  const denominator = Number(share.denominator)
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null
  return numerator / denominator
}

export function validateCategoryForSubject(input: RightsClaimInput): ClaimValidationIssue | null {
  const category = input.rightsCategory.toLowerCase()
  if (input.subjectType === "musical_work" && category === "master")
    return {
      code: "category_mismatch",
      message: "Master claims cannot be applied to a musical work (composition).",
    }
  if (input.subjectType === "sound_recording" && category === "composition")
    return {
      code: "category_mismatch",
      message: "Composition claims cannot be applied to a sound recording (master).",
    }
  return null
}

export function validateClaimInput(input: RightsClaimInput): ClaimValidationIssue[] {
  const issues: ClaimValidationIssue[] = []
  try {
    normalizeShare(input.share)
  } catch (error) {
    issues.push({
      code: "invalid_share",
      message: error instanceof Error ? error.message : "Invalid share",
    })
  }

  if (!input.perpetual && !input.validUntil)
    issues.push({
      code: "date_overlap",
      message: "A non-perpetual claim requires an end date",
    })

  if (input.territoryCodes.length === 0)
    issues.push({
      code: "scope_conflict",
      message: "At least one territory or a worldwide marker is required",
    })

  const categoryIssue = validateCategoryForSubject(input)
  if (categoryIssue) issues.push(categoryIssue)

  return issues
}

function territoriesOverlap(left: string[], right: string[]): boolean {
  if (left.includes("WORLDWIDE") || right.includes("WORLDWIDE")) return true
  const rightSet = new Set(right.map((code) => code.toUpperCase()))
  return left.some((code) => rightSet.has(code.toUpperCase()))
}

function dateRangesOverlap(left: RightsClaimInput | ExistingRightsClaim, right: ExistingRightsClaim): boolean {
  if (left.perpetual && right.perpetual) return true
  const leftFrom = left.validFrom ? new Date(left.validFrom).getTime() : Number.NEGATIVE_INFINITY
  const leftUntil = left.perpetual || !left.validUntil
    ? Number.POSITIVE_INFINITY
    : new Date(left.validUntil).getTime()
  const rightFrom = right.validFrom ? new Date(right.validFrom).getTime() : Number.NEGATIVE_INFINITY
  const rightUntil = right.perpetual || !right.validUntil
    ? Number.POSITIVE_INFINITY
    : new Date(right.validUntil).getTime()
  return leftFrom <= rightUntil && rightFrom <= leftUntil
}

export function detectClaimConflicts(input: {
  candidate: RightsClaimInput
  existing: ExistingRightsClaim[]
}): ClaimValidationIssue[] {
  const issues = validateClaimInput(input.candidate)
  if (issues.some((issue) => issue.code === "invalid_share" || issue.code === "category_mismatch"))
    return issues

  const active = input.existing.filter((claim) =>
    ["proposed", "accepted", "disputed"].includes(claim.status)
    && claim.subjectType === input.candidate.subjectType
    && claim.subjectId === input.candidate.subjectId
    && claim.claimType === input.candidate.claimType
    && claim.rightsCategory.toLowerCase() === input.candidate.rightsCategory.toLowerCase()
  )

  const overlapping = active.filter((claim) =>
    territoriesOverlap(input.candidate.territoryCodes, claim.territoryCodes)
    && dateRangesOverlap(input.candidate, claim)
  )

  if (overlapping.length === 0) return issues

  const knownShares = [input.candidate.share, ...overlapping.map((claim) => claim.share)]
    .filter((share) => !share.unknown)
    .map((share) => normalizeShare(share))

  if (knownShares.length > 0) {
    const commonDenominator = knownShares.reduce((acc, share) => acc * BigInt(share.denominator), 1n)
    let totalNumerator = 0n
    for (const share of knownShares)
      totalNumerator += BigInt(share.numerator) * (commonDenominator / BigInt(share.denominator))
    if (totalNumerator > commonDenominator)
      issues.push({
        code: "share_overflow",
        message: "Known shares exceed 100% for the same subject, right, territory, and term.",
        claimIds: overlapping.map((claim) => claim.id),
      })
  }

  const hasUnknown = input.candidate.share.unknown || overlapping.some((claim) => claim.share.unknown)
  if (hasUnknown || overlapping.some((claim) => claim.status === "disputed"))
    issues.push({
      code: "territory_overlap",
      message: "Overlapping claims require explicit conflict status; unknown shares are not treated as zero.",
      claimIds: overlapping.map((claim) => claim.id),
    })

  return issues
}

export function isCompositionSubject(subjectType: RightsSubjectType): boolean {
  return subjectType === "musical_work"
}
