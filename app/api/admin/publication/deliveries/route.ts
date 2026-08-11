import { NextRequest, NextResponse } from "next/server"

import { listPublicationDeliveries } from "@/lib/admin/publication-delivery-dashboard.service"
import { buildPublicationDeliverySlo } from "@/lib/admin/publication-delivery-dashboard"
import {
  PUBLICATION_DELIVERY_CHANNELS,
  PUBLICATION_DELIVERY_STATUSES,
  type PublicationDeliveryChannel,
  type PublicationDeliveryStatus,
} from "@/lib/admin/publication-schema"
import { withAdminCapability } from "@/lib/auth/api-auth"

function parseStatus(
  value: string | null,
): PublicationDeliveryStatus | PublicationDeliveryStatus[] | "attention" | undefined {
  if (!value) return undefined
  if (value === "attention") return "attention"
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean)
  const valid = parts.filter((s) =>
    (PUBLICATION_DELIVERY_STATUSES as readonly string[]).includes(s),
  ) as PublicationDeliveryStatus[]
  if (valid.length === 0) return undefined
  return valid.length === 1 ? valid[0] : valid
}

function parseChannel(
  value: string | null,
): PublicationDeliveryChannel | PublicationDeliveryChannel[] | undefined {
  if (!value) return undefined
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean)
  const valid = parts.filter((s) =>
    (PUBLICATION_DELIVERY_CHANNELS as readonly string[]).includes(s),
  ) as PublicationDeliveryChannel[]
  if (valid.length === 0) return undefined
  return valid.length === 1 ? valid[0] : valid
}

/** PUB-205 — Delivery dashboard list + status/channel summary. */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, admin }) => {
  if (!admin.orgId) {
    return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
  }

  const url = new URL(request.url)
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "200") || 200, 500)

  try {
    const result = await listPublicationDeliveries({
      supabase,
      orgId: admin.orgId,
      limit,
      filters: {
        status: parseStatus(url.searchParams.get("status")),
        channel: parseChannel(url.searchParams.get("channel")),
        snapshotId: url.searchParams.get("snapshotId") || undefined,
        tourId: url.searchParams.get("tourId") || undefined,
        q: url.searchParams.get("q") || undefined,
      },
    })
    const sloSource = await listPublicationDeliveries({
      supabase,
      orgId: admin.orgId,
      limit: 500,
    })

    return NextResponse.json({
      success: true,
      orgId: admin.orgId,
      correlationId: admin.correlationId,
      ...result,
      slo: buildPublicationDeliverySlo({ rows: sloSource.rows, sampleLimit: 500 }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list deliveries"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})
