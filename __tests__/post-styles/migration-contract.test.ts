import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260728224543_harden_post_appearance_v2.sql",
  ),
  "utf8",
)

describe("post appearance V2 migration contract", () => {
  it("supports V1 and V2 snapshots without rewriting historical rows", () => {
    expect(sql).toContain("schema_version in (1, 2)")
    expect(sql).not.toContain("update public.post_appearances set snapshot")
  })

  it("enforces immutable visual snapshots and records revision one", () => {
    expect(sql).toContain("guard_post_appearance_snapshot_immutability")
    expect(sql).toContain("record_initial_post_appearance_revision")
    expect(sql).toContain("'published'")
  })

  it("covers follower visibility and atomic default selection", () => {
    expect(sql).toContain("p.visibility = 'followers'")
    expect(sql).toContain("set_post_style_profile_default")
    expect(sql).toContain("for update")
  })

  it("exposes only post-style feature flags for server bootstrap reads", () => {
    expect(sql).toContain("key like 'post_styles_%'")
  })
})
