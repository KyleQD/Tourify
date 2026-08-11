import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const assignmentSchema = z.object({
  flag_key: z.string().regex(/^admin_[a-z0-9]+(?:_[a-z0-9]+)*_v[1-9][0-9]*$/),
  environment: z.enum(["local", "staging", "pilot", "production"]),
  enabled: z.boolean().default(false),
  rollout_percentage: z.number().int().min(0).max(100).default(0),
  reason: z.string().trim().min(3).max(2000),
  idempotency_key: z.string().trim().min(8).max(200),
})

export const GET = withAdminCapability("org.settings.manage", async (_request: NextRequest, { supabase, admin }) => {
  const [definitionsResult, assignmentsResult] = await Promise.all([
    supabase.from("admin_feature_flag_definitions").select("*").order("key"),
    supabase
      .from("admin_org_feature_flag_assignments")
      .select("*")
      .eq("org_id", admin.orgId)
      .order("flag_key"),
  ])
  if (definitionsResult.error || assignmentsResult.error) {
    return NextResponse.json({
      error: definitionsResult.error?.message || assignmentsResult.error?.message,
      code: "feature_flag_store_unavailable",
    }, { status: 503 })
  }
  return NextResponse.json({
    definitions: definitionsResult.data || [],
    assignments: assignmentsResult.data || [],
    orgId: admin.orgId,
  })
})

export const POST = withAdminCapability("org.settings.manage", async (request: NextRequest, { supabase, user, admin }) => {
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten(), code: "validation_failed" }, { status: 422 })
  }
  const { reason, ...input } = parsed.data
  const { data, error } = await supabase
    .from("admin_org_feature_flag_assignments")
    .insert({
      ...input,
      org_id: admin.orgId,
      change_reason: reason,
      updated_by: user.id,
    })
    .select("*")
    .single()
  if (error) {
    const conflict = error.code === "23505"
    return NextResponse.json({
      error: conflict ? "Assignment or idempotency key already exists." : error.message,
      code: conflict ? "feature_flag_conflict" : "feature_flag_store_unavailable",
    }, { status: conflict ? 409 : 503 })
  }
  return NextResponse.json({ assignment: data }, { status: 201 })
})
