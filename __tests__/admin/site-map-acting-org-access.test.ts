import { describe, expect, it } from "vitest";

import { getSiteMapAccess } from "@/lib/site-map/access";

function siteMapClient(rows: {
  siteMap: Record<string, unknown>;
  canonicalSiteMapError?: Record<string, unknown> | null;
  event?: Record<string, unknown> | null;
  tour?: Record<string, unknown> | null;
  collaborator?: Record<string, unknown> | null;
}) {
  return {
    rpc: async () => ({ data: false, error: null }),
    from(table: string) {
      const data =
        table === "site_maps"
          ? rows.siteMap
          : table === "events_v2"
            ? (rows.event ?? null)
            : table === "tours"
              ? (rows.tour ?? null)
              : table === "site_map_collaborators"
                ? (rows.collaborator ?? null)
                : null;
      let selected = "";
      const query = {
        select: (columns: string) => {
          selected = columns;
          return query;
        },
        eq: () => query,
        maybeSingle: async () => {
          if (
            table === "site_maps" &&
            selected.includes("event_v2_id") &&
            rows.canonicalSiteMapError
          ) {
            return { data: null, error: rows.canonicalSiteMapError };
          }
          return { data, error: null };
        },
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
        event_v2_id: "event-a",
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
        event_v2_id: "event-b",
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
        event_v2_id: null,
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
        event_v2_id: "event-a",
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

  it("rejects an expired collaborator even when the row remains active", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-expired",
        created_by: "00000000-0000-4000-8000-000000000099",
        is_public: false,
        event_v2_id: "event-a",
        tour_id: null,
      },
      event: { org_id: orgA },
      collaborator: {
        can_edit: true,
        can_invite_users: true,
        can_export: true,
        is_active: true,
        expires_at: "2020-01-01T00:00:00.000Z",
      },
    });

    await expect(
      getSiteMapAccess(client as never, "map-expired", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({ role: "none", canRead: false });
  });

  it("does not treat the legacy event_id column as canonical organization scope", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-legacy-only",
        created_by: userId,
        is_public: false,
        event_id: "event-a",
        event_v2_id: null,
        tour_id: null,
      },
      event: { org_id: orgA },
    });

    await expect(
      getSiteMapAccess(client as never, "map-legacy-only", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({ role: "none", canRead: false });
  });

  it("uses event_id only when the deployed schema reports event_v2_id missing", async () => {
    const client = siteMapClient({
      siteMap: {
        id: "map-compatible",
        created_by: userId,
        is_public: false,
        event_id: "event-a",
        tour_id: null,
      },
      canonicalSiteMapError: {
        code: "PGRST204",
        message: "Could not find the 'event_v2_id' column of 'site_maps' in the schema cache",
      },
      event: { org_id: orgA },
    });

    await expect(
      getSiteMapAccess(client as never, "map-compatible", userId, {
        requiredOrgId: orgA,
      }),
    ).resolves.toMatchObject({
      role: "owner",
      canRead: true,
      siteMap: { event_v2_id: "event-a" },
    });
  });
});
