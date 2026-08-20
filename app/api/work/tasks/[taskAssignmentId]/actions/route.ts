import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAuth } from "@/lib/auth/api-auth"

const schema = z.object({
  action: z.enum(["acknowledge", "start", "complete", "block"]),
  blockedReason: z.string().trim().min(1).max(4000).optional(),
}).superRefine((value, context) => {
  if (value.action === "block" && !value.blockedReason) context.addIssue({ code: "custom", path: ["blockedReason"], message: "Explain what is blocking this task" })
})

export async function POST(request: NextRequest, context: { params: Promise<{ taskAssignmentId: string }> }) {
  const { taskAssignmentId } = await context.params
  return withAuth(async (req, { supabase }) => {
    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid task action", details: parsed.error.flatten() }, { status: 400 })
    const { data, error } = await (supabase as any).rpc("transition_workflow_task_assignment", {
      p_assignment_id: taskAssignmentId,
      p_action: parsed.data.action,
      p_blocked_reason: parsed.data.blockedReason ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === "42501" ? 404 : 422 })
    return NextResponse.json({ success: true, assignment: data })
  })(request)
}
