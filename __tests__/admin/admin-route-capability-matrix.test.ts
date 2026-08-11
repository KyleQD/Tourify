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
      expect(["not_applicable", "required", "legacy_missing"]).toContain(
        command.idempotency,
      );
      expect(["not_applicable", "required", "legacy_missing"]).toContain(
        command.audit,
      );
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
