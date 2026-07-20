export function computeOriginRetry(attempt: number, maxAttempts = 5, now = Date.now()) {
  const deadLetter = attempt >= maxAttempts
  const delaySeconds = Math.min(3600, 30 * 2 ** Math.max(0, attempt - 1))
  return { deadLetter, nextAttemptAt: new Date(now + delaySeconds * 1000).toISOString(), delaySeconds }
}

export function buildPrivateFingerprintMatchSignals(
  trackId: string,
  candidates: Array<{ id: string; track_id: string; match_type?: "sha256_match" | "chromaprint_match" }>,
) {
  const seen = new Set<string>()
  return candidates.flatMap((candidate) => {
    if (candidate.track_id === trackId || seen.has(candidate.id)) return []
    seen.add(candidate.id)
    return [{ type: candidate.match_type || "sha256_match", fingerprint_id: candidate.id, track_id: candidate.track_id }]
  })
}

export function staleLockCutoff(now = Date.now(), staleMinutes = 15) {
  return new Date(now - staleMinutes * 60_000).toISOString()
}
