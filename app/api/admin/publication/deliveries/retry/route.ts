import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { retrySafePublicationDeliveries } from "@/lib/admin/publication-delivery-dashboard.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const bodySchema = z.object({
  deliveryIds: z.array(z.string().uuid()).max(200).optional(),
  snapshotId: z.string().uuid().optional(),
  correlationId: z.string().optional(),
})

/** PUB-205 — Retry only safe (retryable) failed deliveries. */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    if (!admin.orgId) {
      return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    if (!parsed.data.deliveryIds?.length && !parsed.data.snapshotId) {
      return NextResponse.json(
        { success: false, error: "deliveryIds or snapshotId is required" },
        { status: 400 },
      )
    }

    try {
      const result = await retrySafePublicationDeliveries({
        supabase,
        orgId: admin.orgId,
        actorUserId: user.id,
        deliveryIds: parsed.data.deliveryIds,
        snapshotId: parsed.data.snapshotId,
        correlationId:
          request.headers.get("x-correlation-id") ||
          parsed.data.correlationId ||
          admin.correlationId,
      })

      return NextResponse.json({
        success: true,
        ...result,
        correlationId: admin.correlationId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Retry failed"
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  },
)
