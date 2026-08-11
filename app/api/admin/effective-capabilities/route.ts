import { NextRequest, NextResponse } from "next/server"

import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { withAdminAuth } from "@/lib/auth/api-auth"

/**
 * SEC-205 — Client capability reflection for UI chrome.
 * Does not authorize mutations; server routes remain the boundary.
 */
export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin

  return NextResponse.json({
    success: true,
    orgId: admin.orgId,
    membershipRole: admin.membershipRole,
    capabilities: admin.capabilities,
    correlationId: admin.correlationId,
    /** Explicit reminder for clients — never treat this as authorization. */
    enforcement: "server_only",
  })
})
