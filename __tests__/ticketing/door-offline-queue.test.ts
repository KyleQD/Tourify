/**
 * VEN-155/156/157/158 — door operations: PII projection, offline
 * pending-unverified queue, idempotent reconciliation, workforce revocation.
 */

import { describe, expect, it, vi } from 'vitest'
import {
  clearResolvedScans,
  enqueueOfflineScan,
  listQueuedScans,
  newClientScanId,
  pendingCount,
  reconcileQueue,
  type QueuedScan,
} from '@/lib/venue/door-check-in-state'

// ── In-memory storage stand-in (simulates localStorage across "reloads") ─────
function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    _map: map,
  }
}

const EVENT = '11111111-1111-1111-1111-111111111111'

function makeScan(overrides: Partial<QueuedScan> = {}): Parameters<typeof enqueueOfflineScan>[0] {
  return { eventId: EVENT, checkpoint: 'main', token: 'tok_abc', ...overrides }
}

describe('offline scan queue (VEN-156)', () => {
  it('queues offline scans as pending — never success', () => {
    const storage = memoryStorage()
    const scan = enqueueOfflineScan({ ...makeScan(), storage })
    expect(scan.status).toBe('pending')
    expect(listQueuedScans(storage)).toHaveLength(1)
  })

  it('survives reload via persistence and stores no attendee PII', () => {
    const storage = memoryStorage()
    enqueueOfflineScan(makeScan({ token: 'QR-payload', checkpoint: 'vip-door', storage }))
    // "Reload": fresh read from the same storage.
    const reloaded = listQueuedScans(storage)
    expect(reloaded).toHaveLength(1)
    expect(reloaded[0]).toMatchObject({ token: 'QR-payload', checkpoint: 'vip-door' })
    const serialized = JSON.stringify([...storage._map.values()])
    expect(serialized).not.toMatch(/buyer_|owner_|email|@/)
  })

  it('never queues the same client operation twice', () => {
    const storage = memoryStorage()
    const id = newClientScanId()
    enqueueOfflineScan({ ...makeScan(), clientScanId: id, storage })
    enqueueOfflineScan({ ...makeScan(), clientScanId: id, storage })
    expect(pendingCount(storage)).toBe(1)
  })
})

describe('idempotent reconciliation (VEN-157)', () => {
  it('maps server verdicts to terminal states exactly once', async () => {
    const storage = memoryStorage()
    enqueueOfflineScan(makeScan({ token: 'A', storage }))
    enqueueOfflineScan(makeScan({ token: 'B', storage }))
    enqueueOfflineScan(makeScan({ token: 'C', storage }))

    const send = vi.fn(async (scan: QueuedScan) => {
      if (scan.token === 'A') return { ok: true, checkinId: 'c-1' }
      if (scan.token === 'B') return { ok: false, httpStatus: 409, code: 'ALREADY_CHECKED_IN', message: 'Already checked in.' }
      return { ok: false, httpStatus: 400, code: 'WRONG_EVENT', message: 'Wrong event.' }
    })

    const first = await reconcileQueue(send as any, storage)
    expect(first).toEqual({ reconciled: 3, failed: 0 })
    expect(send).toHaveBeenCalledTimes(3)

    const statuses = Object.fromEntries(listQueuedScans(storage).map((s) => [s.token, s.status]))
    expect(statuses.A).toBe('accepted')
    expect(statuses.B).toBe('duplicate')
    expect(statuses.C).toBe('wrong_event')

    // Replays do not re-send resolved scans.
    const second = await reconcileQueue(send as any, storage)
    expect(second.reconciled).toBe(0)
    expect(send).toHaveBeenCalledTimes(3)
  })

  it('network failures remain pending and retry later', async () => {
    const storage = memoryStorage()
    enqueueOfflineScan(makeScan({ token: 'NET-1', storage }))

    let attempts = 0
    const send = vi.fn(async () => {
      attempts += 1
      if (attempts === 1) return { ok: false, message: 'fetch failed' } // no httpStatus → network failure
      return { ok: true }
    })

    await reconcileQueue(send as any, storage)
    expect(pendingCount(storage)).toBe(1)

    const second = await reconcileQueue(send as any, storage)
    expect(second.reconciled).toBe(1)
    expect(pendingCount(storage)).toBe(0)
  })

  it('clearResolvedScans keeps only unresolved operations', async () => {
    const storage = memoryStorage()
    enqueueOfflineScan(makeScan({ token: 'ok', storage }))
    enqueueOfflineScan(makeScan({ token: 'later', storage }))
    await reconcileQueue(
      (async (scan: QueuedScan) => (scan.token === 'ok' ? { ok: true } : { ok: false, message: 'down' })) as any,
      storage,
    )
    clearResolvedScans(storage)
    const remaining = listQueuedScans(storage)
    expect(remaining.map((s) => s.token)).toEqual(['later'])
  })
})
