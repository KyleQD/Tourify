import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  PublicationLifecycleError,
  supersedePublicationSnapshot,
} from "@/lib/admin/publication-lifecycle.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const bodySchema = z.object({
  successorSnapshotId: z.string().uuid(),
  reason: z.string().max(2000).optional().nullable(),
  correlationId: z.string().optional(),
})

function extractId(url: string): string | null {
  const segments = new URL(url).pathname.split("/").filter(Boolean)
  const index = segments.indexOf("snapshots")
  return index >= 0 ? segments[index + 1] || null : null
}

/** PUB-207 — Mark snapshot superseded by a newer committed version; notify recipients. */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    if (!admin.orgId) {
      return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
    }

    const snapshotId = extractId(request.url)
    if (!snapshotId) {
      return NextResponse.json({ success: false, error: "Missing snapshot id" }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    try {
      const result = await supersedePublicationSnapshot({
        supabase,
        orgId: admin.orgId,
        actorUserId: user.id,
        snapshotId,
        successorSnapshotId: parsed.data.successorSnapshotId,
        reason: parsed.data.reason,
        correlationId:
          request.headers.get("x-correlation-id") ||
          parsed.data.correlationId ||
          admin.correlationId,
      })
      return NextResponse.json({ success: true, ...result })
    } catch (error) {
      if (error instanceof PublicationLifecycleError) {
        return NextResponse.json(
          { success: false, error: error.message, code: error.code },
          { status: error.status },
        )
      }
      const message = error instanceof Error ? error.message : "Supersede failed"
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  },
)
