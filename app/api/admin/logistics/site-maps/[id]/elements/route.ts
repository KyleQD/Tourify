import { NextRequest, NextResponse } from "next/server";

import {
  buildSiteMapElementInsert,
  crossMapElementIds,
  siteMapElementBatchCommandSchema,
  siteMapElementCreateSchema,
  siteMapElementRouteParamsSchema,
} from "@/lib/admin/site-map-elements";
import { adminErrorResponse, withAdminCapability } from "@/lib/auth/api-auth";
import type { Json } from "@/lib/database.types";
import { getSiteMapAccess, requireSiteMapAccess } from "@/lib/site-map/access";

function invalidRouteId(correlationId: string, details: unknown) {
  return adminErrorResponse(
    400,
    "validation_failed",
    "A valid site-map id is required.",
    correlationId,
    details,
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
      const parsedParams =
        siteMapElementRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success) {
        return invalidRouteId(
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

        const { data: elements, error } = await supabase
          .from("site_map_elements")
          .select("*")
          .eq("site_map_id", siteMapId)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("[Site-map elements] Fetch failed", {
            correlationId: admin.correlationId,
            error,
          });
          return adminErrorResponse(
            503,
            "dependency_unavailable",
            "Unable to fetch site-map elements.",
            admin.correlationId,
          );
        }

        return NextResponse.json({ success: true, data: elements ?? [] });
      } catch (error) {
        console.error("[Site-map elements] GET failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to fetch site-map elements.",
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
      const parsedParams =
        siteMapElementRouteParamsSchema.safeParse(routeParams);
      if (!parsedParams.success) {
        return invalidRouteId(
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

        const isBatch =
          body !== null &&
          typeof body === "object" &&
          Array.isArray((body as { elements?: unknown }).elements);

        if (isBatch) {
          const parsedCommand =
            siteMapElementBatchCommandSchema.safeParse(body);
          if (!parsedCommand.success) {
            return adminErrorResponse(
              422,
              "validation_failed",
              "Site-map element sync validation failed.",
              admin.correlationId,
              parsedCommand.error.flatten(),
            );
          }

          const rows = parsedCommand.data.elements.map((input) =>
            buildSiteMapElementInsert({ siteMapId, input }),
          );
          const ids = rows.map((row) => row.id as string);

          if (ids.length > 0) {
            const { data: existing, error: existingError } = await supabase
              .from("site_map_elements")
              .select("id, site_map_id")
              .in("id", ids);
            if (existingError) {
              return adminErrorResponse(
                503,
                "dependency_unavailable",
                "Unable to validate site-map element ids.",
                admin.correlationId,
              );
            }
            if (crossMapElementIds(existing ?? [], siteMapId).length > 0) {
              return adminErrorResponse(
                409,
                "element_id_conflict",
                "One or more element ids already belong to another site map.",
                admin.correlationId,
              );
            }
          }

          const { data: savedElements, error: syncError } = await supabase.rpc(
            "sync_site_map_elements",
            {
              p_site_map_id: siteMapId,
              p_elements: rows as unknown as Json,
              p_delete_missing: parsedCommand.data.sync,
            },
          );

          if (syncError) {
            console.error("[Site-map elements] Atomic sync failed", {
              correlationId: admin.correlationId,
              code: syncError.code,
            });
            if (syncError.code === "23505") {
              return adminErrorResponse(
                409,
                "element_id_conflict",
                "An element id conflicts with another site map.",
                admin.correlationId,
              );
            }
            return adminErrorResponse(
              syncError.code === "42501" ? 403 : 503,
              syncError.code === "42501"
                ? "capability_denied"
                : "dependency_unavailable",
              "Unable to save site-map elements.",
              admin.correlationId,
            );
          }

          return NextResponse.json({
            success: true,
            data: savedElements ?? [],
          });
        }

        const parsedElement = siteMapElementCreateSchema.safeParse(body);
        if (!parsedElement.success) {
          return adminErrorResponse(
            422,
            "validation_failed",
            "Site-map element validation failed.",
            admin.correlationId,
            parsedElement.error.flatten(),
          );
        }

        if (parsedElement.data.id) {
          const { data: existing, error: existingError } = await supabase
            .from("site_map_elements")
            .select("id")
            .eq("id", parsedElement.data.id)
            .maybeSingle();
          if (existingError) {
            return adminErrorResponse(
              503,
              "dependency_unavailable",
              "Unable to validate the site-map element id.",
              admin.correlationId,
            );
          }
          if (existing) {
            return adminErrorResponse(
              409,
              "element_id_conflict",
              "The element id is already in use.",
              admin.correlationId,
            );
          }
        }

        const row = buildSiteMapElementInsert({
          siteMapId,
          input: parsedElement.data,
        });
        const { data: element, error } = await supabase
          .from("site_map_elements")
          .insert(row)
          .select()
          .single();

        if (error) {
          console.error("[Site-map elements] Insert failed", {
            correlationId: admin.correlationId,
            code: error.code,
          });
          return adminErrorResponse(
            error.code === "23505" ? 409 : 503,
            error.code === "23505"
              ? "element_id_conflict"
              : "dependency_unavailable",
            error.code === "23505"
              ? "The element id is already in use."
              : "Unable to create the site-map element.",
            admin.correlationId,
          );
        }

        return NextResponse.json(
          { success: true, data: element },
          { status: 201 },
        );
      } catch (error) {
        console.error("[Site-map elements] POST failed", {
          correlationId: admin.correlationId,
          error,
        });
        return adminErrorResponse(
          500,
          "internal_error",
          "Unable to save the site-map element.",
          admin.correlationId,
        );
      }
    },
  )(request);
}
