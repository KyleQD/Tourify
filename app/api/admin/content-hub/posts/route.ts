import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { listOrgScopedPosts } from "@/lib/admin/content-hub/org-posts"

export const GET = withAdminCapability("content.view", async (request: NextRequest, { supabase, admin }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  const result = await listOrgScopedPosts({
    supabase,
    organizerAccountId: admin.profileId,
    status,
    limit,
  })

  if (result.error) {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    items: result.items,
    organizerAccountId: admin.profileId,
  })
})
