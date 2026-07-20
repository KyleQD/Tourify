import type { RationalShare, RightsClaimInput } from "./rights-types"

export interface ClaimValidationIssue {
  code:
    | "invalid_share"
    | "share_overflow"
    | "territory_overlap"
    | "date_overlap"
    | "missing_evidence"
    | "scope_conflict"
  message: string
  claimIds?: string[]
}

function parseInteger(value: string): bigint {
  if (!/^-?\d+$/.test(value)) {
    throw new Error("Share values must be integers")
  }
  return BigInt(value)
}

export function normalizeShare(share: RationalShare): RationalShare {
  if (share.unknown) return { ...share, numerator: "0", denominator: "1" }

  const numerator = parseInteger(share.numerator)
  const denominator = parseInteger(share.denominator)
  if (denominator <= 0n || numerator < 0n || numerator > denominator) {
    throw new Error("Invalid rational share")
  }

  function gcd(a: bigint, b: bigint): bigint {
    let left = a
    let right = b
    while (right !== 0n) {
      const next = left % right
      left = right
      right = next
    }
    return left
  }

  const divisor = gcd(numerator, denominator)
  return {
    ...share,
    numerator: (numerator / divisor).toString(),
    denominator: (denominator / divisor).toString(),
  }
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

  if (!input.perpetual && !input.validUntil) {
    issues.push({
      code: "date_overlap",
      message: "A non-perpetual claim requires an end date",
    })
  }

  if (input.territoryCodes.length === 0) {
    issues.push({
      code: "scope_conflict",
      message: "At least one territory or a worldwide marker is required",
    })
  }

  return issues
}
