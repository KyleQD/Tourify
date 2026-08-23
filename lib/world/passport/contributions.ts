/**
 * P21-T05/T06/T07 — community contributions.
 *
 * Six contribution actions feed review candidates; nothing mutates
 * canonical knowledge directly. A pure sliding-window rate limiter bounds
 * abuse, and reputation signals stay dormant until moderation data exists.
 */

export const CONTRIBUTION_KINDS = [
  "correction",
  "landmark",
  "artist",
  "tradition",
  "connection",
  "source_suggestion",
] as const

export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number]

export interface ContributionDraft {
  kind: ContributionKind
  placePath: string | null
  payload: Record<string, unknown>
  submittedBy: string
}

export interface ContributionCandidate {
  contributionId: string
  draft: ContributionDraft
  /** Always a review candidate — never a direct canonical write. */
  reviewStatus: "candidate"
  submittedAt: string
}

export type ContributionValidation =
  | { ok: true; candidate: ContributionCandidate }
  | { ok: false; error: string }

const PAYLOAD_REQUIREMENTS: Record<ContributionKind, string[]> = {
  correction: ["targetEntityId", "explanation"],
  landmark: ["name", "description"],
  artist: ["name", "placePath"],
  tradition: ["name", "description"],
  connection: ["fromPlaceKey", "toPlaceKey", "explanation"],
  source_suggestion: ["sourceUrl", "description"],
}

function stableContributionId(draft: ContributionDraft): string {
  return `${draft.submittedBy}|${draft.kind}|${JSON.stringify(draft.payload)}`
}

/** Validate one contribution into a review candidate. */
export function validateContribution(
  draft: ContributionDraft,
  nowIso: string,
): ContributionValidation {
  if (!(CONTRIBUTION_KINDS as readonly string[]).includes(draft.kind)) {
    return { ok: false, error: `unknown_kind_${String(draft.kind)}` }
  }
  if (!draft.submittedBy?.trim()) return { ok: false, error: "submitter_required" }
  for (const field of PAYLOAD_REQUIREMENTS[draft.kind]) {
    const value = draft.payload[field]
    if (typeof value !== "string" || !value.trim()) {
      return { ok: false, error: `missing_${field}` }
    }
  }
  // URLs are only acceptable inside source suggestions.
  if (draft.kind !== "source_suggestion") {
    for (const value of Object.values(draft.payload)) {
      if (typeof value === "string" && value.includes("://")) {
        return { ok: false, error: "urls_only_in_source_suggestions" }
      }
    }
  } else {
    try {
      const url = new URL(String(draft.payload.sourceUrl))
      if (!url.protocol.startsWith("http")) return { ok: false, error: "http_source_url_required" }
    } catch {
      return { ok: false, error: "invalid_source_url" }
    }
  }
  return {
    ok: true,
    candidate: {
      contributionId: Buffer.from(stableContributionId(draft)).toString("base64url").slice(0, 40),
      draft,
      reviewStatus: "candidate",
      submittedAt: nowIso,
    },
  }
}

// ─── Rate limiting (P21-T07) ──────────────────────────────────────────────

export const CONTRIBUTION_RATE_LIMITS = {
  maxPerWindow: 5,
  windowMs: 3600_000,
} as const

/**
 * Pure sliding-window check. `submittedAtTimes` are the submitter's prior
 * contribution timestamps (ms epoch); `nowMs` injected for determinism.
 */
export function withinRateLimit(
  submittedAtTimes: readonly number[],
  nowMs: number,
): boolean {
  const windowStart = nowMs - CONTRIBUTION_RATE_LIMITS.windowMs
  const inWindow = submittedAtTimes.filter((t) => t > windowStart && t <= nowMs)
  return inWindow.length < CONTRIBUTION_RATE_LIMITS.maxPerWindow
}
