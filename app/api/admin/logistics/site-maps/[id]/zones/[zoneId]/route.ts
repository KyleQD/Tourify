import { NextRequest, NextResponse } from "next/server";

import {
  buildSiteMapZoneUpdate,
  siteMapZoneRouteParamsSchema,
  siteMapZoneUpdateSchema,
} from "@/lib/admin/site-map-zones";
import { adminErrorResponse, withAdminCapability } from "@/lib/auth/api-auth";
import { getSiteMapAccess, requireSiteMapAccess } from "@/lib/site-map/access";

function invalidRouteIds(correlationId: string, details: unknown) {
  return adminErrorResponse(
    400,
    "validation_failed",
    "Valid site-map and zone ids are required.",
    correlationId,
    details,
  );
}

function accessError(
  result: { status: number; error: string },
  correlationId: string,
) {
  return adminErrorResponse(
    result.status,
    result.status === 404 ? "entity_not_found" : "capability_denied",
    result.error,
    correlationId,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.view",
    async (_request, { supabase, user, admin }) => {
      const parsedParams = siteMapZoneRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success || !parsedParams.data.zoneId) {
        return invalidRouteIds(
          admin.correlationId,
          parsedParams.success ? undefined : parsedParams.error.flatten(),
        );
      }
      const { id: siteMapId, zoneId } = parsedParams.data;

      try {
        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(access, "read");
        if (!accessCheck.ok) return accessError(accessCheck, admin.correlationId);

        const { data: zone, error } = await supabase
          .from("site_map_zones")
          .select("*")
          .eq("site_map_id", siteMapId)
          .eq("id", zoneId)
          .maybeSingle();

        if (error) {
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to fetch the site-map zone.",
            admin.correlationId,
          );
        }
        if (!zone) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "The site-map zone was not found.",
            admin.correlationId,
          );
        }

        return NextResponse.json({ success: true, data: zone });
      } catch (error) {
        console.error("[Site-map zone] GET failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to fetch the site-map zone.",
          admin.correlationId,
        );
      }
    },
  )(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.manage",
    async (req, { supabase, user, admin }) => {
      const parsedParams = siteMapZoneRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success || !parsedParams.data.zoneId) {
        return invalidRouteIds(
          admin.correlationId,
          parsedParams.success ? undefined : parsedParams.error.flatten(),
        );
      }
      const { id: siteMapId, zoneId } = parsedParams.data;

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
      const parsedZone = siteMapZoneUpdateSchema.safeParse(body);
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
        if (!accessCheck.ok) return accessError(accessCheck, admin.correlationId);

        const { data: zone, error } = await supabase
          .from("site_map_zones")
          .update(buildSiteMapZoneUpdate(parsedZone.data))
          .eq("site_map_id", siteMapId)
          .eq("id", zoneId)
          .select("*")
          .maybeSingle();

        if (error) {
          console.error("[Site-map zone] Update failed", {
            correlationId: admin.correlationId,
            code: error.code,
          });
          if (["22023", "23503", "23514"].includes(error.code ?? "")) {
            return adminErrorResponse(
              422,
              "business_rule_failed",
              "The zone conflicts with its site-map, event, or occupancy constraints.",
              admin.correlationId,
            );
          }
          if (error.code === "23505") {
            return adminErrorResponse(
              409,
              "zone_bridge_conflict",
              "The canonical zone identity conflicts with another record.",
              admin.correlationId,
            );
          }
          return adminErrorResponse(
            error.code === "42501" ? 403 : 503,
            error.code === "42501"
              ? "capability_denied"
              : "dependency_unavailable",
            "Unable to update the site-map zone.",
            admin.correlationId,
          );
        }
        if (!zone) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "The site-map zone was not found.",
            admin.correlationId,
          );
        }

        return NextResponse.json({
          success: true,
          data: zone,
          message: "Zone updated successfully.",
        });
      } catch (error) {
        console.error("[Site-map zone] PUT failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to update the site-map zone.",
          admin.correlationId,
        );
      }
    },
  )(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; zoneId: string }> },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.manage",
    async (_request, { supabase, user, admin }) => {
      const parsedParams = siteMapZoneRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success || !parsedParams.data.zoneId) {
        return invalidRouteIds(
          admin.correlationId,
          parsedParams.success ? undefined : parsedParams.error.flatten(),
        );
      }
      const { id: siteMapId, zoneId } = parsedParams.data;

      try {
        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(access, "edit");
        if (!accessCheck.ok) return accessError(accessCheck, admin.correlationId);

        const { data: deleted, error } = await supabase
          .from("site_map_zones")
          .delete()
          .eq("site_map_id", siteMapId)
          .eq("id", zoneId)
          .select("id")
          .maybeSingle();

        if (error) {
          if (error.code === "23503") {
            return adminErrorResponse(
              409,
              "zone_dependency_conflict",
              "Reassign or remove this zone's linked structures and tasks before deleting it.",
              admin.correlationId,
            );
          }
          return adminErrorResponse(
            error.code === "42501" ? 403 : 503,
            error.code === "42501"
              ? "capability_denied"
              : "dependency_unavailable",
            "Unable to delete the site-map zone.",
            admin.correlationId,
          );
        }
        if (!deleted) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "The site-map zone was not found.",
            admin.correlationId,
          );
        }

        return NextResponse.json({
          success: true,
          message: "Zone deleted successfully.",
        });
      } catch (error) {
        console.error("[Site-map zone] DELETE failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to delete the site-map zone.",
          admin.correlationId,
        );
      }
    },
  )(request);
}
