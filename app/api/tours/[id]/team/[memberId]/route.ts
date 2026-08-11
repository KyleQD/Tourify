import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"

/** VEND-101 — Legacy team member by id → canonical tour access. */

const updateTeamMemberSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  role: z.string().min(1, "Role is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional(),
  status: z.enum(["confirmed", "pending", "declined"]).optional(),
  arrival_date: z.string().optional(),
  departure_date: z.string().optional(),
  responsibilities: z.string().optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params
  return withAdminCapability("workforce.view", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data: teamMember, error } = await supabase
        .from("tour_team_members")
        .select("*")
        .eq("id", memberId)
        .eq("tour_id", id)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!teamMember) {
        return NextResponse.json({ error: "Team member not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        member: teamMember,
        message: "Team member fetched successfully",
      })
    } catch (error) {
      return routeError(error, "Failed to fetch team member")
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params
  return withAdminCapability("workforce.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const validatedData = updateTeamMemberSchema.parse(await request.json())
      const { data: updatedMember, error } = await supabase
        .from("tour_team_members")
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId)
        .eq("tour_id", id)
        .select()
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!updatedMember) {
        return NextResponse.json({ error: "Team member not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        member: updatedMember,
        message: "Team member updated successfully",
      })
    } catch (error) {
      return routeError(error, "Failed to update team member")
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  const { id, memberId } = await params
  return withAdminCapability("workforce.manage", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data, error } = await supabase
        .from("tour_team_members")
        .delete()
        .eq("id", memberId)
        .eq("tour_id", id)
        .select("id")
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) {
        return NextResponse.json({ error: "Team member not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        message: "Team member removed successfully",
      })
    } catch (error) {
      return routeError(error, "Failed to delete team member")
    }
  })(request)
}
