import { NextRequest, NextResponse } from "next/server"

import { exportPublicationDeliveryEvidence } from "@/lib/admin/publication-delivery-dashboard.service"
import {
  PUBLICATION_DELIVERY_CHANNELS,
  PUBLICATION_DELIVERY_STATUSES,
  type PublicationDeliveryChannel,
  type PublicationDeliveryStatus,
} from "@/lib/admin/publication-schema"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { logAuditEvent } from "@/lib/audit"

/** PUB-205 — Export authorized delivery evidence (masked subject keys). */
export const GET = withAdminCapability(
  "tour.view",
  async (request: NextRequest, { supabase, user, admin }) => {
    if (!admin.orgId) {
      return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
    }

    const url = new URL(request.url)
    const format = url.searchParams.get("format") === "csv" ? "csv" : "json"
    const statusParam = url.searchParams.get("status")
    const channelParam = url.searchParams.get("channel")

    const status =
      statusParam === "attention"
        ? ("attention" as const)
        : statusParam &&
            (PUBLICATION_DELIVERY_STATUSES as readonly string[]).includes(statusParam)
          ? (statusParam as PublicationDeliveryStatus)
          : undefined
    const channel =
      channelParam && (PUBLICATION_DELIVERY_CHANNELS as readonly string[]).includes(channelParam)
        ? (channelParam as PublicationDeliveryChannel)
        : undefined

    try {
      const result = await exportPublicationDeliveryEvidence({
        supabase,
        orgId: admin.orgId,
        format,
        limit: Math.min(Number(url.searchParams.get("limit") ?? "500") || 500, 500),
        filters: {
          status,
          channel,
          snapshotId: url.searchParams.get("snapshotId") || undefined,
          tourId: url.searchParams.get("tourId") || undefined,
          q: url.searchParams.get("q") || undefined,
        },
      })

      await logAuditEvent({
        actorId: user.id,
        orgId: admin.orgId,
        action: "export" as "create",
        entityType: "content" as "content",
        entityId: url.searchParams.get("snapshotId") || "org",
        correlationId: admin.correlationId,
        newValues: {
          format,
          rowCount: result.rows.length,
          filters: {
            status,
            channel,
            snapshotId: url.searchParams.get("snapshotId"),
            tourId: url.searchParams.get("tourId"),
          },
        },
      })

      if (format === "csv" && result.csv) {
        return new NextResponse(result.csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="publication-deliveries-${admin.orgId.slice(0, 8)}.csv"`,
            "Cache-Control": "no-store",
          },
        })
      }

      return NextResponse.json({
        success: true,
        orgId: admin.orgId,
        correlationId: admin.correlationId,
        summary: result.summary,
        rows: result.rows,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed"
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  },
)
