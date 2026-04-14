import { NextResponse } from "next/server"
import { z } from "zod"
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'

// Validation schemas
const positionDetailsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  compensation: z.string().optional()
})

const createInvitationSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  phone: z.string().optional(),
  positionDetails: positionDetailsSchema,
  token: z.string().uuid("Invalid token"),
  status: z.enum(["pending", "accepted", "declined"])
})

const updateInvitationSchema = z.object({
  token: z.string().uuid("Invalid token"),
  status: z.enum(["accepted", "declined"]),
  userId: z.string().uuid("Invalid user ID")
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const validatedData = createInvitationSchema.parse(body)

    // Check if invitation already exists
    const { data: existingInvite } = await supabase
      .from("staff_invitations")
      .select("id")
      .eq("token", validatedData.token)
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invitation already exists" },
        { status: 409 }
      )
    }

    // Store the invitation in the database
    const { data, error } = await supabase
      .from("staff_invitations")
      .insert({
        email: validatedData.email,
        phone: validatedData.phone,
        position_details: validatedData.positionDetails,
        token: validatedData.token,
        status: validatedData.status,
        created_at: new Date().toISOString()
      })
      .select()
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
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      )
    }

    // Get the invitation from the database with related data
    const { data, error } = await supabase
      .from("staff_invitations")
      .select(`
        *,
        user:profiles(id, name, email)
      `)
      .eq("token", token)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Error fetching invitation:", error)
    return NextResponse.json(
      { error: "Failed to fetch invitation" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const validatedData = updateInvitationSchema.parse(body)

    // Get the current invitation
    const { data: currentInvite, error: fetchError } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("token", validatedData.token)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        )
      }
      throw fetchError
    }

    // Check if invitation is already processed
    if (currentInvite.status !== "pending") {
      return NextResponse.json(
        { error: "Invitation has already been processed" },
        { status: 409 }
      )
    }

    // Update the invitation status
    const { data, error } = await supabase
      .from("staff_invitations")
      .update({ 
        status: validatedData.status,
        user_id: validatedData.userId,
        updated_at: new Date().toISOString()
      })
      .eq("token", validatedData.token)
      .select()
      .single()

    if (error) throw error

    // If the invitation was accepted, create a notification for the admin
    if (validatedData.status === "accepted") {
      const { error: notificationError } = await supabase
        .from("notifications")
        .insert({
          type: "staff_invite_accepted",
          content: `Staff invitation accepted by ${data.email || data.phone}`,
          metadata: {
            invitationId: data.id,
            userId: validatedData.userId,
            positionDetails: data.position_details
          },
          created_at: new Date().toISOString()
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
} 