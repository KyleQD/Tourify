import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  adminAccessErrorResponse,
  assertAdminEventAccess,
} from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** VEND-101 — Create event vendor request only after event org access + vendor.manage. */

const createSchema = z.object({
  event_id: z.string().uuid("Invalid event_id"),
  job_posting_template_id: z.string().uuid("Invalid job_posting_template_id"),
  vendor_org_id: z.string().uuid("Invalid vendor_org_id").optional(),
  message: z.string().max(2000).optional(),
})

export const POST = withAdminCapability(
  "vendor.manage",
  async (request: NextRequest, { user, supabase, admin }) => {
    try {
      const validated = createSchema.parse(await request.json())
      await assertAdminEventAccess({
        supabase,
        userId: user.id,
        eventId: validated.event_id,
        orgId: admin.orgId,
      })

      const { data, error } = await supabase
        .from("event_vendor_requests")
        .insert({
          event_id: validated.event_id,
          job_posting_template_id: validated.job_posting_template_id,
          vendor_org_id: validated.vendor_org_id ?? null,
          created_by: user.id,
          status: "pending",
          message: validated.message ?? null,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, request: data }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Validation error", details: error.errors },
          { status: 400 },
        )
      }
      const resolved = adminAccessErrorResponse(error, "Failed to create vendor request", 500)
      return NextResponse.json({ error: resolved.message }, { status: resolved.status })
    }
  },
)
