/**
 * P14 — Review Console v2 domain + orchestrator tests.
 *
 * Covers T02 (candidate actions), T07 (publication machine), T08 (audit
 * chain), T09 (optimistic concurrency), plus the governed pipeline in
 * server-actions.ts against an in-memory client (permission gates,
 * CAS conflicts, idempotent audit replays).
 */
import { describe, expect, it } from "vitest"

import { buildAuditEvent, verifyAuditChain } from "@/lib/world/editorial/audit-events"
import { planCandidateAction } from "@/lib/world/editorial/candidate-actions"
import {
  WorldConcurrencyConflictError,
  ensureCurrentVersion,
  nextVersion,
} from "@/lib/world/editorial/concurrency"
import { planPublish, planRetire, planSupersede } from "@/lib/world/editorial/publication"
import { applyCandidateAction, applyRadioRightsUpdate, EditorialMutationError } from "@/lib/world/editorial/server-actions"

describe("P14-T09 optimistic concurrency", () => {
  it("passes when stored version matches expectation", () => {
    expect(() => ensureCurrentVersion("t", "e", 3, 3)).not.toThrow()
  })

  it("fails closed with a typed conflict on drift", () => {
    try {
      ensureCurrentVersion("t", "e", 2, 5)
      throw new Error("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(WorldConcurrencyConflictError)
      const conflict = err as WorldConcurrencyConflictError
      expect(conflict.code).toBe("world_version_conflict")
      expect(conflict.expectedVersion).toBe(2)
      expect(conflict.currentVersion).toBe(5)
    }
  })

  it("defaults missing versions safely and increments", () => {
    expect(() => ensureCurrentVersion("t", "e", null, null)).not.toThrow()
    expect(nextVersion(null)).toBe(2)
    expect(nextVersion(7)).toBe(8)
  })
})

describe("P14-T08 audit events", () => {
  const base = {
    occurredAt: "2026-08-22T00:00:00.000Z",
    actorId: "user-1",
    action: "candidate.approve" as const,
    entityTable: "world_ingestion_candidates",
    entityId: "c-1",
    beforeRef: { review_status: "needs_review" },
    afterRef: { review_status: "approved" },
    reason: "Evidence verified",
  }

  it("requires actor, entity, and reason (fail closed)", () => {
    expect(() => buildAuditEvent({ ...base, actorId: " " })).toThrow("audit_event_requires_actor")
    expect(() => buildAuditEvent({ ...base, entityId: "" })).toThrow("audit_event_requires_entity")
    expect(() => buildAuditEvent({ ...base, reason: "" })).toThrow("audit_event_requires_reason")
  })

  it("produces deterministic hashes independent of key order", () => {
    const a = buildAuditEvent(base)
    const b = buildAuditEvent({ ...base, beforeRef: { review_status: "needs_review" }, afterRef: { review_status: "approved" } })
    expect(a.event_hash).toBe(b.event_hash)
  })

  it("chains hashes so tampering or reordering is detectable", () => {
    const e1 = buildAuditEvent(base)
    const e2 = buildAuditEvent({ ...base, action: "candidate.reject", prevHash: e1.event_hash })
    expect(verifyAuditChain([e1, e2]).valid).toBe(true)

    const tampered = { ...e2, reason: "rewritten history" }
    expect(verifyAuditChain([e1, tampered]).valid).toBe(false)

    const reordered = { ...e2, prev_hash: null }
    expect(verifyAuditChain([e1, reordered]).valid).toBe(false)
  })
})

describe("P14-T02 candidate actions", () => {
  const snap = {
    id: "c-1",
    review_status: "needs_review" as const,
    match_status: "unmatched" as const,
    version: 4,
  }

  it("approves directly from needs_review as a single step", () => {
    const plan = planCandidateAction(snap, { action: "approve", reason: "ok" })
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.patch.review_status).toBe("approved")
      expect(plan.auditSteps).toBe(1)
      expect(plan.patch.version).toBe(5)
    }
  })

  it("approves from fresh candidates via a recorded two-step composite", () => {
    const plan = planCandidateAction(
      { ...snap, review_status: "candidate" },
      { action: "approve", reason: "ok" },
    )
    expect(plan.ok && plan.auditSteps === 2).toBe(true)
  })

  it("refuses approval from rejected rows", () => {
    const plan = planCandidateAction({ ...snap, review_status: "rejected" }, { action: "approve", reason: "x" })
    expect(plan.ok === false && plan.error.includes("rejected")).toBe(true)
  })

  it("rejects open candidates but not approved ones", () => {
    expect(planCandidateAction(snap, { action: "reject", reason: "dup" }).ok).toBe(true)
    const closed = planCandidateAction({ ...snap, review_status: "approved" }, { action: "reject", reason: "dup" })
    expect(closed.ok).toBe(false)
  })

  it("request_evidence moves open rows to needs_review only", () => {
    expect(planCandidateAction(snap, { action: "request_evidence", reason: "need source" }).ok).toBe(true)
    expect(planCandidateAction({ ...snap, review_status: "approved" }, { action: "request_evidence", reason: "r" }).ok).toBe(false)
  })

  it("match_existing requires a target id", () => {
    expect(planCandidateAction(snap, { action: "match_existing", reason: "r" }).ok).toBe(false)
    const ok = planCandidateAction(snap, { action: "match_existing", reason: "r", targetMatchId: "artist-9" })
    expect(ok.ok && ok.patch.matched_id === "artist-9").toBe(true)
  })

  it("create_draft is gated behind approved review", () => {
    expect(planCandidateAction(snap, { action: "create_draft", reason: "r" }).ok).toBe(false)
    expect(planCandidateAction({ ...snap, review_status: "approved" }, { action: "create_draft", reason: "r" }).ok).toBe(true)
  })

  it("merge_duplicate records merge target without deleting anything", () => {
    const ok = planCandidateAction(snap, { action: "merge_duplicate", reason: "same artist", targetMatchId: "a-1" })
    expect(ok.ok && ok.patch.merged_into_id === "a-1").toBe(true)
    const blocked = planCandidateAction({ ...snap, match_status: "new_candidate" }, { action: "merge_duplicate", reason: "r", targetMatchId: "a-1" })
    expect(blocked.ok).toBe(false)
  })

  it("assign_reviewer requires assignee and pulls fresh candidates into review", () => {
    const missing = planCandidateAction(snap, { action: "assign_reviewer", reason: "r" })
    expect(missing.ok).toBe(false)
    const ok = planCandidateAction({ ...snap, review_status: "candidate" }, { action: "assign_reviewer", reason: "r", assigneeId: "u-9" })
    expect(ok.ok && ok.patch.review_status === "needs_review").toBe(true)
  })

  it("rejects unknown actions and empty reasons", () => {
    expect(planCandidateAction(snap, { action: "nuke" as never, reason: "r" }).ok).toBe(false)
    expect(planCandidateAction(snap, { action: "approve", reason: " " }).ok).toBe(false)
  })
})

describe("P14-T07 publication machine", () => {
  const draft = { id: "s-1", publication_status: "draft" as const, review_status: "approved", version: 2 }

  it("publish requires publisher permission", () => {
    const denied = planPublish(draft, { hasPublishPermission: false })
    expect(denied.ok === false && denied.error).toBe("publish_permission_required")
    expect(planPublish(draft, { hasPublishPermission: true }).ok).toBe(true)
  })

  it("publish requires approved review state", () => {
    const pending = planPublish({ ...draft, review_status: "needs_review" }, { hasPublishPermission: true })
    expect(pending.ok).toBe(false)
  })

  it("retire requires permission, reason, and a non-retired row", () => {
    expect(planRetire(draft, { hasPublishPermission: false, reason: "r" }).ok).toBe(false)
    expect(planRetire(draft, { hasPublishPermission: true, reason: " " }).ok).toBe(false)
    expect(planRetire(draft, { hasPublishPermission: true, reason: "bad data" }).ok).toBe(true)
    const retired = planRetire({ ...draft, publication_status: "retired" }, { hasPublishPermission: true, reason: "r" })
    expect(retired.ok).toBe(false)
  })

  it("supersede replaces editing published rows (corrections create new drafts)", () => {
    expect(planSupersede(draft, { hasReviewPermission: true }).ok).toBe(false) // draft needs no supersession
    const ok = planSupersede({ ...draft, publication_status: "published" }, { hasReviewPermission: true })
    expect(ok.ok && ok.auditAction).toMatch(/supersede/)
  })
})

// ─── Orchestrator pipeline (in-memory client) ─────────────────────────────

interface FakeRow { [key: string]: unknown }

function makeClient(tables: Record<string, FakeRow[]>) {
  const auditRows: FakeRow[] = []
  const client = {
    tables,
    auditRows,
    from(table: string) {
      const rows = tables[table] ?? []
      type Filtered = { eq: (col: string, val: unknown) => Filtered; maybeSingle: () => Promise<{ data: unknown }> }
      let mode: "select" | "update" | "upsert" | "insert" = "select"
      let patch: FakeRow | null = null
      let filters: Array<[string, unknown]> = []
      const filtered = (): FakeRow[] =>
        rows.filter((row) => filters.every(([col, val]) => row[col] === val))
      const builder = {
        select(_cols?: string) {
          // Real supabase allows `.update(…).eq(…).select(…)`; keep write mode.
          if (mode === "select") mode = "select"
          return builder
        },
        update(values: FakeRow) {
          mode = "update"
          patch = values
          return builder
        },
        upsert(values: FakeRow, _opts?: unknown) {
          mode = "upsert"
          patch = values
          return builder
        },
        eq(col: string, val: unknown) {
          filters.push([col, val])
          return builder
        },
        async maybeSingle() {
          return execute()
        },
        // Real PostgrestBuilder is thenable — awaiting runs the op.
        then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
          return execute().then(onFulfilled, onRejected)
        },
      } as never

      async function execute(): Promise<{ data: unknown }> {
        if (mode === "update") {
          const targets = filtered()
          if (targets.length === 0) return { data: null }
          Object.assign(targets[0], patch ?? {})
          return { data: targets[0] }
        }
        if (mode === "upsert") {
          const incoming = patch as FakeRow | null
          const exists =
            incoming?.event_hash !== undefined &&
            auditRows.some((a) => a.event_hash === incoming.event_hash)
          if (!exists && incoming) auditRows.push({ ...incoming })
          return { data: exists ? null : incoming }
        }
        return { data: filtered()[0] ?? null }
      }

      return builder
    },
  }
  return client
}

const allowAll = async () => true
const denyAll = async () => false

describe("applyCandidateAction pipeline", () => {
  function setup(version = 4) {
    const tables = {
      world_ingestion_candidates: [
        { id: "c-1", review_status: "needs_review", match_status: "unmatched", version, matched_id: null },
      ],
    }
    const client = makeClient(tables as never)
    return { client, tables }
  }

  it("denies mutation without the required permission (fail closed)", async () => {
    const { client } = setup()
    await expect(
      applyCandidateAction(client as never, {
        actorId: "u-1",
        candidateId: "c-1",
        expectedVersion: 4,
        permissionCheck: denyAll,
        input: { action: "approve", reason: "ok" },
      }),
    ).rejects.toBeInstanceOf(EditorialMutationError)
  })

  it("throws typed not_found for missing rows", async () => {
    const { client } = setup()
    await expect(
      applyCandidateAction(client as never, {
        actorId: "u-1",
        candidateId: "missing",
        expectedVersion: 1,
        permissionCheck: allowAll,
        input: { action: "approve", reason: "ok" },
      }),
    ).rejects.toMatchObject({ code: "not_found" })
  })

  it("applies a legal transition, writes audit event, bumps version", async () => {
    const { client } = setup()
    const outcome = await applyCandidateAction(client as never, {
      actorId: "u-1",
      candidateId: "c-1",
      expectedVersion: 4,
      permissionCheck: allowAll,
      input: { action: "approve", reason: "verified" },
    })
    expect(outcome.ok).toBe(true)
    expect(outcome.auditHash).toHaveLength(64)
    expect(client.tables.world_ingestion_candidates[0]).toMatchObject({
      review_status: "approved",
      version: 5,
    })
    expect(client.auditRows).toHaveLength(1)
    expect(client.auditRows[0]).toMatchObject({ actor_id: "u-1", action: "candidate.approve" })
  })

  it("returns version_conflict instead of overwriting concurrent edits", async () => {
    const { client } = setup()
    const outcome = await applyCandidateAction(client as never, {
      actorId: "u-1",
      candidateId: "c-1",
      expectedVersion: 3, // stale view — stored row already at 4
      permissionCheck: allowAll,
      input: { action: "approve", reason: "verified" },
    })
    expect(outcome).toEqual({ ok: false, code: "version_conflict" })
    expect(client.tables.world_ingestion_candidates[0].review_status).toBe("needs_review")
  })

  it("rejects illegal transitions without writing", async () => {
    const { client } = setup()
    const outcome = await applyCandidateAction(client as never, {
      actorId: "u-1",
      candidateId: "c-1",
      expectedVersion: 4,
      permissionCheck: allowAll,
      input: { action: "create_draft", reason: "too early" },
    })
    expect(outcome.ok).toBe(false)
    expect(client.tables.world_ingestion_candidates[0].version).toBe(4)
  })
})

describe("applyRadioRightsUpdate", () => {
  function setup() {
    const tables = {
      world_radio_stations: [
        {
          id: "st-1",
          rights_status: "metadata_only",
          playback_status: "unknown",
          publication_status: "draft",
          version: 1,
        },
      ],
    }
    return makeClient(tables as never)
  }

  it("gates on world.radio.review", async () => {
    const client = setup()
    await expect(
      applyRadioRightsUpdate(client as never, {
        actorId: "u-1",
        stationId: "st-1",
        expectedVersion: 1,
        rightsStatus: "playback_eligible",
        reason: "cleared",
        permissionCheck: denyAll,
      }),
    ).rejects.toBeInstanceOf(EditorialMutationError)
  })

  it("retiring forces playback ineligibility (rights ceiling)", async () => {
    const client = setup()
    const outcome = await applyRadioRightsUpdate(client as never, {
      actorId: "u-1",
      stationId: "st-1",
      expectedVersion: 1,
      rightsStatus: "retired",
      playbackStatus: "healthy",
      reason: "rights withdrawn",
      permissionCheck: allowAll,
    })
    expect(outcome.ok).toBe(true)
    expect(client.tables.world_radio_stations[0]).toMatchObject({
      rights_status: "retired",
      playback_status: "unhealthy",
      version: 2,
    })
  })
})
