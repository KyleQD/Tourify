import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const schema = z.object({
  staffMemberIds: z.array(z.string().uuid()).min(1).max(1000),
  conflictOverrideReason: z.string().trim().min(1).max(2000).nullable().optional(),
})

export const POST = withAdminCapability("workforce.publish", async (request: NextRequest, { supabase }) => {
  const id = request.nextUrl.pathname.match(/shift-plans\/([^/]+)\/publish/)?.[1]
  if (!id || !z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Invalid shift plan" }, { status: 400 })
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid publication request", details: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase as any).rpc("publish_staff_shift_plan", {
    p_plan_id: id,
    p_staff_member_ids: parsed.data.staffMemberIds,
    p_conflict_override_reason: parsed.data.conflictOverrideReason ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 403 : 422 })
  return NextResponse.json({ success: true, publication: data })
})
