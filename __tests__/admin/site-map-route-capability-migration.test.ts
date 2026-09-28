import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migratedRoutes = [
  "app/api/admin/logistics/site-map-templates/route.ts",
  "app/api/admin/logistics/site-maps/[id]/export/route.ts",
  "app/api/admin/logistics/site-maps/[id]/versions/route.ts",
  "app/api/admin/logistics/site-maps/[id]/activity/route.ts",
  "app/api/admin/logistics/site-maps/[id]/collaborators/route.ts",
  "app/api/admin/logistics/site-maps/[id]/elements/route.ts",
  "app/api/admin/logistics/site-maps/[id]/elements/[elementId]/route.ts",
] as const;

const migratedResourceRoutes = [
  "app/api/admin/logistics/site-maps/[id]/route.ts",
  "app/api/admin/logistics/site-maps/[id]/notes/route.ts",
  "app/api/admin/logistics/site-maps/[id]/public-link/route.ts",
  "app/api/admin/logistics/site-maps/[id]/save-template/route.ts",
  "app/api/admin/logistics/site-maps/[id]/share/route.ts",
  "app/api/admin/logistics/site-maps/[id]/tents/route.ts",
  "app/api/admin/logistics/site-maps/[id]/tents/[tentId]/route.ts",
  "app/api/admin/logistics/site-maps/[id]/zones/route.ts",
  "app/api/admin/logistics/site-maps/[id]/zones/[zoneId]/route.ts",
] as const;

const taskLayerMeasurementIssueRoutes = [
  "app/api/admin/logistics/site-maps/[id]/tasks/route.ts",
  "app/api/admin/logistics/site-maps/[id]/tasks/[taskId]/route.ts",
  "app/api/admin/logistics/site-maps/layers/route.ts",
  "app/api/admin/logistics/site-maps/layers/[id]/route.ts",
  "app/api/admin/logistics/site-maps/measurements/route.ts",
  "app/api/admin/logistics/site-maps/measurements/[id]/route.ts",
  "app/api/admin/logistics/site-maps/issues/route.ts",
  "app/api/admin/logistics/site-maps/issues/[id]/route.ts",
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
    if (relativePath.includes("/elements/")) {
      expect(source).toMatch(
        /withAdminCapability\(\s*["']logistics\.manage["']/,
      );
    }
  });

  it.each(migratedResourceRoutes)(
    "binds %s to the org-scoped logistics capability gate",
    (relativePath) => {
      const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");

      expect(source).not.toContain("withAdminAuth(");
      expect(source).not.toContain("supabase.auth.getUser()");
      expect(source).toContain("requiredOrgId: admin.orgId");
      expect(source).toContain("getSiteMapAccess");
      expect(source).toContain("requireSiteMapAccess");

      if (
        relativePath.includes("/notes/") ||
        relativePath.endsWith("/[id]/route.ts")
      ) {
        expect(source).toMatch(
          /withAdminCapability\(\s*["']logistics\.view["']/,
        );
      }
      expect(source).toMatch(
        /withAdminCapability\(\s*["']logistics\.manage["']/,
      );
    },
  );

  it("keeps the registry exactly in sync with the gated work-mode publication handler", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "app/api/admin/logistics/site-maps/[id]/publish-work-mode/route.ts",
      ),
      "utf8",
    );
    const registry = readFileSync(
      path.join(process.cwd(), "lib/admin/api-route-registry.ts"),
      "utf8",
    );

    expect(source).toMatch(
      /withAdminCapability\(\s*["']site_map\.edit["']/,
    );
    expect(source).not.toContain("withAdminAuth(");
    expect(source).not.toContain("supabase.auth.getUser()");
    expect(source).toContain("requiredOrgId: admin.orgId");

    const entry = registry.match(
      /route: "\/api\/admin\/logistics\/site-maps\/\[id\]\/publish-work-mode",\s*methods: \["POST"\],\s*authClass: "capability_gated",\s*capability: "site_map\.edit"/,
    );
    expect(entry).not.toBeNull();
  });

  it.each(taskLayerMeasurementIssueRoutes)(
    "binds %s to the org-scoped logistics capability gate",
    (relativePath) => {
      const source = readFileSync(path.join(process.cwd(), relativePath), "utf8");

      if (!relativePath.endsWith("tasks/[taskId]/route.ts")) {
        expect(source).toMatch(/withAdminCapability\(\s*["']logistics\.view["']/);
      }
      expect(source).toMatch(/withAdminCapability\(\s*["']logistics\.manage["']/);
      expect(source).not.toContain("withAdminAuth(");
      expect(source).not.toContain("supabase.auth.getUser()");
      expect(source).toContain("requiredOrgId: admin.orgId");
      expect(source).toContain("getSiteMapAccess");
      expect(source).toContain("requireSiteMapAccess");
    },
  );

  it("keeps the registry exactly in sync with the gated zone handlers", () => {
    const zonesCollection = readFileSync(
      path.join(
        process.cwd(),
        "app/api/admin/logistics/site-maps/[id]/zones/route.ts",
      ),
      "utf8",
    );
    const zonesItem = readFileSync(
      path.join(
        process.cwd(),
        "app/api/admin/logistics/site-maps/[id]/zones/[zoneId]/route.ts",
      ),
      "utf8",
    );
    const registry = readFileSync(
      path.join(process.cwd(), "lib/admin/api-route-registry.ts"),
      "utf8",
    );

    for (const source of [zonesCollection, zonesItem]) {
      expect(source).toMatch(/withAdminCapability\(\s*["']logistics\.view["']/);
      expect(source).toMatch(/withAdminCapability\(\s*["']logistics\.manage["']/);
      expect(source).not.toContain("withAdminAuth(");
      expect(source).not.toContain("supabase.auth.getUser()");
      expect(source).toContain("requiredOrgId: admin.orgId");
    }

    expect(
      registry.match(
        /route: "\/api\/admin\/logistics\/site-maps\/\[id\]\/zones",\s*methods: \["GET", "POST"\],\s*authClass: "capability_gated",\s*capability: "logistics\.view"/,
      ),
    ).not.toBeNull();
    expect(
      registry.match(
        /route: "\/api\/admin\/logistics\/site-maps\/\[id\]\/zones\/\[zoneId\]",\s*methods: \["DELETE", "GET", "PUT"\],\s*authClass: "capability_gated",\s*capability: "logistics\.view"/,
      ),
    ).not.toBeNull();
  });

  it("binds the bulk-assign handler to the org-scoped logistics.manage gate and syncs the registry", () => {
    const source = readFileSync(
      path.join(
        process.cwd(),
        "app/api/admin/logistics/site-maps/[id]/zones/bulk-assign/route.ts",
      ),
      "utf8",
    );
    const registry = readFileSync(
      path.join(process.cwd(), "lib/admin/api-route-registry.ts"),
      "utf8",
    );

    expect(source).toMatch(/withAdminCapability\(\s*["']logistics\.manage["']/);
    expect(source).not.toContain("withAdminAuth(");
    expect(source).not.toContain("supabase.auth.getUser()");
    expect(source).toContain("requiredOrgId: admin.orgId");
    expect(source).toContain("getSiteMapAccess");
    expect(source).toContain("requireSiteMapAccess");
    expect(source).toContain("requireSiteMapAccess(access, 'edit')");

    expect(
      registry.match(
        /route: "\/api\/admin\/logistics\/site-maps\/\[id\]\/zones\/bulk-assign",\s*methods: \["POST"\],\s*authClass: "capability_gated",\s*capability: "logistics\.view"/,
      ),
    ).not.toBeNull();
  });
});
