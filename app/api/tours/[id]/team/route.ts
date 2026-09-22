import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { ensureThreadForScope } from "@/lib/workflows/workflow-threads"

/** VEND-101 — Legacy tour team → canonical tour access + workforce capability. */

const createTeamMemberSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  status: z.enum(["confirmed", "pending", "declined"]).default("pending"),
  arrival_date: z.string().optional(),
  departure_date: z.string().optional(),
  responsibilities: z.string().optional(),
})

function isWorkflowEnabled() {
  return process.env.FEATURE_UNIFIED_WORKFLOW_THREADS === "1"
}

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
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability("workforce.view", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data: teamMembers, error: teamError } = await supabase
        .from("tour_team_members")
        .select("*")
        .eq("tour_id", id)
        .order("name", { ascending: true })

      if (teamError) throw new Error(teamError.message)

      return NextResponse.json({
        success: true,
        team_members: teamMembers || [],
        message: "Tour team members fetched successfully",
      })
    } catch (error) {
      return routeError(error, "Failed to fetch team members")
    }
  })(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability("workforce.manage", async (_request, { user, supabase, admin }) => {
    try {
      const tour = await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const validatedData = createTeamMemberSchema.parse(await request.json())
      const now = new Date().toISOString()
      const { data: teamMember, error: teamMemberError } = await supabase
        .from("tour_team_members")
        .insert({
          ...validatedData,
          tour_id: id,
          user_id: user.id,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (teamMemberError) throw new Error(teamMemberError.message)

      if (isWorkflowEnabled()) {
        try {
          const thread = await ensureThreadForScope({
            supabase,
            scopeType: "tour",
            scopeId: id,
            userId: user.id,
            title: `${(tour as { name?: string })?.name || "Tour"} workflow`,
          })

          const { data: profileByEmail } = await supabase
            .from("profiles")
            .select("id, user_id")
            .eq("email", validatedData.email)
            .maybeSingle()

          const participantUserId =
            (profileByEmail as { user_id?: string; id?: string } | null)?.user_id
            || (profileByEmail as { id?: string } | null)?.id
          if (participantUserId) {
            await supabase.from("workflow_participants").upsert(
              {
                thread_id: thread.id,
                user_id: participantUserId,
                role: validatedData.role.toLowerCase().includes("manager") ? "admin" : "member",
                permissions: ["messages.write", "tasks.manage"],
                status: validatedData.status === "declined" ? "removed" : "active",
                added_by: user.id,
              },
              { onConflict: "thread_id,user_id" },
            )
          }
        } catch (workflowError) {
          console.warn("[Tour Team API] Workflow participant sync skipped:", workflowError)
        }
      }

      return NextResponse.json({
        success: true,
        member: teamMember,
        message: "Team member added successfully to tour",
      }, { status: 201 })
    } catch (error) {
      return routeError(error, "Failed to create team member")
    }
  })(request)
}
