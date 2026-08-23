/**
 * P13-T10 — disposal ledger invariants: dynamic viewport resources must
 * always return to zero outstanding after teardown (layer switch / exit).
 */
import { describe, expect, it } from "vitest"

import { DisposalLedger } from "@/lib/world/globe/disposal-ledger"

describe("DisposalLedger", () => {
  it("tracks acquisition and release symmetrically", () => {
    const ledger = new DisposalLedger()
    ledger.acquire(12)
    expect(ledger.stats()).toEqual({ acquired: 12, released: 0, outstanding: 12 })
    ledger.release(12)
    expect(ledger.clean).toBe(true)
  })

  it("flags leaks when resources are never released", () => {
    const ledger = new DisposalLedger()
    ledger.acquire(5)
    ledger.release(3)
    expect(ledger.clean).toBe(false)
    expect(ledger.stats().outstanding).toBe(2)
  })

  it("never releases more than was acquired (defensive)", () => {
    const ledger = new DisposalLedger()
    ledger.release(4)
    expect(ledger.stats()).toEqual({ acquired: 0, released: 0, outstanding: 0 })
  })

  it("models a layer-switch cycle ending clean", () => {
    const ledger = new DisposalLedger()
    // Payload 1 arrives: glow material + label textures + hit geometries.
    ledger.acquire(9)
    // Payload 2 replaces payload 1.
    ledger.release(9)
    ledger.acquire(14)
    ledger.release(14)
    expect(ledger.clean).toBe(true)
    ledger.reset()
    expect(ledger.stats()).toEqual({ acquired: 0, released: 0, outstanding: 0 })
  })

  it("ignores nonsensical counts instead of corrupting the ledger", () => {
    const ledger = new DisposalLedger()
    ledger.acquire(-2)
    ledger.acquire(1.5)
    ledger.release(0)
    expect(ledger.stats()).toEqual({ acquired: 0, released: 0, outstanding: 0 })
  })
})
