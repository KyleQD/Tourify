import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAdminAuth, withAuth } from "@/lib/auth/api-auth"
import { serviceRoleClient as supabase } from "@/lib/supabase/service-role"

const positionDetailsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  compensation: z.string().optional(),
})

const createInvitationSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  positionDetails: positionDetailsSchema,
  token: z.string().uuid("Invalid token"),
  status: z.enum(["pending"]).default("pending"),
  onboardingTemplateId: z.string().uuid().optional(),
})

const updateInvitationSchema = z.object({
  token: z.string().uuid("Invalid token"),
  status: z.enum(["accepted", "declined"]),
})

const publicInvitationSelect = `
  id,
  token,
  status,
  email,
  phone,
  position_details,
  created_at
`

export const POST = withAdminAuth(async (req) => {
  try {
    const body = await req.json()
    const validatedData = createInvitationSchema.parse(body)

    const { data: existingInvite } = await supabase
      .from("staff_invitations")
      .select("id")
      .eq("token", validatedData.token)
      .maybeSingle()

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already exists" },
        { status: 409 }
      )
    }

    const insertPayload: Record<string, unknown> = {
      email: validatedData.email,
      phone: validatedData.phone,
      position_details: validatedData.positionDetails,
      token: validatedData.token,
      status: "pending",
      created_at: new Date().toISOString(),
    }

    if (validatedData.onboardingTemplateId)
      insertPayload.onboarding_template_id = validatedData.onboardingTemplateId

    const { data, error } = await supabase
      .from("staff_invitations")
      .insert(insertPayload)
      .select(publicInvitationSelect)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error creating invitation:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    )
  }
})

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("staff_invitations")
      .select(publicInvitationSelect)
      .eq("token", token)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        token: data.token,
        status: data.status,
        positionDetails: data.position_details,
        createdAt: data.created_at,
        hasEmail: Boolean(data.email),
        hasPhone: Boolean(data.phone),
      },
    })
  } catch (error) {
    console.error("Error fetching invitation:", error)
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    )
  }
}

export const PATCH = withAuth(async (req, { user }) => {
  try {
    const body = await req.json()
    const validatedData = updateInvitationSchema.parse(body)

    const { data: currentInvite, error: fetchError } = await supabase
      .from("staff_invitations")
      .select("id, status, email, phone, position_details, token")
      .eq("token", validatedData.token)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!currentInvite) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      )
    }

    if (currentInvite.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been processed" },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from("staff_invitations")
      .update({
        status: validatedData.status,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("token", validatedData.token)
      .select(publicInvitationSelect)
      .single()

    if (error) throw error

    if (validatedData.status === "accepted") {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          type: "staff_invite_accepted",
          content: `Staff invitation accepted by ${data.email || data.phone || "a user"}`,
          metadata: {
            invitationId: data.id,
            userId: user.id,
            positionDetails: currentInvite.position_details,
          },
          created_at: new Date().toISOString(),
        })

      if (notificationError) throw notificationError
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error updating invitation:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update invitation" },
      { status: 500 }
    )
  }
})
