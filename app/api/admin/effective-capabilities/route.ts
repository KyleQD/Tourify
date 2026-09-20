import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"

/**
 * SEC-205 — Client capability reflection for UI chrome.
 * Does not authorize mutations; server routes remain the boundary.
 */
export const GET = withAdminCapability("tour.view", async (_request: NextRequest, { admin }) => {
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
