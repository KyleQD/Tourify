import { NextRequest, NextResponse } from "next/server";
import { withAdminCapability } from "@/lib/auth/api-auth";
import { removeSiteMapCollaboratorQuerySchema } from "@/lib/admin/site-map-collaborators";
import { getSiteMapAccess, requireSiteMapAccess } from "@/lib/site-map/access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteMapId } = await params;
  return withAdminCapability(
    "logistics.view",
    async (_request, { supabase, user, admin }) => {
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

        const { data, error } = await supabase
          .from("site_map_collaborators")
          .select(
            `
          *,
          user:profiles!site_map_collaborators_user_id_fkey(id, username, full_name, avatar_url, email)
        `,
          )
          .eq("site_map_id", siteMapId)
          .eq("is_active", true)
          .order("invited_at", { ascending: false });

        if (error) {
          return NextResponse.json(
            { error: "Failed to fetch collaborators", details: error.message },
            { status: 500 },
          );
        }

        return NextResponse.json({ success: true, data: data || [] });
      } catch (error) {
        console.error("[Collaborators API] GET Error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch collaborators" },
          { status: 500 },
        );
      }
    },
  )(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: siteMapId } = await params;
  return withAdminCapability(
    "logistics.manage",
    async (req, { supabase, user, admin }) => {
      try {
        const parsedQuery = removeSiteMapCollaboratorQuerySchema.safeParse(
          Object.fromEntries(new URL(req.url).searchParams.entries()),
        );
        if (!parsedQuery.success) {
          return NextResponse.json(
            {
              error: "A valid userId query parameter is required",
              details: parsedQuery.error.flatten(),
            },
            { status: 400 },
          );
        }

        const access = await getSiteMapAccess(supabase, siteMapId, user.id, {
          requiredOrgId: admin.orgId,
        });
        const accessCheck = requireSiteMapAccess(access, "manage");
        if (!accessCheck.ok) {
          return NextResponse.json(
            { error: accessCheck.error },
            { status: accessCheck.status },
          );
        }
        if (access.role !== "owner") {
          return NextResponse.json(
            { error: "Only the map owner can remove collaborators" },
            { status: 403 },
          );
        }

        const { error } = await supabase
          .from("site_map_collaborators")
          .update({ is_active: false })
          .eq("site_map_id", siteMapId)
          .eq("user_id", parsedQuery.data.userId);

        if (error) {
          return NextResponse.json(
            { error: "Failed to remove collaborator", details: error.message },
            { status: 500 },
          );
        }

        return NextResponse.json({ success: true });
      } catch (error) {
        console.error("[Collaborators API] DELETE Error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to remove collaborator" },
          { status: 500 },
        );
      }
    },
  )(request);
}
