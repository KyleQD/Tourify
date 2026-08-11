import { NextRequest, NextResponse } from 'next/server'
import { withAdminCapability } from '@/lib/auth/api-auth'

/**
 * Artist tracks are not org-owned inventory. Admin Content Hub moderation is
 * org-post scoped; this legacy endpoint returns an empty list to prevent
 * cross-account leakage from the old global moderation UI.
 */
export const GET = withAdminCapability('content.view', async (_request: NextRequest, { admin }) => {
  return NextResponse.json({
    items: [],
    organizerAccountId: admin.profileId,
    note: 'Artist tracks are omitted from organization Content Hub moderation.',
  })
})
