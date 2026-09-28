import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const patchSchema = z.object({
  environment: z.enum(["local", "staging", "pilot", "production"]),
  enabled: z.boolean().optional(),
  rollout_percentage: z.number().int().min(0).max(100).optional(),
  reason: z.string().trim().min(3).max(2000),
  idempotency_key: z.string().trim().min(8).max(200),
  expected_version: z.number().int().positive(),
}).refine((value) => value.enabled !== undefined || value.rollout_percentage !== undefined, {
  message: "enabled or rollout_percentage is required",
})

function extractKey(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('features')
  return idx >= 0 ? decodeURIComponent(segments[idx + 1] || '') || null : null
}

export const PATCH = withAdminCapability("org.settings.manage", async (request: NextRequest, { supabase, user, admin }) => {
  const key = extractKey(request.url)
  if (!key) return NextResponse.json({ error: 'Missing flag key' }, { status: 400 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten(), code: "validation_failed" }, { status: 422 })

  const { reason, idempotency_key, expected_version, environment, ...updates } = parsed.data

  const { data, error } = await supabase
    .from("admin_org_feature_flag_assignments")
    .update({
      ...updates,
      change_reason: reason,
      idempotency_key,
      updated_by: user.id,
    })
    .eq("org_id", admin.orgId)
    .eq("flag_key", key)
    .eq("environment", environment)
    .eq("assignment_version", expected_version)
    .select("*")
    .maybeSingle()

  if (error) {
    const conflict = error.code === "23505"
    return NextResponse.json({ error: conflict ? "Idempotency key already used." : error.message, code: conflict ? "feature_flag_conflict" : "feature_flag_store_unavailable" }, { status: conflict ? 409 : 503 })
  }
  if (!data) {
    return NextResponse.json({ error: "Assignment changed or does not exist.", code: "feature_flag_version_conflict" }, { status: 409 })
  }
  return NextResponse.json({ assignment: data })
})

export const DELETE = withAdminCapability("org.settings.manage", async () => NextResponse.json({
  error: "Feature assignments are retained for audit. Disable with PATCH instead of deleting.",
  code: "feature_flag_delete_forbidden",
}, { status: 405 }))
