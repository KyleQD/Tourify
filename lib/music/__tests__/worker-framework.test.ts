import {
  MUSIC_WORKER_DEPLOYMENT_MODEL,
  MUSIC_WORKER_INVENTORY,
  MUSIC_WORKER_INVENTORY_COUNTS,
  MUSIC_WORKER_OPERATIONS_POLICY,
  MUSIC_WORKER_REGISTRATIONS,
  buildMusicWorkerHealthSnapshot,
  classifyMusicWorkerFailure,
  validateMusicWorkerRegistrations,
} from "../worker-framework"

describe("music worker deployment framework", () => {
  it("registers the current entrypoint inventory without enabling scheduling", () => {
    expect(MUSIC_WORKER_DEPLOYMENT_MODEL).toBe("hybrid")
    expect(MUSIC_WORKER_INVENTORY_COUNTS).toEqual({
      totalScripts: 24,
      frameworkRegistered: 21,
      outbox: 16,
      processing: 5,
      reconciliation: 1,
      smoke: 2,
    })
    expect(MUSIC_WORKER_REGISTRATIONS.length).toBe(MUSIC_WORKER_INVENTORY_COUNTS.frameworkRegistered)
    expect(validateMusicWorkerRegistrations()).toEqual([])
    expect(MUSIC_WORKER_REGISTRATIONS.every((worker) => worker.scheduled === false)).toBe(true)
    expect(MUSIC_WORKER_REGISTRATIONS.every((worker) => worker.executionMode === "durable_runtime")).toBe(true)
    expect(MUSIC_WORKER_REGISTRATIONS.filter((worker) => worker.category === "outbox")).toHaveLength(16)
    expect(MUSIC_WORKER_REGISTRATIONS.filter((worker) => worker.category === "processing")).toHaveLength(5)
    expect(Object.fromEntries(MUSIC_WORKER_REGISTRATIONS.map((worker) => [worker.id, worker.queue]))).toMatchObject({
      "creator-digital-commons": "creator_commons_outbox",
      "creator-federation": "creator_federation_outbox_events",
      institutional: "music_institutional_outbox_events",
      "royalties-import": "music_royalties_import_batches",
    })
    expect(MUSIC_WORKER_INVENTORY.filter((entry) => entry.frameworkRegistered)).toHaveLength(21)
    expect(MUSIC_WORKER_INVENTORY.find((entry) => entry.id === "trust-reconcile")).toMatchObject({
      category: "reconciliation",
      recommendedExecutionMode: "pg_cron_maintenance",
      frameworkRegistered: false,
    })
    expect(MUSIC_WORKER_INVENTORY.filter((entry) => entry.category === "smoke").every((entry) => entry.recommendedExecutionMode === null)).toBe(true)
  })

  it("preserves idempotency, retry, and DLQ requirements in every registration", () => {
    for (const worker of MUSIC_WORKER_REGISTRATIONS) {
      expect(worker.idempotency.required).toBe(true)
      expect(worker.deadLetter).toEqual(MUSIC_WORKER_OPERATIONS_POLICY.deadLetter)
      expect(worker.retry.maxAttempts).toBeGreaterThan(0)
      expect(worker.cadence).toEqual(MUSIC_WORKER_OPERATIONS_POLICY.cadence[worker.category])
    }
  })

  it("keeps cadence approval separate from the hybrid runtime choice", () => {
    expect(MUSIC_WORKER_OPERATIONS_POLICY.status).toBe("reconciled_pending_approval")
    expect(MUSIC_WORKER_OPERATIONS_POLICY.cadence.outbox).toEqual({
      mode: "manual_until_approved",
      intervalMs: null,
      staleWorkAfterMs: null,
    })
    expect(MUSIC_WORKER_OPERATIONS_POLICY.cadence.processing).toEqual(
      MUSIC_WORKER_OPERATIONS_POLICY.cadence.outbox,
    )
    expect(MUSIC_WORKER_REGISTRATIONS.every((worker) => worker.scheduled === false)).toBe(true)
  })

  it("moves terminal failures to the DLQ and schedules earlier failures for retry", () => {
    const policy = MUSIC_WORKER_REGISTRATIONS[0].retry
    expect(classifyMusicWorkerFailure(policy, 1)).toEqual({
      disposition: "retry",
      nextAttemptInMs: 60_000,
    })
    expect(classifyMusicWorkerFailure(policy, policy.maxAttempts)).toEqual({
      disposition: "dead_letter",
      nextAttemptInMs: null,
    })
  })

  it("reports missing heartbeat and stale work without querying or mutating production state", () => {
    const snapshot = buildMusicWorkerHealthSnapshot(MUSIC_WORKER_REGISTRATIONS[0], {
      workerId: MUSIC_WORKER_REGISTRATIONS[0].id,
      observedAt: "2026-09-10T21:00:00.000Z",
      lastHeartbeatAt: null,
      lastSuccessAt: null,
      staleWork: true,
    })

    expect(snapshot).toMatchObject({
      status: "degraded",
      scheduled: false,
      deploymentModel: "hybrid",
      reasons: ["heartbeat_missing", "stale_work_detected"],
    })
  })
})
