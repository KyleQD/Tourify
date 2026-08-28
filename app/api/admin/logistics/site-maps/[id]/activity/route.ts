import { NextRequest, NextResponse } from "next/server";
import { withAdminCapability } from "@/lib/auth/api-auth";
import {
  buildSiteMapActivityInsert,
  siteMapActivityCommandSchema,
  siteMapActivityQuerySchema,
} from "@/lib/admin/site-map-activity";
import { getSiteMapAccess, requireSiteMapAccess } from "@/lib/site-map/access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteMapId } = await params;
  return withAdminCapability(
    "logistics.manage",
    async (req, { supabase, user, admin }) => {
      try {
        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(access, "read");
        if (!accessCheck.ok) {
          return NextResponse.json(
            { error: accessCheck.error },
            { status: accessCheck.status },
          );
        }

        const parsedQuery = siteMapActivityQuerySchema.safeParse(
          Object.fromEntries(new URL(req.url).searchParams.entries()),
        );
        if (!parsedQuery.success) {
          return NextResponse.json(
            {
              error: "Invalid pagination",
              details: parsedQuery.error.flatten(),
            },
            { status: 400 },
          );
        }
        const { limit, offset } = parsedQuery.data;

        const { data, error } = await supabase
          .from("site_map_activity_log")
          .select(
            `
          id, site_map_id, user_id, action, entity_type, entity_id,
          old_values, new_values, created_at,
          user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
        `,
          )
          .eq("site_map_id", siteMapId)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error("[Activity API] Error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || [] });
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to fetch activity" },
          { status: 500 },
        );
      }
    },
  )(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteMapId } = await params;
  return withAdminCapability(
    "logistics.view",
    async (req, { supabase, user, admin }) => {
      try {
        const parsedBody = siteMapActivityCommandSchema.safeParse(
          await req.json(),
        );
        if (!parsedBody.success) {
          return NextResponse.json(
            {
              error: "Invalid activity command",
              details: parsedBody.error.flatten(),
            },
            { status: 400 },
          );
        }
        const command = parsedBody.data;

        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(
          access,
          command.action === "VIEW" ? "read" : "edit",
        );
        if (!accessCheck.ok) {
          return NextResponse.json(
            { error: accessCheck.error },
            { status: accessCheck.status },
          );
        }

        if (command.action === "STATUS_CHANGE") {
          const { data: element, error: elementError } = await supabase
            .from("site_map_elements")
            .select("id")
            .eq("id", command.entityId)
            .eq("site_map_id", siteMapId)
            .maybeSingle();
          if (elementError) {
            return NextResponse.json(
              { error: elementError.message },
              { status: 500 },
            );
          }
          if (!element) {
            return NextResponse.json(
              { error: "Site-map element not found" },
              { status: 404 },
            );
          }
        }

        const { data, error } = await supabase
          .from("site_map_activity_log")
          .insert(
            buildSiteMapActivityInsert({
              siteMapId,
              userId: user.id,
              command,
            }),
          )
          .select(
            `
          id, site_map_id, user_id, action, entity_type, entity_id,
          new_values, created_at,
          user:profiles!site_map_activity_log_user_id_fkey(id, username, full_name, avatar_url)
        `,
          )
          .single();

        if (error) {
          console.error("[Activity API] Insert error:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to log activity" },
          { status: 500 },
        );
      }
    },
  )(request);
}
