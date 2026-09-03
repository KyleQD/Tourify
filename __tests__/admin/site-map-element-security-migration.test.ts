import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260903090000_site_map_element_security_and_atomic_sync.sql",
  ),
  "utf8",
).toLowerCase();

describe("site-map element security migration", () => {
  it("binds logistics capability checks to the authenticated actor", () => {
    expect(migration).toContain("uid = (select auth.uid())");
    expect(migration).toContain("from public.events_v2");
    expect(migration).toContain("count(distinct oid) = 1");
    expect(migration).not.toContain("from public.events e");
    expect(migration).toContain(
      "smc.expires_at is null or smc.expires_at > now()",
    );
  });

  it("uses explicit read and write policies through the canonical parent", () => {
    expect(migration).toContain(
      "create policy sec104_site_map_elements_select",
    );
    expect(migration).toContain(
      "create policy sec104_site_map_elements_insert",
    );
    expect(migration).toContain(
      "create policy sec104_site_map_elements_update",
    );
    expect(migration).toContain(
      "create policy sec104_site_map_elements_delete",
    );
    expect(migration).toContain("private.user_can_read_site_map(site_map_id)");
    expect(migration).toContain("private.user_can_edit_site_map(site_map_id)");
  });

  it("enforces database-side bounds for direct table and RPC bypass attempts", () => {
    expect(migration).toContain(
      "add constraint site_map_elements_sec104_geometry_check",
    );
    expect(migration).toContain(
      "add constraint site_map_elements_sec104_color_check",
    );
    expect(migration).toContain(
      "add constraint site_map_elements_sec104_payload_check",
    );
    expect(migration).toContain(") not valid");
    expect(migration).toContain(
      "element tenant, actor, and lifecycle fields are server controlled",
    );
  });

  it("makes full-canvas replacement one RLS-enforced transaction", () => {
    expect(migration).toContain(
      "create or replace function public.sync_site_map_elements",
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain("jsonb_array_length(p_elements)");
    expect(migration).toContain("element id belongs to another site map");
    expect(migration).toContain("on conflict (id) do update");
    expect(migration).toContain("if p_delete_missing then");
    expect(migration).toContain(
      "grant execute on function public.sync_site_map_elements",
    );
    expect(migration).not.toMatch(
      /sync_site_map_elements[\s\S]*security definer[\s\S]*revoke all on function public\.sync_site_map_elements/,
    );
  });

  it("keeps mutation audit rows actor-bound", () => {
    expect(migration).toContain(
      "create policy sec104_site_map_activity_insert",
    );
    expect(migration).toContain("user_id = (select auth.uid())");
  });
});
