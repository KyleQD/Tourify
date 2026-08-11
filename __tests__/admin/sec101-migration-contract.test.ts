import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260722002848_admin_signed_acting_context_sec101.sql",
);
const sql = readFileSync(migrationPath, "utf8").toLowerCase();

describe("SEC-101 signed acting-context migration contract", () => {
  it("is expand-only and leaves compatibility sessions untouched", () => {
    expect(sql).not.toMatch(/\b(delete from|truncate|drop table|drop column|drop database)\b/);
    expect(sql).not.toMatch(/update\s+(?:public\.)?user_sessions\b/);
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?user_sessions\b/);
    expect(sql).toContain("existing public.user_sessions compatibility rows and policies");
  });

  it("creates server records, immutable audit storage, RLS, and no direct authenticated table grants", () => {
    expect(sql).toContain("create table if not exists public.admin_acting_context_sessions");
    expect(sql).toContain("create table if not exists public.admin_acting_context_audit");
    expect(sql).toContain("alter table public.admin_acting_context_sessions enable row level security");
    expect(sql).toContain("alter table public.admin_acting_context_audit enable row level security");
    expect(sql).toContain("revoke all on table public.admin_acting_context_sessions from anon, authenticated");
    expect(sql).toContain("revoke all on table public.admin_acting_context_audit from anon, authenticated");
    expect(sql).not.toMatch(/grant\s+(?:select|insert|update|delete|all).*admin_acting_context_(?:sessions|audit).*authenticated/);
  });

  it("binds RPCs to auth uid/session and provides CAS, expiry, revocation, and version invalidation", () => {
    expect(sql).toContain("auth.jwt() ->> 'session_id'");
    expect(sql).toContain("p_expected_epoch");
    expect(sql).toContain("acting_context_stale");
    expect(sql).toContain("interval '8 hours'");
    expect(sql).toContain("membership_version");
    expect(sql).toContain("capability_version");
    expect(sql).toContain("admin_revoke_acting_context");
    expect(sql).toContain("where session.user_id = auth.uid()");
  });
});
