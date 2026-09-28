import {
  CATEGORY_TO_UI,
  projectPermissionRow,
  projectRoleRow,
  sortPermissionsForUi,
  uiCategoryFor,
} from "@/lib/venue/rbac-projection"

/**
 * VEN-122/VEN-124 — canonical RBAC → Venue UI projection contract.
 */

describe("VEN-124 — permission catalog projection", () => {
  it("projects canonical rows into the VenuePermission shape with stable ids", () => {
    const dto = projectPermissionRow({
      id: "perm-uuid-1",
      name: "manage_bookings",
      display_name: "Manage bookings",
      category: "bookings",
      description: "Create, respond to, and transition venue booking requests",
    })
    expect(dto).toEqual({
      id: "perm-uuid-1",
      permission_name: "manage_bookings",
      permission_description: "Create, respond to, and transition venue booking requests",
      permission_category: "bookings",
      is_system_permission: true,
      created_at: null,
      updated_at: null,
    })
  })

  it("maps every canonical category to a defined UI category (never undefined)", () => {
    for (const canonical of Object.keys(CATEGORY_TO_UI)) {
      expect(uiCategoryFor(canonical)).toBeTruthy()
    }
    expect(uiCategoryFor(null)).toBe("admin")
    expect(uiCategoryFor("mystery")).toBe("admin")
    expect(uiCategoryFor("ticketing")).toBe("events")
    expect(uiCategoryFor("finance")).toBe("payroll")
  })

  it("sorts by UI category order then name", () => {
    const sorted = sortPermissionsForUi([
      { permission_name: "view_analytics", permission_category: "analytics" },
      { permission_name: "manage_team", permission_category: "staff" },
      { permission_name: "manage_bookings", permission_category: "bookings" },
      { permission_name: "a_door", permission_category: "events" },
      { permission_name: "z_ticketing", permission_category: "events" },
    ])
    expect(sorted.map((p) => p.permission_name)).toEqual([
      "manage_bookings",
      "a_door",
      "z_ticketing",
      "manage_team",
      "view_analytics",
    ])
  })
})

describe("VEN-123 — role projection from rbac_roles", () => {
  it("projects system roles as immutable venue roles with permissions attached", () => {
    const dto = projectRoleRow(
      {
        id: "role-1",
        name: "Venue Owner",
        display_name: "Venue Owner",
        description: "Full control",
        is_system: true,
        owner_entity_type: null,
        owner_entity_id: null,
      },
      ["manage_bookings", "manage_team"],
    )
    expect(dto).toMatchObject({
      id: "role-1",
      key: "Venue Owner",
      label: "Venue Owner",
      is_system_role: true,
      is_active: true,
      owner_entity_id: null,
      source: "rbac_roles",
      permissions: ["manage_bookings", "manage_team"],
    })
  })

  it("marks venue-owned custom roles via owner entity fields", () => {
    const dto = projectRoleRow({
      id: "role-2",
      name: "Venue:abc12345:head-door",
      display_name: "Head Door",
      is_system: false,
      owner_entity_type: "Venue",
      owner_entity_id: "vp-1",
    })
    expect(dto.is_system_role).toBe(false)
    expect(dto.owner_entity_type).toBe("Venue")
    expect(dto.owner_entity_id).toBe("vp-1")
  })
})
