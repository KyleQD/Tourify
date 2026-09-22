import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createOrgTourTag, listOrgTourTags } from "@/lib/admin/tour-tags.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const createSchema = z.object({
  label: z.string().min(1).max(64),
  color: z.string().max(32).optional().nullable(),
})

export const GET = withAdminCapability("tour.view", async (_request, { supabase, admin }) => {
  try {
    const tags = await listOrgTourTags({
      supabase,
      orgId: admin.orgId,
    })
    return NextResponse.json({ success: true, tags })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load tags"
    return NextResponse.json({ success: false, error: message, tags: [] }, { status: 500 })
  }
})

export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => null)
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 })
    }
    const tag = await createOrgTourTag({
      supabase,
      orgId: admin.orgId,
      userId: user.id,
      label: parsed.data.label,
      color: parsed.data.color,
    })
    return NextResponse.json({ success: true, tag }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create tag"
    const status = /already exists|duplicate|unique/i.test(message) ? 409 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
})
