import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { listOrgScopedPosts } from "@/lib/admin/content-hub/org-posts"

export const GET = withAdminCapability("content.view", async (request: NextRequest, { supabase, admin }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const limit = parseInt(searchParams.get("limit") || "50", 10)

  const postsResult = await listOrgScopedPosts({
    supabase,
    organizerAccountId: admin.profileId,
    status,
    limit,
  })

  if (postsResult.error) {
    return NextResponse.json({ success: false, error: postsResult.error }, { status: 500 })
  }

  // Org Content Hub moderation is post-only; tracks belong to artist accounts and are omitted.
  return NextResponse.json({
    success: true,
    posts: postsResult.items,
    music: [],
    organizerAccountId: admin.profileId,
  })
})
