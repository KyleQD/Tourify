import { describe, expect, it } from "vitest";

import { getSiteMapAccess } from "@/lib/site-map/access";

function siteMapClient(rows: {
  siteMap: Record<string, unknown>;
  event?: Record<string, unknown> | null;
  tour?: Record<string, unknown> | null;
}) {
  return {
    from(table: string) {
      const data =
        table === "site_maps"
          ? rows.siteMap
          : table === "events"
            ? (rows.event ?? null)
            : table === "tours"
              ? (rows.tour ?? null)
              : null;
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data, error: null }),
      };
      return query;
    },
  };
}

describe("site-map acting organization binding", () => {
  const userId = "00000000-0000-4000-8000-000000000001";
  const orgA = "00000000-0000-4000-8000-00000000000a";
  const orgB = "00000000-0000-4000-8000-00000000000b";

  it("allows an owner only when the linked parent matches the acting organization", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-a",
        created_by: userId,
        is_public: false,
        event_id: "event-a",
        tour_id: null,
      },
      event: { org_id: orgA },
    });

    await expect(
      getSiteMapAccess(client as never, "map-a", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({ role: "owner", canExport: true });
  });

  it("hides a linked map when its organization differs from the acting organization", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-b",
        created_by: userId,
        is_public: false,
        event_id: "event-b",
        tour_id: null,
      },
      event: { org_id: orgB },
    });

    await expect(
      getSiteMapAccess(client as never, "map-b", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({ role: "none", canRead: false });
  });

  it("fails closed for an unscoped map in an organization Admin request", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-unscoped",
        created_by: userId,
        is_public: false,
        event_id: null,
        tour_id: null,
      },
    });

    await expect(
      getSiteMapAccess(client as never, "map-unscoped", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({ role: "none", canRead: false });
  });

  it("fails closed when linked event and tour resolve to different organizations", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-conflict",
        created_by: userId,
        is_public: false,
        event_id: "event-a",
        tour_id: "tour-b",
      },
      event: { org_id: orgA },
      tour: { org_id: orgB },
    });

    await expect(
      getSiteMapAccess(client as never, "map-conflict", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({ role: "none", canRead: false });
  });
});
