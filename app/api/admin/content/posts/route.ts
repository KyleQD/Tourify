import { NextRequest, NextResponse } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'
import { listOrgScopedPosts } from '@/lib/admin/content-hub/org-posts'

/** Hardened to org-scope — use /api/admin/content-hub/posts for the Content Hub. */
export const GET = withAdminCapability('content.view', async (request: NextRequest, { supabase, admin }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  const result = await listOrgScopedPosts({
    supabase,
    organizerAccountId: admin.profileId,
    status,
    limit,
  })

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    items: result.items,
    organizerAccountId: admin.profileId,
  })
})
