import { describe, expect, it } from "vitest"
import { enqueueOfflineScan, listQueuedScans } from "@/lib/venue/door-check-in-state"

// VEN-156 — an offline door scan must never be reported as a final success.
// It becomes a pending-unverified queue entry that reconciles later.

describe("Venue door offline behavior", () => {
  it("queues offline scans as pending-unverified, never success", () => {
    const backing = new Map<string, string>()
    const storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => void backing.set(key, value),
      removeItem: (key: string) => void backing.delete(key),
    }
    const scan = enqueueOfflineScan({
      eventId: "event-1",
      checkpoint: "main",
      token: "QR-123",
      storage,
    })
    expect(scan.status).toBe("pending")
    expect(scan.status).not.toBe("accepted")

    const persisted = listQueuedScans(storage)
    expect(persisted).toHaveLength(1)
    expect(persisted[0].status).toBe("pending")
  })
})
