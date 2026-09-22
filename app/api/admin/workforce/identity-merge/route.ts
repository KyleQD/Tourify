import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  executeWorkforceMerge,
  findWorkforceDuplicateCandidates,
  listKnownDuplicateRiskPatterns,
  previewWorkforceMerge,
  WorkforceMergeError,
} from "@/lib/admin/workforce-identity-merge.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

const previewSchema = z.object({
  action: z.literal("preview"),
  keep_staff_member_id: z.string().uuid(),
  merge_staff_member_id: z.string().uuid(),
})

const mergeSchema = z.object({
  action: z.literal("merge"),
  keep_staff_member_id: z.string().uuid(),
  merge_staff_member_id: z.string().uuid(),
  confirm_preview: z.literal(true),
})

const bodySchema = z.discriminatedUnion("action", [previewSchema, mergeSchema])

export const GET = withAdminCapability("workforce.view", async (_request, { admin, supabase }) => {
  try {
    const candidates = await findWorkforceDuplicateCandidates({
      supabase,
      orgId: admin.orgId,
    })
    return NextResponse.json({
      data: {
        candidates,
        riskPatterns: listKnownDuplicateRiskPatterns(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to scan duplicates" },
      { status: 500 },
    )
  }
})

export const POST = withAdminCapability("workforce.manage", async (request: NextRequest, { admin, supabase, user }) => {
  try {
    const body = bodySchema.parse(await request.json())

    if (body.action === "preview") {
      const preview = await previewWorkforceMerge({
        supabase,
        orgId: admin.orgId,
        keepStaffMemberId: body.keep_staff_member_id,
        mergeStaffMemberId: body.merge_staff_member_id,
      })
      return NextResponse.json({ data: preview })
    }

    const result = await executeWorkforceMerge({
      supabase,
      orgId: admin.orgId,
      keepStaffMemberId: body.keep_staff_member_id,
      mergeStaffMemberId: body.merge_staff_member_id,
      actorUserId: user.id,
      confirmPreview: body.confirm_preview,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Merge failed", data: result }, { status: 422 })
    }
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
    }
    if (error instanceof WorkforceMergeError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Identity merge failed" },
      { status: 500 },
    )
  }
})
