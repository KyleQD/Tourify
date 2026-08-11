import assert from "node:assert/strict"
import test from "node:test"

import { manifestRequired, scanFile, validateManifest } from "./check-migration-validation.mjs"

const fixture = "supabase/migrations/99999999999999_fixture.sql"

function validManifest(overrides = {}) {
  return {
    schemaVersion: 1,
    migration: "99999999999999_fixture.sql",
    taskId: "REL-102",
    status: "planned",
    owner: "admin-platform",
    reviewer: "security-data",
    domains: ["tenancy"],
    riskLevel: "high",
    representativeSnapshot: { kind: "isolated production-like snapshot", evidenceArtifact: null },
    preflight: { rowCountQueries: ["rows by org"], expectedAffectedRows: "zero", artifact: null },
    execution: {
      lockBudgetMs: 5000,
      statementTimeoutMs: 60000,
      batchSize: 0,
      resumeStrategy: "retry transaction",
      resumeCursor: "migration version",
      idempotency: "IF NOT EXISTS",
    },
    quarantine: { required: false, table: null, strategy: "no data movement" },
    constraintsAndIndexes: { constraints: [], indexes: [], validationPlan: "inspect catalogs" },
    recovery: { rollback: "disable rollout", forwardFix: "later additive migration" },
    postflight: {
      queries: ["RLS and row counts"],
      artifact: null,
      securityAdvisorArtifact: null,
      performanceAdvisorArtifact: null,
    },
    verificationOwner: "release-engineering",
    evidence: { isolated: null, staging: null, production: null },
    exceptions: [],
    ...overrides,
  }
}

test("accepts an expand-only public table with RLS", () => {
  const failures = scanFile(fixture, `
    create table public.safe_rows (id uuid primary key);
    alter table public.safe_rows enable row level security;
  `)
  assert.deepEqual(failures, [])
})

test("rejects destructive SQL and database resets", () => {
  for (const sql of [
    "drop table public.rows;",
    "alter table public.rows drop column secret;",
    "truncate public.rows;",
    "drop database tourify;",
    "delete from public.rows where id is not null;",
    "supabase db reset;",
  ]) {
    assert.ok(scanFile(fixture, sql).length > 0, sql)
  }
})

test("rejects unscoped data movement and blocking constraints", () => {
  assert.ok(scanFile(fixture, "update public.rows set org_id = gen_random_uuid();").length > 0)
  assert.ok(scanFile(fixture, "insert into public.rows (id) select id from public.old_rows;").length > 0)
  assert.ok(
    scanFile(
      fixture,
      "alter table public.rows add constraint rows_org_fk foreign key (org_id) references public.orgs(id);",
    ).length > 0,
  )
  assert.ok(scanFile(fixture, "alter table public.rows alter column org_id set not null;").length > 0)
})

test("requires policy replacement on each affected table", () => {
  const unsafe = scanFile(fixture, `
    drop policy if exists old_rows_select on public.rows;
    create policy other_select on public.other_rows for select using (true);
  `)
  assert.ok(unsafe.some((failure) => failure.includes("same table")))

  const safe = scanFile(fixture, `
    drop policy if exists old_rows_select on public.rows;
    create policy rows_select on public.rows for select using (auth.uid() is not null);
  `)
  assert.deepEqual(safe, [])
})

test("requires manifests prospectively and validates planned metadata", () => {
  assert.equal(manifestRequired(fixture), true)
  assert.equal(manifestRequired("supabase/migrations/20260721000000_legacy.sql"), false)
  assert.deepEqual(validateManifest(validManifest(), fixture), [])

  const invalid = validManifest({ owner: "", execution: { ...validManifest().execution, resumeCursor: "" } })
  const failures = validateManifest(invalid, fixture)
  assert.ok(failures.some((failure) => failure.includes("owner is required")))
  assert.ok(failures.some((failure) => failure.includes("resumeCursor is required")))
})

test("promotion stages require actual evidence artifacts", () => {
  const failures = validateManifest(validManifest(), fixture, { requiredStage: "isolated_validated" })
  assert.ok(failures.some((failure) => failure.includes("does not satisfy required stage")))

  const claimedWithoutEvidence = validManifest({ status: "isolated_validated" })
  assert.ok(validateManifest(claimedWithoutEvidence, fixture).some((failure) => failure.includes("evidenceArtifact")))

  const validated = validManifest({
    status: "isolated_validated",
    representativeSnapshot: { kind: "isolated production-like snapshot", evidenceArtifact: "artifact:snapshot-1" },
    preflight: { rowCountQueries: ["rows by org"], expectedAffectedRows: "zero", artifact: "artifact:preflight-1" },
    postflight: {
      queries: ["RLS and row counts"],
      artifact: "artifact:postflight-1",
      securityAdvisorArtifact: "artifact:security-1",
      performanceAdvisorArtifact: "artifact:performance-1",
    },
    evidence: { isolated: "artifact:run-1", staging: null, production: null },
  })
  assert.deepEqual(validateManifest(validated, fixture, { requiredStage: "isolated_validated" }), [])
})

test("free-form exception markers do not bypass the scanner", () => {
  const sql = `
    -- migration-validation: blocking-constraint-reviewed REL102-001
    alter table public.rows add constraint rows_org_fk foreign key (org_id) references public.orgs(id);
  `
  assert.ok(scanFile(fixture, sql, validManifest()).some((failure) => failure.includes("NOT VALID")))

  const approved = validManifest({
    exceptions: [{
      id: "REL102-001",
      type: "blocking-constraint-reviewed",
      owner: "database-owner",
      rationale: "Representative snapshot proves bounded lock",
      issue: "REL-102",
      expiresOn: "2099-01-01",
      evidence: "artifact:lock-test-1",
    }],
  })
  assert.deepEqual(validateManifest(approved, fixture), [])
  assert.deepEqual(scanFile(fixture, sql, approved), [])

  const expired = { ...approved, exceptions: [{ ...approved.exceptions[0], expiresOn: "2000-01-01" }] }
  assert.ok(validateManifest(expired, fixture).some((failure) => failure.includes("expired")))
})
