import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  adminAccessErrorResponse,
  requireEventChildAccess,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** VEND-101 — Patch vendor request only after event-child org access. */

const updateSchema = z.object({
  status: z.enum(["approved", "rejected"]),
})

export const PATCH = withAdminCapability(
  "vendor.manage",
  async (request: NextRequest, { user, supabase, admin }) => {
    try {
      const { pathname } = new URL(request.url)
      const id = z.string().uuid().parse(pathname.split("/").slice(-1)[0])
      const { status } = updateSchema.parse(await request.json())

      const { data: existing, error: loadError } = await supabase
        .from("event_vendor_requests")
        .select("id,event_id")
        .eq("id", id)
        .maybeSingle()

      if (loadError) {
        return NextResponse.json({ error: loadError.message }, { status: 400 })
      }
      if (!existing?.event_id) {
        return NextResponse.json({ error: "Vendor request not found" }, { status: 404 })
      }

      await requireEventChildAccess({
        supabase,
        userId: user.id,
        orgId: admin.orgId,
        eventId: existing.event_id,
        childTable: "event_vendor_requests",
        childId: id,
        parentFkColumn: "event_id",
        capability: "vendor.manage",
      })

      const { data, error } = await supabase
        .from("event_vendor_requests")
        .update({ status })
        .eq("id", id)
        .eq("event_id", existing.event_id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, request: data })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 },
        )
      }
      const resolved = adminAccessErrorResponse(error, "Failed to update vendor request", 500)
      return NextResponse.json({ error: resolved.message }, { status: resolved.status })
    }
  },
)
