import { describe, expect, it } from "vitest";

import {
  buildSiteMapActivityInsert,
  siteMapActivityCommandSchema,
  siteMapActivityQuerySchema,
} from "@/lib/admin/site-map-activity";

describe("site-map activity command boundary", () => {
  it("accepts the two server-supported command shapes", () => {
    expect(
      siteMapActivityCommandSchema.parse({
        action: "VIEW",
        entityType: "presence",
        newValues: { action: "joined" },
      }),
    ).toBeTruthy();
    expect(
      siteMapActivityCommandSchema.parse({
        action: "STATUS_CHANGE",
        entityType: "status_change",
        entityId: "element-1",
        newValues: { status: "verified", notes: "Checked on site" },
      }),
    ).toBeTruthy();
  });

  it.each([
    {
      action: "DELETE",
      entityType: "site_map",
      newValues: {},
    },
    {
      action: "STATUS_CHANGE",
      entityType: "status_change",
      entityId: "element-1",
      newValues: { status: "approved" },
    },
    {
      action: "VIEW",
      entityType: "presence",
      newValues: { action: "joined" },
      userId: "forged-actor",
    },
    {
      action: "STATUS_CHANGE",
      entityType: "status_change",
      entityId: "element-1",
      newValues: { status: "verified" },
      oldValues: { status: "blocked" },
    },
  ])("rejects forged or unsupported activity payload %#", (payload) => {
    expect(siteMapActivityCommandSchema.safeParse(payload).success).toBe(false);
  });

  it("stamps the authenticated actor and route-owned site map", () => {
    expect(
      buildSiteMapActivityInsert({
        siteMapId: "map-a",
        userId: "user-a",
        command: {
          action: "STATUS_CHANGE",
          entityType: "status_change",
          entityId: "element-1",
          newValues: { status: "in_progress" },
        },
      }),
    ).toEqual({
      site_map_id: "map-a",
      user_id: "user-a",
      action: "STATUS_CHANGE",
      entity_type: "status_change",
      entity_id: "element-1",
      old_values: null,
      new_values: { status: "in_progress" },
    });
  });

  it("bounds pagination", () => {
    expect(siteMapActivityQuerySchema.parse({})).toEqual({
      limit: 50,
      offset: 0,
    });
    expect(
      siteMapActivityQuerySchema.safeParse({ limit: 201, offset: -1 }).success,
    ).toBe(false);
  });
});
