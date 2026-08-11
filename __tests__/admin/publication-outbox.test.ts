import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
  buildPublicationOutboxIdempotencyKey,
  classifyPublicationOutboxError,
  computePublicationOutboxBackoffSeconds,
  nextOutboxStatusAfterFailure,
  normalizePublicationCorrelationId,
  shouldDeadLetterOutbox,
} from "@/lib/admin/publication-outbox"

describe("PUB-101 publication outbox infrastructure", () => {
  it("computes exponential backoff capped at one hour", () => {
    expect(computePublicationOutboxBackoffSeconds(1)).toBe(5)
    expect(computePublicationOutboxBackoffSeconds(2)).toBe(10)
    expect(computePublicationOutboxBackoffSeconds(3)).toBe(20)
    expect(computePublicationOutboxBackoffSeconds(12)).toBe(3600)
  })

  it("dead-letters on max attempts or fatal errors", () => {
    expect(
      shouldDeadLetterOutbox({ attempts: 3, maxAttempts: 8, errorClass: "retryable" }),
    ).toBe(false)
    expect(
      shouldDeadLetterOutbox({ attempts: 8, maxAttempts: 8, errorClass: "retryable" }),
    ).toBe(true)
    expect(
      shouldDeadLetterOutbox({ attempts: 1, maxAttempts: 8, errorClass: "fatal" }),
    ).toBe(true)
    expect(
      nextOutboxStatusAfterFailure({ attempts: 2, maxAttempts: 8, errorClass: "retryable" }),
    ).toBe("failed")
    expect(
      nextOutboxStatusAfterFailure({ attempts: 1, maxAttempts: 8, errorClass: "fatal" }),
    ).toBe("dead")
    expect(
      nextOutboxStatusAfterFailure({ attempts: 1, maxAttempts: 8, errorClass: "suppressed" }),
    ).toBe("dead")
  })

  it("builds stable idempotency keys and preserves correlation ids", () => {
    const key = buildPublicationOutboxIdempotencyKey({
      orgId: "org-1",
      eventType: "publication.delivered",
      aggregateType: "publication",
      aggregateId: "pub-1",
      naturalKey: "v3:worker@example.com",
    })
    expect(key).toBe("org-1:publication.delivered:publication:pub-1:v3:worker@example.com")

    expect(normalizePublicationCorrelationId("  corr-abc  ")).toBe("corr-abc")
    expect(normalizePublicationCorrelationId("")).toMatch(/^pub-|^[0-9a-f-]{36}$/i)
  })

  it("classifies retryable vs fatal handler errors", () => {
    expect(classifyPublicationOutboxError(new Error("temporary timeout"))).toBe("retryable")
    expect(classifyPublicationOutboxError(Object.assign(new Error("gone"), { code: "fatal" }))).toBe(
      "fatal",
    )
    expect(classifyPublicationOutboxError(new Error("unauthorized recipient"))).toBe("fatal")
  })

  it("scopes worker mutations and safely resets replay budget in manual SQL", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/20260721221325_admin_publication_outbox_hardening_pub101.sql",
      ),
      "utf8",
    )
    const service = readFileSync(
      join(process.cwd(), "lib/admin/publication-outbox.service.ts"),
      "utf8",
    )

    expect(sql).toContain("admin_publication_outbox_mark_delivered_for_org")
    expect(sql).toContain("admin_publication_outbox_mark_failed_for_org")
    expect(sql).toContain("admin_publication_outbox_replay_for_org")
    expect(sql).toContain("and org_id = p_org_id")
    expect(sql).toContain("attempts = 0")
    expect(sql).toContain("interval '15 minutes'")
    expect(sql).toContain("pg_advisory_xact_lock")
    expect(sql).toContain("idempotency key already exists with a different command payload")
    expect(service).toContain('rpc("admin_publication_outbox_mark_delivered_for_org"')
    expect(service).toContain('rpc("admin_publication_outbox_mark_failed_for_org"')
    expect(service).toContain('rpc("admin_publication_outbox_replay_for_org"')
    expect(sql).not.toMatch(/\btruncate\b|\bdrop\s+table\b|\bdelete\s+from\b/i)
  })
})
