import type { MatchStatus } from "./royalty-domain"

export interface MatchableTrack {
  id: string
  title: string
  isrc?: string | null
  metadata?: Record<string, unknown> | null
}

export interface MatchCandidate {
  artistMusicId: string
  confidence: number
  signals: Record<string, unknown>
  status: MatchStatus
}

export function rankRoyaltyMatches(params: {
  isrc?: string
  title?: string
  tracks: MatchableTrack[]
}): MatchCandidate[] {
  const candidates: MatchCandidate[] = []

  for (const track of params.tracks) {
    const signals: Record<string, unknown> = {}
    let confidence = 0

    if (params.isrc && track.isrc && params.isrc.toUpperCase() === String(track.isrc).toUpperCase()) {
      confidence = 1
      signals.isrcExact = true
    } else if (params.title && track.title) {
      const left = params.title.trim().toLowerCase()
      const right = track.title.trim().toLowerCase()
      if (left === right) {
        confidence = 0.55
        signals.titleExact = true
      } else if (left.includes(right) || right.includes(left)) {
        confidence = 0.35
        signals.titlePartial = true
      }
    }

    if (confidence > 0)
      candidates.push({
        artistMusicId: track.id,
        confidence,
        signals,
        status: confidence >= 0.95 ? "exact" : confidence >= 0.5 ? "candidate" : "ambiguous",
      })
  }

  return candidates.sort((a, b) => b.confidence - a.confidence)
}

/** Title+artist alone is never sufficient for auto-accept. */
export function canAutoAcceptMatch(candidate: MatchCandidate): boolean {
  return candidate.status === "exact" && candidate.signals.isrcExact === true
}
