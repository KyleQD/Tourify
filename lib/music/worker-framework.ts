/**
 * Framework-only contracts for Music worker deployment.
 *
 * This module deliberately has no Supabase or scheduler side effects. It is
 * safe to import from deployment tooling, tests, and future worker runners
 * while schema reconciliation and worker-count approval are pending.
 */

export const MUSIC_WORKER_DEPLOYMENT_MODEL = "hybrid" as const

export type MusicWorkerCategory = "outbox" | "processing"

export type MusicWorkerInventoryCategory = MusicWorkerCategory | "reconciliation" | "smoke"

export type MusicWorkerExecutionMode =
  | "pg_cron_maintenance"
  | "durable_runtime"
  | "vercel_cron_trigger"

export type MusicWorkerFailureDisposition = "retry" | "dead_letter"

export type MusicWorkerRetryPolicy = {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

export type MusicWorkerCadencePolicy = {
  mode: "manual_until_approved"
  intervalMs: null
  staleWorkAfterMs: null
}

export type MusicWorkerDeadLetterPolicy = {
  enabled: true
  terminalStatus: "dead_letter"
  autoReplay: false
  operatorReviewRequired: true
}

export const MUSIC_WORKER_OPERATIONS_POLICY = {
  status: "reconciled_pending_approval" as const,
  retry: {
    maxAttempts: 5,
    initialDelayMs: 60_000,
    maxDelayMs: 3_600_000,
    backoffMultiplier: 2,
  } satisfies MusicWorkerRetryPolicy,
  deadLetter: {
    enabled: true,
    terminalStatus: "dead_letter" as const,
    autoReplay: false,
    operatorReviewRequired: true,
  } satisfies MusicWorkerDeadLetterPolicy,
  cadence: {
    outbox: {
      mode: "manual_until_approved" as const,
      intervalMs: null,
      staleWorkAfterMs: null,
    } satisfies MusicWorkerCadencePolicy,
    processing: {
      mode: "manual_until_approved" as const,
      intervalMs: null,
      staleWorkAfterMs: null,
    } satisfies MusicWorkerCadencePolicy,
    reconciliation: {
      mode: "manual_until_approved" as const,
      intervalMs: null,
      staleWorkAfterMs: null,
    } satisfies MusicWorkerCadencePolicy,
  },
} as const

export type MusicWorkerHealthPolicy = {
  heartbeatRequired: boolean
  staleWorkDetected: boolean
  lastSuccessAt: string | null
}

export type MusicWorkerRegistration = {
  id: string
  entrypoint: string
  queue: string
  category: MusicWorkerCategory
  executionMode: MusicWorkerExecutionMode
  idempotency: {
    required: true
    keySource: "event_or_job"
  }
  retry: MusicWorkerRetryPolicy
  deadLetter: MusicWorkerDeadLetterPolicy
  cadence: MusicWorkerCadencePolicy
  health: MusicWorkerHealthPolicy
  scheduled: false
}

export type MusicWorkerInventoryEntry = {
  id: string
  entrypoint: string
  category: MusicWorkerInventoryCategory
  queue: string | null
  recommendedExecutionMode: MusicWorkerExecutionMode | null
  frameworkRegistered: boolean
}

export type MusicWorkerRuntimeHealth = {
  workerId: string
  observedAt: string
  lastHeartbeatAt: string | null
  lastSuccessAt: string | null
  staleWork: boolean
}

export type MusicWorkerHealthStatus = "healthy" | "degraded" | "unknown"

export type MusicWorkerHealthSnapshot = {
  workerId: string
  status: MusicWorkerHealthStatus
  scheduled: false
  deploymentModel: typeof MUSIC_WORKER_DEPLOYMENT_MODEL
  observedAt: string
  reasons: string[]
}

/**
 * The current script inventory is intentionally a registration input, not an
 * approved production worker count. Reconciliation may add, remove, or split
 * registrations before scheduling is enabled.
 */
const REGISTERED_WORKER_DEFINITIONS: readonly [string, string, string, MusicWorkerCategory][] = [
  [
    "creator-cooperative",
    "scripts/music-creator-cooperative-outbox-worker.ts",
    "creator_cooperative_outbox",
    "outbox",
  ],
  [
    "creator-digital-commons",
    "scripts/music-creator-digital-commons-outbox-worker.ts",
    "creator_commons_outbox",
    "outbox",
  ],
  [
    "creator-federation",
    "scripts/music-creator-federation-outbox-worker.ts",
    "creator_federation_outbox_events",
    "outbox",
  ],
  [
    "creator-interoperability-convention",
    "scripts/music-creator-interoperability-convention-outbox-worker.ts",
    "creator_interop_outbox",
    "outbox",
  ],
  [
    "creator-interoperability-institution",
    "scripts/music-creator-interoperability-institution-outbox-worker.ts",
    "creator_interop_institution_outbox",
    "outbox",
  ],
  [
    "creator-interoperability-organization",
    "scripts/music-creator-interoperability-organization-outbox-worker.ts",
    "creator_interop_org_outbox",
    "outbox",
  ],
  [
    "creator-multilateral-treaty-operations",
    "scripts/music-creator-multilateral-treaty-operations-outbox-worker.ts",
    "creator_treaty_ops_outbox",
    "outbox",
  ],
  [
    "creator-protocol-constitution",
    "scripts/music-creator-protocol-constitution-outbox-worker.ts",
    "creator_protocol_constitution_outbox",
    "outbox",
  ],
  [
    "creator-public-infrastructure",
    "scripts/music-creator-public-infrastructure-outbox-worker.ts",
    "creator_public_outbox",
    "outbox",
  ],
  [
    "creator-treaty-system-legacy",
    "scripts/music-creator-treaty-system-legacy-outbox-worker.ts",
    "creator_treaty_legacy_outbox",
    "outbox",
  ],
  [
    "creator-treaty-system-renewal",
    "scripts/music-creator-treaty-system-renewal-outbox-worker.ts",
    "creator_treaty_system_renewal_outbox",
    "outbox",
  ],
  ["institutional", "scripts/music-institutional-outbox-worker.ts", "music_institutional_outbox_events", "outbox"],
  ["licensing", "scripts/music-licensing-outbox-worker.ts", "music_licensing_outbox", "outbox"],
  ["marketplace", "scripts/music-marketplace-outbox-worker.ts", "music_marketplace_outbox_events", "outbox"],
  ["origin", "scripts/music-origin-worker.ts", "music_file_fingerprints", "processing"],
  ["preview", "scripts/music-preview-worker.ts", "music_preview_generation_jobs", "processing"],
  ["rights-admin", "scripts/music-rights-admin-outbox-worker.ts", "music_rights_admin_outbox", "outbox"],
  ["rights-anchor", "scripts/music-rights-anchor-worker.ts", "music_rights_outbox_events", "processing"],
  ["rights-derivative", "scripts/music-rights-derivative-worker.ts", "music_rights_derivatives", "processing"],
  ["rights-intelligence", "scripts/music-rights-intelligence-outbox-worker.ts", "music_intelligence_outbox", "outbox"],
  ["royalties-import", "scripts/music-royalties-import-worker.ts", "music_royalties_import_batches", "processing"],
]

export const MUSIC_WORKER_INVENTORY: readonly MusicWorkerInventoryEntry[] = [
  ...REGISTERED_WORKER_DEFINITIONS.map(([id, entrypoint, queue, category]) => ({
    id,
    entrypoint,
    category,
    queue,
    recommendedExecutionMode: "durable_runtime" as const,
    frameworkRegistered: true,
  })),
  {
    id: "trust-reconcile",
    entrypoint: "scripts/music-trust-reconcile.ts",
    category: "reconciliation",
    queue: null,
    recommendedExecutionMode: "pg_cron_maintenance",
    frameworkRegistered: false,
  },
  {
    id: "staging-smoke",
    entrypoint: "scripts/music-staging-smoke.ts",
    category: "smoke",
    queue: null,
    recommendedExecutionMode: null,
    frameworkRegistered: false,
  },
  {
    id: "commerce-smoke",
    entrypoint: "scripts/music-commerce-smoke-test.ts",
    category: "smoke",
    queue: null,
    recommendedExecutionMode: null,
    frameworkRegistered: false,
  },
] as const

export const MUSIC_WORKER_INVENTORY_COUNTS = MUSIC_WORKER_INVENTORY.reduce(
  (counts, entry) => {
    counts.totalScripts += 1
    if (entry.frameworkRegistered) counts.frameworkRegistered += 1
    if (entry.category === "outbox") counts.outbox += 1
    if (entry.category === "processing") counts.processing += 1
    if (entry.category === "reconciliation") counts.reconciliation += 1
    if (entry.category === "smoke") counts.smoke += 1
    return counts
  },
  {
    totalScripts: 0,
    frameworkRegistered: 0,
    outbox: 0,
    processing: 0,
    reconciliation: 0,
    smoke: 0,
  },
)

export const MUSIC_WORKER_REGISTRATIONS: readonly MusicWorkerRegistration[] = REGISTERED_WORKER_DEFINITIONS.map(
  ([id, entrypoint, queue, category]) => ({
    id,
    entrypoint,
    queue,
    category,
    executionMode: "durable_runtime" as const,
    idempotency: { required: true as const, keySource: "event_or_job" as const },
    retry: { ...MUSIC_WORKER_OPERATIONS_POLICY.retry },
    deadLetter: { ...MUSIC_WORKER_OPERATIONS_POLICY.deadLetter },
    cadence: { ...MUSIC_WORKER_OPERATIONS_POLICY.cadence[category] },
    health: { heartbeatRequired: true, staleWorkDetected: true, lastSuccessAt: null },
    scheduled: false as const,
  }),
)

export function validateMusicWorkerRegistrations(
  registrations: readonly MusicWorkerRegistration[] = MUSIC_WORKER_REGISTRATIONS,
) {
  const ids = new Set<string>()
  const errors: string[] = []

  for (const registration of registrations) {
    if (ids.has(registration.id)) errors.push(`duplicate worker id: ${registration.id}`)
    ids.add(registration.id)
    if (!registration.entrypoint.startsWith("scripts/music-")) {
      errors.push(`invalid music worker entrypoint: ${registration.entrypoint}`)
    }
    if (!registration.queue) errors.push(`queue is required: ${registration.id}`)
    if (!registration.idempotency.required) errors.push(`idempotency is required: ${registration.id}`)
    if (
      !registration.deadLetter.enabled ||
      registration.deadLetter.terminalStatus !== "dead_letter" ||
      registration.deadLetter.autoReplay ||
      !registration.deadLetter.operatorReviewRequired
    ) {
      errors.push(`DLQ contract is required: ${registration.id}`)
    }
    if (registration.cadence.mode !== "manual_until_approved" || registration.cadence.intervalMs !== null) {
      errors.push(`scheduling approval is required: ${registration.id}`)
    }
    if (registration.retry.maxAttempts < 1 || registration.retry.initialDelayMs < 1) {
      errors.push(`invalid retry policy: ${registration.id}`)
    }
    if (registration.scheduled) errors.push(`production scheduling is disabled: ${registration.id}`)
  }

  return errors
}

export function retryDelayMs(policy: MusicWorkerRetryPolicy, attempt: number) {
  const normalizedAttempt = Math.max(attempt, 1)
  const delay = policy.initialDelayMs * policy.backoffMultiplier ** (normalizedAttempt - 1)
  return Math.min(Math.round(delay), policy.maxDelayMs)
}

export function classifyMusicWorkerFailure(
  policy: MusicWorkerRetryPolicy,
  attempt: number,
): { disposition: MusicWorkerFailureDisposition; nextAttemptInMs: number | null } {
  if (attempt >= policy.maxAttempts) return { disposition: "dead_letter", nextAttemptInMs: null }
  return { disposition: "retry", nextAttemptInMs: retryDelayMs(policy, attempt) }
}

export function buildMusicWorkerHealthSnapshot(
  registration: MusicWorkerRegistration,
  runtime: MusicWorkerRuntimeHealth,
): MusicWorkerHealthSnapshot {
  const reasons: string[] = []
  if (!runtime.lastHeartbeatAt) reasons.push("heartbeat_missing")
  if (runtime.staleWork) reasons.push("stale_work_detected")

  return {
    workerId: registration.id,
    status: reasons.includes("stale_work_detected")
      ? "degraded"
      : reasons.length > 0
        ? "unknown"
        : "healthy",
    scheduled: false,
    deploymentModel: MUSIC_WORKER_DEPLOYMENT_MODEL,
    observedAt: runtime.observedAt,
    reasons,
  }
}
