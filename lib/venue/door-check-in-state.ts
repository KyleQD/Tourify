/**
 * VEN-156 / VEN-157 — Offline door-scan queue.
 *
 * Contract:
 *  - Offline scans are PENDING-UNVERIFIED, never success.
 *  - Each scan carries a stable clientScanId (UUID) generated once at scan
 *    time; server reconciliation is idempotent per id.
 *  - The persisted queue holds ONLY safe operational fields (token, ids,
 *    status) — it must never become a durable PII cache.
 *  - Reconciliation maps each server outcome to a final state:
 *    accepted | duplicate | wrong_event | rejected. Network failures stay
 *    pending and retry later; server verdicts are final for that id.
 */

export type QueuedScanStatus =
  | "pending"
  | "syncing"
  | "accepted"
  | "duplicate"
  | "wrong_event"
  | "rejected"

export interface QueuedScan {
  clientScanId: string
  eventId: string
  checkpoint: string
  /** Raw scanned credential/token — no attendee data is stored. */
  token: string
  /** Submission shape so replay hits the same server path ('qr' | 'sale_id'). */
  mode?: 'qr' | 'sale_id'
  queuedAt: string
  status: QueuedScanStatus
  resultCode?: string
  message?: string
}

const STORAGE_KEY = "tourify.door.queue.v1"
const MAX_QUEUE = 500

type Storage = Pick<Storage, "getItem" | "setItem" | "removeItem">

function defaultStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null
    return window.localStorage
  } catch {
    return null
  }
}

function loadQueue(storage: Storage | null): QueuedScan[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isQueuedScan) : []
  } catch {
    return []
  }
}

function isQueuedScan(value: unknown): value is QueuedScan {
  if (!value || typeof value !== "object") return false
  const scan = value as Partial<QueuedScan>
  return (
    typeof scan.clientScanId === "string" &&
    typeof scan.eventId === "string" &&
    typeof checkStr(scan.checkpoint) === "string" &&
    typeof scan.token === "string" &&
    typeof scan.queuedAt === "string" &&
    typeof scan.status === "string" &&
    ["pending", "syncing", "accepted", "duplicate", "wrong_event", "rejected"].includes(scan.status)
  )
}

function checkStr(v: unknown): string {
  return typeof v === "string" ? v : ""
}

function saveQueue(storage: Storage | null, queue: QueuedScan[]): void {
  if (!storage) return
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)))
  } catch {
    // Storage full/unavailable — in-memory state still drives the UI.
  }
}

/** Stable per-scan operation identity (VEN-157). */
export function newClientScanId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

export function enqueueOfflineScan(input: {
  eventId: string
  checkpoint: string
  token: string
  clientScanId?: string
  mode?: 'qr' | 'sale_id'
  storage?: Storage | null
}): QueuedScan {
  const storage = input.storage === undefined ? defaultStorage() : input.storage
  const scan: QueuedScan = {
    clientScanId: input.clientScanId || newClientScanId(),
    eventId: input.eventId,
    checkpoint: input.checkpoint || 'main',
    token: input.token,
    ...(input.mode ? { mode: input.mode } : {}),
    queuedAt: new Date().toISOString(),
    status: "pending",
  }
  const queue = loadQueue(storage)
  // Never queue the same operation twice (e.g., double-tap offline).
  if (!queue.some((item) => item.clientScanId === scan.clientScanId)) {
    queue.push(scan)
    saveQueue(storage, queue)
  }
  return scan
}

export function listQueuedScans(storage?: Storage | null): QueuedScan[] {
  return loadQueue(storage === undefined ? defaultStorage() : storage)
}

export function pendingCount(storage?: Storage | null): number {
  return listQueuedScans(storage).filter((scan) => scan.status === "pending" || scan.status === "syncing").length
}

export function updateQueuedScan(
  clientScanId: string,
  patch: Partial<Pick<QueuedScan, "status" | "resultCode" | "message">>,
  storage?: Storage | null,
): void {
  const target = storage === undefined ? defaultStorage() : storage
  const queue = loadQueue(target)
  const index = queue.findIndex((scan) => scan.clientScanId === clientScanId)
  if (index === -1) return
  queue[index] = { ...queue[index], ...patch }
  saveQueue(target, queue)
}

export function clearResolvedScans(storage?: Storage | null): void {
  const target = storage === undefined ? defaultStorage() : storage
  saveQueue(target, listQueuedScans(target).filter((scan) => scan.status === "pending"))
}

export interface ScanTransportResult {
  ok: boolean
  httpStatus?: number
  code?: string
  message?: string
  checkinId?: string
}

function classify(result: ScanTransportResult): { status: QueuedScanStatus; message: string } {
  if (!result.ok && result.httpStatus === undefined) {
    // Network-level failure — remains retryable.
    return { status: "pending", message: result.message || "Network unavailable — still pending verification." }
  }
  switch (result.code) {
    case "ALREADY_CHECKED_IN":
      return { status: "duplicate", message: result.message || "Already checked in." }
    case "WRONG_EVENT":
      return { status: "wrong_event", message: result.message || "Ticket is for a different event." }
    case "REFUNDED":
    case "CANCELED":
    case "REVOKED":
    case "TRANSFERRED":
    case "NOT_PAID":
    case "NOT_FOUND":
      return { status: "rejected", message: result.message || `Rejected (${result.code}).` }
    default:
      if (result.ok) return { status: "accepted", message: result.message || "Admitted." }
      return { status: "rejected", message: result.message || "Rejected by server." }
  }
}

/**
 * Reconciles every pending scan through the provided transport exactly once
 * per clientScanId. Server verdicts are terminal; network failures remain
 * pending for the next pass.
 */
export async function reconcileQueue(
  send: (scan: QueuedScan) => Promise<ScanTransportResult>,
  storage?: Storage | null,
): Promise<{ reconciled: number; failed: number }> {
  const target = storage === undefined ? defaultStorage() : storage
  const queue = loadQueue(target)
  let reconciled = 0
  let failed = 0

  for (const scan of queue.filter((item) => item.status === "pending")) {
    updateQueuedScan(scan.clientScanId, { status: "syncing" }, target)
    let outcome: { status: QueuedScanStatus; message: string }
    try {
      outcome = classify(await send(scan))
    } catch (error) {
      outcome = { status: "pending", message: error instanceof Error ? error.message : "Sync failed." }
    }
    if (outcome.status === "pending") {
      failed += 1
      updateQueuedScan(scan.clientScanId, { status: "pending", message: outcome.message }, target)
    } else {
      reconciled += 1
      updateQueuedScan(scan.clientScanId, { status: outcome.status, message: outcome.message }, target)
    }
  }

  return { reconciled, failed }
}
