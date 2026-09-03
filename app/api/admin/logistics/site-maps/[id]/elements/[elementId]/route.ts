import { NextRequest, NextResponse } from "next/server";

import {
  buildSiteMapElementUpdate,
  siteMapElementRouteParamsSchema,
  siteMapElementUpdateSchema,
} from "@/lib/admin/site-map-elements";
import { adminErrorResponse, withAdminCapability } from "@/lib/auth/api-auth";
import { getSiteMapAccess, requireSiteMapAccess } from "@/lib/site-map/access";

type ElementRouteParams = Promise<{ id: string; elementId: string }>;

function invalidRouteIds(correlationId: string, details: unknown) {
  return adminErrorResponse(
    400,
    "validation_failed",
    "Valid site-map and element ids are required.",
    correlationId,
    details,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: ElementRouteParams },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.view",
    async (_request, { supabase, user, admin }) => {
      const parsedParams =
        siteMapElementRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success || !parsedParams.data.elementId) {
        return invalidRouteIds(
          admin.correlationId,
          parsedParams.success ? undefined : parsedParams.error.flatten(),
        );
      }
      const { id: siteMapId, elementId } = parsedParams.data;

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

        const { data: element, error } = await supabase
          .from("site_map_elements")
          .select("*")
          .eq("id", elementId)
          .eq("site_map_id", siteMapId)
          .maybeSingle();

        if (error) {
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to fetch the site-map element.",
            admin.correlationId,
          );
        }
        if (!element) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "Site-map element not found.",
            admin.correlationId,
          );
        }

        return NextResponse.json({ success: true, data: element });
      } catch (error) {
        console.error("[Site-map element] GET failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to fetch the site-map element.",
          admin.correlationId,
        );
      }
    },
  )(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: ElementRouteParams },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.manage",
    async (req, { supabase, user, admin }) => {
      const parsedParams =
        siteMapElementRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success || !parsedParams.data.elementId) {
        return invalidRouteIds(
          admin.correlationId,
          parsedParams.success ? undefined : parsedParams.error.flatten(),
        );
      }
      const { id: siteMapId, elementId } = parsedParams.data;

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
      const parsedBody = siteMapElementUpdateSchema.safeParse(body);
      if (!parsedBody.success) {
        return adminErrorResponse(
          422,
          "validation_failed",
          "Site-map element validation failed.",
          admin.correlationId,
          parsedBody.error.flatten(),
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

        const { data: current, error: currentError } = await supabase
          .from("site_map_elements")
          .select("id, properties")
          .eq("id", elementId)
          .eq("site_map_id", siteMapId)
          .maybeSingle();
        if (currentError) {
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to validate the site-map element.",
            admin.correlationId,
          );
        }
        if (!current) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "Site-map element not found.",
            admin.correlationId,
          );
        }

        const { data: element, error } = await supabase
          .from("site_map_elements")
          .update(
            buildSiteMapElementUpdate(parsedBody.data, current.properties),
          )
          .eq("id", elementId)
          .eq("site_map_id", siteMapId)
          .select()
          .maybeSingle();

        if (error) {
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to update the site-map element.",
            admin.correlationId,
          );
        }
        if (!element) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "Site-map element not found.",
            admin.correlationId,
          );
        }

        return NextResponse.json({ success: true, data: element });
      } catch (error) {
        console.error("[Site-map element] PUT failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to update the site-map element.",
          admin.correlationId,
        );
      }
    },
  )(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: ElementRouteParams },
) {
  const routeParams = await params;
  return withAdminCapability(
    "logistics.manage",
    async (_request, { supabase, user, admin }) => {
      const parsedParams =
        siteMapElementRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success || !parsedParams.data.elementId) {
        return invalidRouteIds(
          admin.correlationId,
          parsedParams.success ? undefined : parsedParams.error.flatten(),
        );
      }
      const { id: siteMapId, elementId } = parsedParams.data;

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

        const { data: deleted, error } = await supabase
          .from("site_map_elements")
          .delete()
          .eq("id", elementId)
          .eq("site_map_id", siteMapId)
          .select("id")
          .maybeSingle();

        if (error) {
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to delete the site-map element.",
            admin.correlationId,
          );
        }
        if (!deleted) {
          return adminErrorResponse(
            404,
            "entity_not_found",
            "Site-map element not found.",
            admin.correlationId,
          );
        }

        return NextResponse.json({
          success: true,
          message: "Element deleted successfully",
        });
      } catch (error) {
        console.error("[Site-map element] DELETE failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to delete the site-map element.",
          admin.correlationId,
        );
      }
    },
  )(request);
}
