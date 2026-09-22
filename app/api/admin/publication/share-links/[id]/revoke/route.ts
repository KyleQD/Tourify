import { NextRequest, NextResponse } from "next/server"

import {
  PublicationShareLinkError,
  revokePublicationShareLink,
} from "@/lib/admin/publication-share-links.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractId(url: string): string | null {
  const segments = new URL(url).pathname.split("/").filter(Boolean)
  const index = segments.indexOf("share-links")
  return index >= 0 ? segments[index + 1] || null : null
}

/** PUB-206 — Revoke a share link immediately. */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    if (!admin.orgId) {
      return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
    }

    const shareTokenId = extractId(request.url)
    if (!shareTokenId) {
      return NextResponse.json({ success: false, error: "Missing share link id" }, { status: 400 })
    }

    try {
      const row = await revokePublicationShareLink({
        supabase,
        orgId: admin.orgId,
        actorUserId: user.id,
        shareTokenId,
        correlationId: admin.correlationId,
      })
      return NextResponse.json({ success: true, link: row, correlationId: admin.correlationId })
    } catch (error) {
      if (error instanceof PublicationShareLinkError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status },
        )
      }
      const message = error instanceof Error ? error.message : "Revoke failed"
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  },
)
