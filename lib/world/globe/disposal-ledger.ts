/**
 * P13-T10 — GPU resource disposal ledger.
 *
 * The globe creates geometries/materials/textures dynamically when viewport
 * payloads arrive. This ledger tracks acquisition and release so layer
 * switches and World exits are provably leak-free at the accounting level:
 * `outstanding === 0` after every teardown path. Browser-instrumented
 * profiling (GPU timings, heap snapshots) is covered by the P23
 * performance-budget phase; this module keeps the invariant testable now.
 */

export interface DisposalStats {
  acquired: number
  released: number
  outstanding: number
}

export class DisposalLedger {
  private acquired = 0
  private released = 0

  /** Register one or more newly-created GPU resources. */
  acquire(count = 1): void {
    if (!Number.isInteger(count) || count < 1) return
    this.acquired += count
  }

  /** Register resources as disposed. Never releases more than acquired. */
  release(count = 1): void {
    if (!Number.isInteger(count) || count < 1) return
    this.released = Math.min(this.released + count, this.acquired)
  }

  stats(): DisposalStats {
    return {
      acquired: this.acquired,
      released: this.released,
      outstanding: this.acquired - this.released,
    }
  }

  /** True when every acquired resource has been released. */
  get clean(): boolean {
    return this.acquired === this.released
  }

  reset(): void {
    this.acquired = 0
    this.released = 0
  }
}
