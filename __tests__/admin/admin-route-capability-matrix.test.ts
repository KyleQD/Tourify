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
        command.actingContext === "service_principal" ||
        command.actingContext === "platform_admin";
      const authenticatedUserOnly =
        command.actingContext === "authenticated_user";
      expect(
        nonUserPrincipal ||
          authenticatedUserOnly ||
          command.capabilities.length > 0,
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
        "authenticated_user",
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

    const accessRequest = matrix.find(
      (command) => command.route === "/api/admin/request",
    )!;
    expect(accessRequest.actingContext).toBe("authenticated_user");
    expect(accessRequest.tenantTarget).toBe("platform");
    expect(accessRequest.visibility).toBe("authenticated_user");
    expect(accessRequest.serviceRole).toBe("none");
    expect(accessRequest.capabilities).toEqual([]);

    const testRoute = matrix.find(
      (command) => command.route === "/api/admin/test",
    )!;
    expect(testRoute.disposition).toBe("retire");
  });

  it("keeps the reconciled RBAC, workforce, tasks, vendor, and bulk-assign registry entries capability-gated with code-exact capabilities", () => {
    const find = (route: string) =>
      ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)!;

    for (const route of [
      "/api/admin/rbac/roles",
      "/api/admin/rbac/roles/[id]",
      "/api/admin/rbac/assign-role",
      "/api/admin/rbac/entity/[entityType]/[entityId]/assignments",
      "/api/admin/rbac/entity/[entityType]/[entityId]/audit",
      "/api/admin/tasks",
      "/api/admin/workforce/people",
      "/api/admin/logistics/items/[id]/equipment",
      "/api/admin/vendor-requests",
      "/api/admin/vendor-requests/[id]",
      "/api/admin/logistics/site-maps/[id]/zones/bulk-assign",
    ]) {
      expect(find(route).authClass, route).toBe("capability_gated");
    }

    // RBAC family: org.roles.manage on reads and mutations alike (code truth).
    expect(adminCommandCapabilities(find("/api/admin/rbac/roles"), "GET")).toEqual([
      "org.roles.manage",
    ]);
    expect(adminCommandCapabilities(find("/api/admin/rbac/roles"), "POST")).toEqual([
      "org.roles.manage",
    ]);
    expect(
      adminCommandCapabilities(find("/api/admin/rbac/roles/[id]"), "DELETE"),
    ).toEqual(["org.roles.manage"]);
    expect(
      adminCommandCapabilities(find("/api/admin/rbac/assign-role"), "POST"),
    ).toEqual(["org.roles.manage"]);
    expect(
      adminCommandCapabilities(
        find("/api/admin/rbac/entity/[entityType]/[entityId]/assignments"),
        "GET",
      ),
    ).toEqual(["org.roles.manage"]);
    expect(
      adminCommandCapabilities(
        find("/api/admin/rbac/entity/[entityType]/[entityId]/audit"),
        "GET",
      ),
    ).toEqual(["org.roles.manage"]);

    // Tour team routes: workforce.view reads, workforce.manage writes (code truth).
    const teamMembers = find("/api/admin/tours/team-members");
    expect(adminCommandCapabilities(teamMembers, "GET")).toEqual(["workforce.view"]);
    for (const method of ["POST", "PATCH", "DELETE"] as const)
      expect(adminCommandCapabilities(teamMembers, method)).toEqual([
        "workforce.manage",
      ]);
    const teams = find("/api/admin/tours/teams");
    expect(adminCommandCapabilities(teams, "GET")).toEqual(["workforce.view"]);
    for (const method of ["POST", "PATCH", "DELETE"] as const)
      expect(adminCommandCapabilities(teams, method)).toEqual(["workforce.manage"]);

    // Tasks: logistics.view read, logistics.manage update.
    expect(adminCommandCapabilities(find("/api/admin/tasks"), "GET")).toEqual([
      "logistics.view",
    ]);
    expect(adminCommandCapabilities(find("/api/admin/tasks"), "PATCH")).toEqual([
      "logistics.manage",
    ]);

    // Workforce people graph: workforce.view read only.
    expect(
      adminCommandCapabilities(find("/api/admin/workforce/people"), "GET"),
    ).toEqual(["workforce.view"]);

    // Task-equipment attach/detach: logistics.manage.
    const equipment = find("/api/admin/logistics/items/[id]/equipment");
    for (const method of ["POST", "DELETE"] as const)
      expect(adminCommandCapabilities(equipment, method)).toEqual([
        "logistics.manage",
      ]);

    // Vendor requests: vendor.manage mutations.
    expect(
      adminCommandCapabilities(find("/api/admin/vendor-requests"), "POST"),
    ).toEqual(["vendor.manage"]);
    expect(
      adminCommandCapabilities(find("/api/admin/vendor-requests/[id]"), "PATCH"),
    ).toEqual(["vendor.manage"]);

    // Site-map bulk-assign: logistics.manage mutation.
    expect(
      adminCommandCapabilities(
        find("/api/admin/logistics/site-maps/[id]/zones/bulk-assign"),
        "POST",
      ),
    ).toEqual(["logistics.manage"]);
  });

  it("keeps the audit-export, staff, and calendar-token entries capability-gated with code-exact capabilities", () => {
    const find = (route: string) =>
      ADMIN_API_ROUTE_REGISTRY.find((entry) => entry.route === route)!;

    for (const route of [
      "/api/admin/audit",
      "/api/admin/analytics/export",
      "/api/admin/staff",
      "/api/admin/calendar/token",
    ]) {
      expect(find(route).authClass, route).toBe("capability_gated");
    }

    // Audit reader + analytics CSV export: audit.view read (code truth).
    const audit = find("/api/admin/audit");
    expect(adminCommandCapabilities(audit, "GET")).toEqual(["audit.view"]);
    const analyticsExport = find("/api/admin/analytics/export");
    expect(adminCommandCapabilities(analyticsExport, "GET")).toEqual([
      "audit.view",
    ]);

    // Staff route: workforce.view reads, workforce.manage writes (code truth).
    const staff = find("/api/admin/staff");
    expect(adminCommandCapabilities(staff, "GET")).toEqual(["workforce.view"]);
    for (const method of ["POST", "PATCH", "DELETE"] as const)
      expect(adminCommandCapabilities(staff, method)).toEqual([
        "workforce.manage",
      ]);

    // Calendar token: org.settings.manage on reads and rotations (code truth).
    const calendarToken = find("/api/admin/calendar/token");
    for (const method of ["GET", "POST"] as const)
      expect(adminCommandCapabilities(calendarToken, method)).toEqual([
        "org.settings.manage",
      ]);
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
      "/api/admin/logistics/site-maps/[id]/collaborators",
      "/api/admin/logistics/site-maps/[id]/tents",
      "/api/admin/logistics/site-maps/[id]/tents/[tentId]",
      "/api/admin/logistics/site-maps/[id]/zones",
      "/api/admin/logistics/site-maps/[id]/zones/[zoneId]",
      "/api/admin/logistics/site-maps/[id]/publish-work-mode",
      "/api/admin/logistics/site-maps/[id]/tasks",
      "/api/admin/logistics/site-maps/[id]/tasks/[taskId]",
      "/api/admin/logistics/site-maps/layers",
      "/api/admin/logistics/site-maps/layers/[id]",
      "/api/admin/logistics/site-maps/measurements",
      "/api/admin/logistics/site-maps/measurements/[id]",
      "/api/admin/logistics/site-maps/issues",
      "/api/admin/logistics/site-maps/issues/[id]",
      "/api/admin/logistics/items/[id]",
      "/api/admin/logistics/items/[id]/status",
      "/api/admin/logistics/items/bulk",
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

  it("matches staff-channel handlers' alternative management capabilities", () => {
    for (const route of [
      "/api/admin/staff-operations/channels",
      "/api/admin/staff-operations/channels/[id]",
    ]) {
      const contract = ADMIN_API_ROUTE_REGISTRY.find(
        (entry) => entry.route === route,
      )!;
      for (const method of contract.methods) {
        expect(adminCommandCapabilities(contract, method)).toEqual([
          "communications.broadcast",
          "workforce.manage",
        ]);
        expect(adminCommandCapabilityMode(contract, method)).toBe("anyOf");
      }
    }
  });
});
