import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { respondToShiftAssignment } from "@/lib/services/staff-shift-assignment-sync"

const respondSchema = z.object({
  action: z.enum(["accept", "decline"]),
})

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = respondSchema.parse(await req.json())
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const result = await respondToShiftAssignment({
      assignmentId: id,
      userId: user.id,
      action: body.action,
    })

    if (!result.ok) {
      const status = result.error === "Assignment not found" ? 404 : 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json({ data: result })
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? "Invalid payload" : (e as Error)?.message || "Unexpected error"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
