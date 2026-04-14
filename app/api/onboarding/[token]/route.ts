import { NextResponse } from "next/server"
import { z } from "zod"
import { serviceRoleClient as supabase } from '@/lib/supabase/service-role'

// Validation schema for onboarding responses
const onboardingResponseSchema = z.object({
  responses: z.record(z.any())
})

export async function GET(
  req: Request,
  { params }: any
) {
  try {
    // Get the staff invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("token", params.token)
      .eq("status", "accepted")
      .single()

    if (inviteError) {
      if (inviteError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 404 }
        )
      }
      throw inviteError
    }

    // Check if onboarding already completed
    const { data: existingOnboarding } = await supabase
      .from("onboarding_responses")
      .select("id")
      .eq("invitation_id", invitation.id)
      .single()

    if (existingOnboarding) {
      return NextResponse.json(
        { error: "Onboarding already completed" },
        { status: 400 }
      )
    }

    // Get the default onboarding template or a specific one
    const { data: template, error: templateError } = await supabase
      .from("onboarding_templates")
      .select("*")
      .eq("is_default", true)
      .single()

    if (templateError) {
      // If no default template, get any template
      const { data: anyTemplate, error: anyTemplateError } = await supabase
        .from("onboarding_templates")
        .select("*")
        .limit(1)
        .single()

      if (anyTemplateError) {
        return NextResponse.json(
          { error: "No onboarding template available" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          invitationId: invitation.id,
          positionDetails: invitation.position_details,
          template: anyTemplate
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        invitationId: invitation.id,
        positionDetails: invitation.position_details,
        template
      }
    })
  } catch (error) {
    console.error("Error fetching onboarding data:", error)
    return NextResponse.json(
      { error: "Failed to fetch onboarding data" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: any
) {
  try {
    const body = await req.json()
    const { responses } = onboardingResponseSchema.parse(body)

    // Get the staff invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("staff_invitations")
      .select("*")
      .eq("token", params.token)
      .eq("status", "accepted")
      .single()

    if (inviteError) {
      if (inviteError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Invalid or expired token" },
          { status: 404 }
        )
      }
      throw inviteError
    }

    // Check if onboarding already completed
    const { data: existingOnboarding } = await supabase
      .from("onboarding_responses")
      .select("id")
      .eq("invitation_id", invitation.id)
      .single()

    if (existingOnboarding) {
      return NextResponse.json(
        { error: "Onboarding already completed" },
        { status: 400 }
      )
    }

    // Save onboarding responses
    const { data: onboardingResponse, error: responseError } = await supabase
      .from("onboarding_responses")
      .insert({
        invitation_id: invitation.id,
        user_id: invitation.user_id,
        responses,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (responseError) throw responseError

    // Update invitation status to completed
    await supabase
      .from("staff_invitations")
      .update({ 
        status: "completed",
        updated_at: new Date().toISOString()
      })
      .eq("id", invitation.id)

    // Create notification for admin about completed onboarding
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        type: "onboarding_completed",
        content: `${invitation.email || invitation.phone} has completed their onboarding for ${invitation.position_details.title}`,
        metadata: {
          invitationId: invitation.id,
          userId: invitation.user_id,
          positionDetails: invitation.position_details,
          onboardingId: onboardingResponse.id
        },
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error("Failed to create notification:", notificationError)
    }

    return NextResponse.json({ 
      success: true, 
      data: onboardingResponse 
    })
  } catch (error) {
    console.error("Error processing onboarding:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to process onboarding" },
      { status: 500 }
    )
  }
} 