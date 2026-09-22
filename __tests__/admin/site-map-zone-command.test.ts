import { describe, expect, it } from "vitest";

import {
  buildSiteMapZoneInsert,
  buildSiteMapZoneUpdate,
  siteMapZoneBulkAssignSchema,
  siteMapZoneCreateSchema,
  siteMapZoneRouteParamsSchema,
  siteMapZoneUpdateSchema,
} from "@/lib/admin/site-map-zones";

const mapId = "00000000-0000-4000-8000-00000000000a";
const zoneId = "00000000-0000-4000-8000-00000000000b";
const userId = "00000000-0000-4000-8000-00000000000c";

function validZone(overrides: Record<string, unknown> = {}) {
  return {
    id: zoneId,
    name: "  Main stage  ",
    zoneType: "stage",
    x: 10.4,
    y: 20.6,
    width: 100.4,
    height: 80.6,
    color: "#123abc",
    borderColor: "#abcdef",
    ...overrides,
  };
}

describe("site-map zone command boundary", () => {
  it("normalizes validated input without replacing intentional zeroes", () => {
    const input = siteMapZoneCreateSchema.parse(
      validZone({ opacity: 0, borderWidth: 0, rotation: 0 }),
    );

    expect(buildSiteMapZoneInsert({ siteMapId: mapId, input })).toMatchObject({
      id: zoneId,
      site_map_id: mapId,
      name: "Main stage",
      zone_type: "stage",
      x: 10,
      y: 21,
      width: 100,
      height: 81,
      opacity: 0,
      border_width: 0,
      rotation: 0,
    });
  });

  it.each([
    validZone({ siteMapId: mapId }),
    validZone({ site_map_id: mapId }),
    validZone({ organizationId: mapId }),
    validZone({ lead_user_id: userId }),
    validZone({ createdBy: userId }),
    validZone({ color: "red" }),
    validZone({ x: -1 }),
    validZone({ width: 0 }),
    validZone({ opacity: Number.POSITIVE_INFINITY }),
    validZone({ capacity: 2, currentOccupancy: 3 }),
    validZone({ zoneType: "backstage" }),
    validZone({ tags: Array.from({ length: 51 }, () => "tag") }),
  ])("rejects forged or database-invalid create input %#", (input) => {
    expect(siteMapZoneCreateSchema.safeParse(input).success).toBe(false);
  });

  it("supports bounded ownership fields and nullable capacity", () => {
    const input = siteMapZoneUpdateSchema.parse({
      capacity: null,
      leadUserId: userId,
      assignedDepartment: "  Production  ",
    });

    expect(buildSiteMapZoneUpdate(input)).toEqual({
      capacity: null,
      lead_user_id: userId,
      assigned_department: "Production",
    });
  });

  it("rejects empty, identity-changing, and inconsistent updates", () => {
    expect(siteMapZoneUpdateSchema.safeParse({}).success).toBe(false);
    expect(siteMapZoneUpdateSchema.safeParse({ id: zoneId }).success).toBe(false);
    expect(
      siteMapZoneUpdateSchema.safeParse({ siteMapId: mapId, x: 10 }).success,
    ).toBe(false);
    expect(
      siteMapZoneUpdateSchema.safeParse({ capacity: 1, currentOccupancy: 2 })
        .success,
    ).toBe(false);
  });

  it("validates both route ids", () => {
    expect(siteMapZoneRouteParamsSchema.safeParse({ id: mapId }).success).toBe(
      true,
    );
    expect(
      siteMapZoneRouteParamsSchema.safeParse({ id: mapId, zoneId }).success,
    ).toBe(true);
    expect(
      siteMapZoneRouteParamsSchema.safeParse({ id: "map", zoneId }).success,
    ).toBe(false);
  });

  it("bounds bulk assignment and rejects compatibility aliases", () => {
    expect(
      siteMapZoneBulkAssignSchema.safeParse({
        zoneId,
        leadUserId: userId,
        starterTasks: [{ title: "Set barricades" }],
      }).success,
    ).toBe(true);
    expect(
      siteMapZoneBulkAssignSchema.safeParse({ zone_id: zoneId }).success,
    ).toBe(false);
    expect(siteMapZoneBulkAssignSchema.safeParse({ zoneId }).success).toBe(false);
    expect(
      siteMapZoneBulkAssignSchema.safeParse({
        zoneId,
        starterTasks: Array.from({ length: 51 }, () => ({ title: "Task" })),
      }).success,
    ).toBe(false);
  });
});
