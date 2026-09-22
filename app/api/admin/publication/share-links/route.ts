import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  createPublicationShareLink,
  findLatestCommittedSnapshotForEvent,
  findLatestCommittedSnapshotForTour,
  listPublicationShareLinks,
  PublicationShareLinkError,
} from "@/lib/admin/publication-share-links.service"
import { assertScopedShareUrl } from "@/lib/admin/publication-share-surface-inventory"
import { withAdminCapability } from "@/lib/auth/api-auth"

const createSchema = z.object({
  snapshotId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  publicationType: z.string().min(1).optional(),
  name: z.string().min(1).max(120).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  passcode: z.string().min(4).max(128).optional().nullable(),
  allowDownload: z.boolean().optional(),
  maxUses: z.number().int().min(1).max(100000).optional().nullable(),
  sections: z.array(z.string().min(1)).max(40).optional(),
})

/** PUB-206/208 — List share links for org (optionally by snapshot/tour/event). */
export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, admin }) => {
  if (!admin.orgId) {
    return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
  }

  const url = new URL(request.url)
  try {
    const rows = await listPublicationShareLinks({
      supabase,
      orgId: admin.orgId,
      snapshotId: url.searchParams.get("snapshotId") || undefined,
      tourId: url.searchParams.get("tourId") || undefined,
      eventId: url.searchParams.get("eventId") || undefined,
      includeRevoked: url.searchParams.get("includeRevoked") === "1",
      limit: Math.min(Number(url.searchParams.get("limit") ?? "50") || 50, 200),
    })
    return NextResponse.json({ success: true, rows, correlationId: admin.correlationId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list share links"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
})

/** PUB-206/208 — Create a hashed, scoped share link (plaintext token returned once). */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    if (!admin.orgId) {
      return NextResponse.json({ success: false, error: "Organization required" }, { status: 403 })
    }

    const parsed = createSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }

    try {
      let snapshotId = parsed.data.snapshotId
      if (!snapshotId && parsed.data.tourId) {
        const latest = await findLatestCommittedSnapshotForTour({
          supabase,
          orgId: admin.orgId,
          tourId: parsed.data.tourId,
        })
        if (!latest) {
          return NextResponse.json(
            {
              success: false,
              error: "No committed publication snapshot for this tour. Publish first.",
              code: "snapshot_required",
            },
            { status: 409 },
          )
        }
        snapshotId = String(latest.id)
      }

      if (!snapshotId && parsed.data.eventId) {
        const latest = await findLatestCommittedSnapshotForEvent({
          supabase,
          orgId: admin.orgId,
          eventId: parsed.data.eventId,
          publicationType: parsed.data.publicationType,
        })
        if (!latest) {
          return NextResponse.json(
            {
              success: false,
              error:
                "No committed publication snapshot for this event. Publish a day sheet or itinerary first.",
              code: "snapshot_required",
            },
            { status: 409 },
          )
        }
        snapshotId = String(latest.id)
      }

      if (!snapshotId) {
        return NextResponse.json(
          { success: false, error: "snapshotId, tourId, or eventId is required" },
          { status: 400 },
        )
      }

      const origin =
        request.headers.get("origin") ||
        (() => {
          try {
            return new URL(request.url).origin
          } catch {
            return undefined
          }
        })()

      const link = await createPublicationShareLink({
        supabase,
        orgId: admin.orgId,
        actorUserId: user.id,
        snapshotId,
        name: parsed.data.name,
        expiresAt: parsed.data.expiresAt,
        passcode: parsed.data.passcode,
        allowDownload: parsed.data.allowDownload,
        maxUses: parsed.data.maxUses,
        sections: parsed.data.sections,
        origin,
        correlationId: admin.correlationId,
      })

      const guard = assertScopedShareUrl(link.url || link.path)
      if (!guard.ok) {
        return NextResponse.json(
          {
            success: false,
            error: "Share link must not use an Admin dashboard URL.",
            code: "misleading_admin_url",
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        link,
        correlationId: admin.correlationId,
      })
    } catch (error) {
      if (error instanceof PublicationShareLinkError) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status },
        )
      }
      const message = error instanceof Error ? error.message : "Failed to create share link"
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  },
)
