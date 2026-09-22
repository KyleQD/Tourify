/**
 * TOUR-206 — Pure helpers for resumable duplication jobs (no server-only imports).
 */

import {
  TOUR_DUPLICATE_DOMAINS,
  normalizeTourDuplicateSelection,
  type TourDuplicateDomain,
  type TourDuplicateDomainSelection,
} from "@/lib/admin/tour-duplicate-preview"

export type TourDuplicateJobStatus =
  | "queued"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "canceled"

export type TourDuplicateDomainRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"

export interface TourDuplicateDomainResult {
  status: TourDuplicateDomainRunStatus
  copied: number
  failed: number
  excluded: number
  error?: string | null
  sourceIds?: string[]
}

export type TourDuplicateDomainStatusMap = Partial<
  Record<TourDuplicateDomain, TourDuplicateDomainResult>
>

export type TourDuplicateIdMap = Partial<Record<TourDuplicateDomain, Record<string, string>>>

export const TOUR_DUPLICATE_DOMAIN_ORDER: readonly TourDuplicateDomain[] = [
  ...TOUR_DUPLICATE_DOMAINS,
]

export function initialDomainStatus(
  selection: TourDuplicateDomainSelection,
): TourDuplicateDomainStatusMap {
  const map: TourDuplicateDomainStatusMap = {}
  for (const domain of TOUR_DUPLICATE_DOMAIN_ORDER) {
    if (domain === "metadata" || selection[domain]) {
      map[domain] = { status: "pending", copied: 0, failed: 0, excluded: 0 }
    } else {
      map[domain] = {
        status: "skipped",
        copied: 0,
        failed: 0,
        excluded: 0,
        error: "Not selected in clone plan",
      }
    }
  }
  return map
}

export function nextPendingDomain(
  domainStatus: TourDuplicateDomainStatusMap,
): TourDuplicateDomain | null {
  for (const domain of TOUR_DUPLICATE_DOMAIN_ORDER) {
    const row = domainStatus[domain]
    if (!row || row.status === "pending") return domain
  }
  return null
}

export function summarizeDomainStatus(domainStatus: TourDuplicateDomainStatusMap): {
  allTerminal: boolean
  hasFailure: boolean
} {
  let allTerminal = true
  let hasFailure = false
  for (const domain of TOUR_DUPLICATE_DOMAIN_ORDER) {
    const row = domainStatus[domain]
    if (!row) {
      allTerminal = false
      continue
    }
    if (row.status === "pending" || row.status === "running") allTerminal = false
    if (row.status === "failed") hasFailure = true
  }
  return { allTerminal, hasFailure }
}

export function isProtectedEventForDuplicate(event: Record<string, unknown>): boolean {
  const status = String(event.status || "")
  const tickets = Number(event.tickets_sold || 0)
  return (
    tickets > 0
    || status === "published"
    || status === "confirmed"
    || status === "completed"
    || status === "settled"
  )
}

export function selectionFromUnknown(value: unknown): TourDuplicateDomainSelection {
  return normalizeTourDuplicateSelection(value as Partial<TourDuplicateDomainSelection>)
}
