import { NextRequest, NextResponse } from "next/server";

import {
  buildSiteMapZoneInsert,
  siteMapZoneCreateSchema,
  siteMapZoneRouteParamsSchema,
} from "@/lib/admin/site-map-zones";
import { adminErrorResponse, withAdminCapability } from "@/lib/auth/api-auth";
import { getSiteMapAccess, requireSiteMapAccess } from "@/lib/site-map/access";
import {
  linkLegacyZone,
  resolveOrCreateEventZone,
} from "@/lib/zones/event-zones";

function invalidSiteMapId(correlationId: string, details: unknown) {
  return adminErrorResponse(
    400,
    "validation_failed",
    "A valid site-map id is required.",
    correlationId,
    details,
  );
}

function zoneWriteError(
  error: { code?: string; message?: string },
  correlationId: string,
) {
  if (error.code === "23505") {
    return adminErrorResponse(
      409,
      "zone_id_conflict",
      "The zone id is already in use.",
      correlationId,
    );
  }
  if (["22023", "23503", "23514"].includes(error.code ?? "")) {
    return adminErrorResponse(
      422,
      "business_rule_failed",
      "The zone conflicts with its site-map, event, or occupancy constraints.",
      correlationId,
    );
  }
  if (error.code === "42501") {
    return adminErrorResponse(
      403,
      "capability_denied",
      "Site-map zone access was denied.",
      correlationId,
    );
  }
  return adminErrorResponse(
    503,
    "dependency_unavailable",
    "Unable to save the site-map zone.",
    correlationId,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.view",
    async (_request, { supabase, user, admin }) => {
      const parsedParams = siteMapZoneRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success) {
        return invalidSiteMapId(
          admin.correlationId,
          parsedParams.error.flatten(),
        );
      }
      const siteMapId = parsedParams.data.id;

      try {
        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(access, "read");
        if (!accessCheck.ok) {
          return adminErrorResponse(
            accessCheck.status,
            accessCheck.status === 404
              ? "entity_not_found"
              : "capability_denied",
            accessCheck.error,
            admin.correlationId,
          );
        }

        const { data: zones, error } = await supabase
          .from("site_map_zones")
          .select("*")
          .eq("site_map_id", siteMapId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[Site-map zones] Fetch failed", {
            correlationId: admin.correlationId,
            code: error.code,
          });
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to fetch site-map zones.",
            admin.correlationId,
          );
        }

        return NextResponse.json({
          success: true,
          data: zones ?? [],
          count: zones?.length ?? 0,
        });
      } catch (error) {
        console.error("[Site-map zones] GET failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to fetch site-map zones.",
          admin.correlationId,
        );
      }
    },
  )(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.manage",
    async (req, { supabase, user, admin }) => {
      const parsedParams = siteMapZoneRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success) {
        return invalidSiteMapId(
          admin.correlationId,
          parsedParams.error.flatten(),
        );
      }
      const siteMapId = parsedParams.data.id;

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return adminErrorResponse(
          400,
          "validation_failed",
          "Request body must be valid JSON.",
          admin.correlationId,
        );
      }

      const parsedZone = siteMapZoneCreateSchema.safeParse(body);
      if (!parsedZone.success) {
        return adminErrorResponse(
          422,
          "validation_failed",
          "Site-map zone validation failed.",
          admin.correlationId,
          parsedZone.error.flatten(),
        );
      }

      try {
        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(access, "edit");
        if (!accessCheck.ok) {
          return adminErrorResponse(
            accessCheck.status,
            accessCheck.status === 404
              ? "entity_not_found"
              : "capability_denied",
            accessCheck.error,
            admin.correlationId,
          );
        }

        const row = buildSiteMapZoneInsert({
          siteMapId,
          input: parsedZone.data,
        });
        const { data: zone, error } = await supabase
          .from("site_map_zones")
          .insert(row)
          .select("*")
          .single();

        if (error) {
          console.error("[Site-map zones] Insert failed", {
            correlationId: admin.correlationId,
            code: error.code,
          });
          return zoneWriteError(error, admin.correlationId);
        }

        // Wire the event-zone bridge so the canonical event_zones table
        // stays in sync when a site-map zone is created.
        const eventId = access.siteMap?.event_v2_id;
        if (eventId && zone) {
          try {
            const eventZone = await resolveOrCreateEventZone(supabase, {
              eventId,
              name: row.name,
              capacity: row.capacity ?? undefined,
            });
            if (eventZone?.id) {
              await linkLegacyZone(
                supabase,
                "site_map_zones",
                zone.id,
                eventZone.id,
              );
            }
          } catch (bridgeErr) {
            console.warn(
              "[Site-map zones] Event-zone bridge failed (non-fatal)",
              {
                correlationId: admin.correlationId,
                error: bridgeErr,
              },
            );
          }
        }

        return NextResponse.json(
          {
            success: true,
            data: zone,
            message: "Zone created successfully.",
          },
          { status: 201 },
        );
      } catch (error) {
        console.error("[Site-map zones] POST failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to create the site-map zone.",
          admin.correlationId,
        );
      }
    },
  )(request);
}
