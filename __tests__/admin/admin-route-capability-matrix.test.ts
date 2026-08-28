import { describe, expect, it } from "vitest";

import {
  ADMIN_API_ROUTE_REGISTRY,
  adminCommandCapabilities,
  adminCommandCapabilityMatrix,
  adminCommandCapabilityMode,
} from "@/lib/admin/api-route-registry";
import { isAdminCapability } from "@/lib/auth/admin-capabilities";

describe("SEC-003 Admin command capability matrix", () => {
  it("classifies every registered route method with capabilities or a non-user principal", () => {
    const matrix = adminCommandCapabilityMatrix();
    expect(matrix.length).toBeGreaterThan(ADMIN_API_ROUTE_REGISTRY.length);

    for (const command of matrix) {
      const nonUserPrincipal =
        command.actingContext === "public_share_token" ||
        command.actingContext === "service_principal";
      expect(
        nonUserPrincipal || command.capabilities.length > 0,
        `${command.method} ${command.route}`,
      ).toBe(true);
      for (const capability of command.capabilities)
        expect(isAdminCapability(capability)).toBe(true);
    }
  });

  it("materializes every REL-103 method contract field", () => {
    for (const command of adminCommandCapabilityMatrix()) {
      expect(command.actingContext).toBeTruthy();
      expect(command.requestSchema).toBe(
        `admin:${command.method.toLowerCase()}:${command.route}:request`,
      );
      expect(command.responseSchema).toBe(
        `admin:${command.method.toLowerCase()}:${command.route}:response`,
      );
      expect(command.owner.trim()).not.toBe("");
      expect(command.workflowIds.length).toBeGreaterThan(0);
      expect(command.testIds.length).toBeGreaterThan(0);
      expect([
        "acting_organization",
        "organization_entity",
        "platform",
        "public_share",
        "service_scope",
      ]).toContain(command.tenantTarget);
      expect(["none", "approved_job", "legacy_bare"]).toContain(
        command.serviceRole,
      );
      expect([
        "organization_admin",
        "platform_internal",
        "public_share",
        "service_internal",
      ]).toContain(command.visibility);
      expect([
        "active",
        "migrate",
        "redirect",
        "retire",
        "internal_only",
      ]).toContain(command.disposition);
      expect(["not_applicable", "required", "legacy_missing"]).toContain(
        command.idempotency,
      );
      expect(["not_applicable", "required", "legacy_missing"]).toContain(
        command.audit,
      );
      if (command.audit === "not_applicable")
        expect(command.auditEvent).toBeNull();
      else expect(command.auditEvent).toMatch(/^admin\./);
    }
  });

  it("records provider visibility and reviewed service-role use", () => {
    const matrix = adminCommandCapabilityMatrix();
    const provider = matrix.find(
      (command) => command.route === "/api/admin/event-providers",
    )!;
    expect(provider.visibility).toBe("platform_internal");
    expect(provider.disposition).toBe("internal_only");
    expect(provider.workflowIds).toEqual(["ADM-WF-003", "ADM-WF-020"]);

    const staffChannel = matrix.find(
      (command) =>
        command.route === "/api/admin/staff-operations/channels" &&
        command.method === "GET",
    )!;
    expect(staffChannel.serviceRole).toBe("approved_job");

    const testRoute = matrix.find(
      (command) => command.route === "/api/admin/test",
    )!;
    expect(testRoute.disposition).toBe("retire");
  });

  it("keeps the first logistics convergence wave capability-gated", () => {
    for (const route of [
      "/api/admin/logistics/backline",
      "/api/admin/logistics/catering",
      "/api/admin/logistics/comms-plans",
      "/api/admin/logistics/equipment/reservations",
      "/api/admin/logistics/site-maps",
      "/api/admin/logistics/site-map-templates",
      "/api/admin/logistics/site-maps/[id]/export",
      "/api/admin/logistics/site-maps/[id]/versions",
      "/api/admin/logistics/site-maps/[id]/activity",
    ]) {
      expect(
        ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)
          ?.authClass,
        route,
      ).toBe("capability_gated");
    }
  });

  it("raises generic writes above view-only capabilities", () => {
    const finance = ADMIN_API_ROUTE_REGISTRY.find(
      (entry) => entry.route === "/api/admin/finances",
    )!;
    expect(adminCommandCapabilities(finance, "GET")).toEqual(["finance.view"]);
    expect(adminCommandCapabilities(finance, "POST")).toEqual([
      "finance.manage",
    ]);

    const events = ADMIN_API_ROUTE_REGISTRY.find(
      (entry) => entry.route === "/api/admin/events/[id]",
    )!;
    expect(adminCommandCapabilities(events, "GET")).toEqual(["event.view"]);
    expect(adminCommandCapabilities(events, "PATCH")).toEqual(["event.manage"]);

    const siteMapActivity = ADMIN_API_ROUTE_REGISTRY.find(
      (entry) => entry.route === "/api/admin/logistics/site-maps/[id]/activity",
    )!;
    expect(adminCommandCapabilities(siteMapActivity, "GET")).toEqual([
      "logistics.view",
    ]);
    expect(adminCommandCapabilities(siteMapActivity, "POST")).toEqual([
      "logistics.manage",
    ]);
    const activityContracts = adminCommandCapabilityMatrix().filter(
      (entry) => entry.route === siteMapActivity.route,
    );
    expect(
      activityContracts.find((entry) => entry.method === "GET")?.audit,
    ).toBe("not_applicable");
    expect(
      activityContracts.find((entry) => entry.method === "POST")?.audit,
    ).toBe("required");
  });

  it("records stronger publish, settlement, refund, export, and delivery overlays", () => {
    const find = (route: string) =>
      ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)!;
    expect(
      adminCommandCapabilities(find("/api/admin/events/[id]/publish"), "POST"),
    ).toEqual(["event.publish"]);
    expect(
      adminCommandCapabilities(
        find("/api/admin/finances/settlements"),
        "PATCH",
      ),
    ).toEqual(["finance.approve", "finance.pay"]);
    expect(
      adminCommandCapabilityMode(
        find("/api/admin/finances/settlements"),
        "PATCH",
      ),
    ).toBe("actionScoped");
    expect(
      adminCommandCapabilities(find("/api/admin/ticketing/refund"), "POST"),
    ).toEqual(["ticketing.refund"]);
    expect(
      adminCommandCapabilities(
        find("/api/admin/publication/deliveries/retry"),
        "POST",
      ),
    ).toEqual(["tour.publish", "communications.send"]);
  });
});
