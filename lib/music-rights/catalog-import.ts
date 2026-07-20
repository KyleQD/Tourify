export type CatalogMatchStatus = "confirmed" | "probable" | "ambiguous" | "conflict" | "unmatched"

export interface CatalogMatchSignal {
  code: string
  weight: number
  matched: boolean
  detail?: string
}

export interface CatalogMatchCandidate {
  trackId: string
  title?: string | null
  isrc?: string | null
  durationSeconds?: number | null
  releaseDate?: string | null
  artistName?: string | null
}

export interface CatalogImportNormalized {
  title?: string | null
  artistName?: string | null
  isrc?: string | null
  upc?: string | null
  durationSeconds?: number | null
  releaseDate?: string | null
  externalUrl?: string | null
  provider?: string | null
}

export interface CatalogMatchResult {
  status: CatalogMatchStatus
  confidence: number
  signals: CatalogMatchSignal[]
  candidateTrackId?: string
  discrepancies: Array<{ code: string; message: string }>
}

function normalizeText(value?: string | null): string {
  return (value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function durationWithinTolerance(left?: number | null, right?: number | null, toleranceSeconds = 2): boolean {
  if (left == null || right == null) return false
  return Math.abs(left - right) <= toleranceSeconds
}

export function scoreCatalogMatch(params: {
  normalized: CatalogImportNormalized
  candidate: CatalogMatchCandidate
}): { confidence: number; signals: CatalogMatchSignal[] } {
  const signals: CatalogMatchSignal[] = []
  const candidateIsrc = (params.candidate.isrc || "").trim().toUpperCase()
  const importIsrc = (params.normalized.isrc || "").trim().toUpperCase()

  if (importIsrc && candidateIsrc) {
    const matched = importIsrc === candidateIsrc
    signals.push({
      code: "exact_isrc",
      weight: 0.55,
      matched,
      detail: matched ? "ISRC exact match" : "ISRC mismatch",
    })
  }

  const titleMatched = Boolean(
    normalizeText(params.normalized.title)
    && normalizeText(params.normalized.title) === normalizeText(params.candidate.title),
  )
  signals.push({
    code: "normalized_title",
    weight: 0.2,
    matched: titleMatched,
    detail: titleMatched ? "Normalized title match" : "Title differs",
  })

  const artistMatched = Boolean(
    normalizeText(params.normalized.artistName)
    && normalizeText(params.normalized.artistName) === normalizeText(params.candidate.artistName),
  )
  signals.push({
    code: "normalized_artist",
    weight: 0.1,
    matched: artistMatched,
    detail: artistMatched ? "Artist name match" : "Artist differs or missing",
  })

  const durationMatched = durationWithinTolerance(
    params.normalized.durationSeconds,
    params.candidate.durationSeconds,
  )
  signals.push({
    code: "duration_tolerance",
    weight: 0.1,
    matched: durationMatched,
    detail: durationMatched ? "Duration within 2s" : "Duration missing or outside tolerance",
  })

  const releaseMatched = Boolean(
    params.normalized.releaseDate
    && params.candidate.releaseDate
    && params.normalized.releaseDate.slice(0, 10) === params.candidate.releaseDate.slice(0, 10),
  )
  signals.push({
    code: "release_date",
    weight: 0.05,
    matched: releaseMatched,
    detail: releaseMatched ? "Release date match" : "Release date differs or missing",
  })

  const confidence = Math.min(
    1,
    signals.reduce((sum, signal) => sum + (signal.matched ? signal.weight : 0), 0),
  )
  return { confidence: Number(confidence.toFixed(4)), signals }
}

export function classifyCatalogMatch(params: {
  normalized: CatalogImportNormalized
  candidates: CatalogMatchCandidate[]
}): CatalogMatchResult {
  if (!params.candidates.length) {
    return {
      status: "unmatched",
      confidence: 0,
      signals: [{ code: "no_candidates", weight: 0, matched: false, detail: "No owned tracks matched search" }],
      discrepancies: [{ code: "unmatched", message: "No existing track candidates found for this import." }],
    }
  }

  const scored = params.candidates
    .map((candidate) => {
      const result = scoreCatalogMatch({ normalized: params.normalized, candidate })
      return { candidate, ...result }
    })
    .sort((left, right) => right.confidence - left.confidence)

  const best = scored[0]
  const second = scored[1]
  const isrcConflict = best.signals.some((signal) => signal.code === "exact_isrc" && !signal.matched)
    && Boolean(params.normalized.isrc)
    && Boolean(best.candidate.isrc)

  const discrepancies: Array<{ code: string; message: string }> = []
  for (const signal of best.signals.filter((item) => !item.matched && item.weight >= 0.1)) {
    discrepancies.push({ code: signal.code, message: signal.detail || signal.code })
  }

  if (isrcConflict && best.confidence >= 0.3) {
    return {
      status: "conflict",
      confidence: best.confidence,
      signals: best.signals,
      candidateTrackId: best.candidate.trackId,
      discrepancies: [
        { code: "isrc_audio_conflict", message: "ISRC differs while other metadata is similar; requires review." },
        ...discrepancies,
      ],
    }
  }

  if (second && Math.abs(best.confidence - second.confidence) < 0.08 && best.confidence >= 0.35) {
    return {
      status: "ambiguous",
      confidence: best.confidence,
      signals: best.signals,
      candidateTrackId: best.candidate.trackId,
      discrepancies: [
        { code: "multiple_candidates", message: "Multiple owned tracks have similar confidence." },
        ...discrepancies,
      ],
    }
  }

  if (best.confidence >= 0.75 && best.signals.some((signal) => signal.code === "exact_isrc" && signal.matched)) {
    return {
      status: "confirmed",
      confidence: best.confidence,
      signals: best.signals,
      candidateTrackId: best.candidate.trackId,
      discrepancies,
    }
  }

  if (best.confidence >= 0.45) {
    return {
      status: "probable",
      confidence: best.confidence,
      signals: best.signals,
      candidateTrackId: best.candidate.trackId,
      discrepancies,
    }
  }

  if (best.confidence >= 0.25) {
    return {
      status: "ambiguous",
      confidence: best.confidence,
      signals: best.signals,
      candidateTrackId: best.candidate.trackId,
      discrepancies,
    }
  }

  return {
    status: "unmatched",
    confidence: best.confidence,
    signals: best.signals,
    discrepancies: [{ code: "low_confidence", message: "Best candidate confidence is too low to link automatically." }],
  }
}

export function preserveOriginalReleaseDate(params: {
  existingReleaseDate?: string | null
  importedReleaseDate?: string | null
}): string | null {
  if (params.existingReleaseDate) return params.existingReleaseDate.slice(0, 10)
  if (params.importedReleaseDate) return params.importedReleaseDate.slice(0, 10)
  return null
}
