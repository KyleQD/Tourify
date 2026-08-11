import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { requireLogisticsPlanAccess } from "@/lib/logistics/authorization"
import { applyLogisticsPlanHydration } from "@/lib/logistics/plans"

const inputSchema = z.object({ expectedOperationsVersion: z.number().int().positive() })

function tourIdFromRequest(request: NextRequest) {
  const segments = new URL(request.url).pathname.split("/").filter(Boolean)
  return segments.at(-2) || null
}

export const POST = withAdminCapability("logistics.manage", async (request: NextRequest, { supabase, user, admin }) => {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten(), code: "validation_failed" }, { status: 422 })
  const tourId = tourIdFromRequest(request)
  if (!tourId) return NextResponse.json({ error: "Tour is required.", code: "validation_failed" }, { status: 422 })
  try {
    await requireLogisticsPlanAccess({ supabase, userId: user.id, orgId: admin.orgId, tourId })
    const plan = await applyLogisticsPlanHydration({
      supabase,
      userId: user.id,
      orgId: admin.orgId,
      tourId,
      expectedOperationsVersion: parsed.data.expectedOperationsVersion,
    })
    return NextResponse.json({ plan })
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number((error as { status?: number }).status) || 500 : 500
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code) : "hydration_failed"
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to hydrate logistics plan.", code }, { status })
  }
})
