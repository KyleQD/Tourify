import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** VEND-101 — Assign user to tour team via canonical tour access. */

const assignSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  status: z.enum(["confirmed", "pending", "declined"]).default("confirmed"),
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation error", details: error.errors },
      { status: 400 },
    )
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability("workforce.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const validated = assignSchema.parse(await request.json())

      let displayName = validated.name
      let email = validated.email
      if (!displayName || !email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("id", validated.userId)
          .maybeSingle()
        displayName = displayName || profile?.display_name || ""
        email = email || profile?.email || ""
      }

      const now = new Date().toISOString()
      const { data: member, error: insertError } = await supabase
        .from("tour_team_members")
        .insert({
          tour_id: id,
          user_id: validated.userId,
          name: displayName,
          role: validated.role,
          email,
          phone: validated.phone,
          status: validated.status,
          created_at: now,
          updated_at: now,
        })
        .select("*")
        .single()

      if (insertError) throw new Error(insertError.message)

      return NextResponse.json({ success: true, member }, { status: 201 })
    } catch (error) {
      return routeError(error, "Failed to assign user")
    }
  })(request)
}
