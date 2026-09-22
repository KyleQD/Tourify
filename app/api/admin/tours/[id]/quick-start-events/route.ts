import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { requireTourCapability } from "@/lib/admin/tour-access.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const inputSchema = z.object({
  count: z.number().int().min(1).max(50),
})

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId) {
        return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
      }

      const idempotencyKey =
        request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key")
      const batchId = z.string().uuid().safeParse(idempotencyKey)
      if (!batchId.success) {
        return NextResponse.json(
          { success: false, error: "A UUID Idempotency-Key header is required." },
          { status: 422 },
        )
      }

      const input = inputSchema.parse(await request.json().catch(() => ({})))
      await requireTourCapability({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
        capability: "tour.manage",
        capabilities: admin.capabilities,
      })

      const { data, error } = await supabase.rpc("create_tour_quick_start_events", {
        p_tour_id: tourId,
        p_count: input.count,
        p_batch_id: batchId.data,
      })

      if (error) {
        const status = error.code === "23505" ? 409 : error.code === "22023" ? 422 : 500
        return NextResponse.json(
          { success: false, error: error.message || "Failed to create event drafts" },
          { status },
        )
      }

      const events = (data || []).map((row: Record<string, unknown>) => ({
        id: String(row.event_id),
        label: String(row.label),
        ordinal: Number(row.ordinal),
        created: Boolean(row.created),
      }))

      return NextResponse.json({ success: true, batchId: batchId.data, events })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: "Event count must be between 1 and 50.", details: error.issues },
          { status: 422 },
        )
      }
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status) || 500
          : 500
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : "Failed to create event drafts" },
        { status },
      )
    }
  },
)
