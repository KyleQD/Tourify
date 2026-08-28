import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migratedRoutes = [
  "app/api/admin/logistics/site-map-templates/route.ts",
  "app/api/admin/logistics/site-maps/[id]/export/route.ts",
  "app/api/admin/logistics/site-maps/[id]/versions/route.ts",
  "app/api/admin/logistics/site-maps/[id]/activity/route.ts",
  "app/api/admin/logistics/site-maps/[id]/collaborators/route.ts",
] as const;

describe("SEC-104 site-map route capability migration", () => {
  it.each(migratedRoutes)("binds %s to logistics.view", (relativePath) => {
    const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");

    expect(source).toMatch(/withAdminCapability\(\s*["']logistics\.view["']/);
    expect(source).not.toContain("withAdminAuth(");
    expect(source).not.toContain("supabase.auth.getUser()");

    if (relativePath.includes("/[id]/")) {
      expect(source).toContain("requiredOrgId: admin.orgId");
    }
    if (relativePath.endsWith("/activity/route.ts")) {
      expect(source).toMatch(
        /withAdminCapability\(\s*["']logistics\.manage["']/,
      );
    }
  });
});
