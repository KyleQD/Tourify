import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  hashInvitationToken,
} from "@/lib/admin/tour-collaboration-invitations"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const tokenSchema = z.string().min(20).max(200)

function extractToken(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("invitations")
  return index >= 0 ? decodeURIComponent(segments[index + 1] || "") : null
}

async function loadInvitation(token: string) {
  const service = createServiceRoleClient()
  const { data, error } = await service
    .from("tour_collaboration_invitations")
    .select(
      "id,tour_id,org_id,invited_by,invited_user_id,invited_email,invited_phone,role,channel,status,delivery_status,expires_at,accepted_at,accepted_by",
    )
    .eq("token_hash", hashInvitationToken(token))
    .maybeSingle()
  if (error) throw new Error(error.message)
  return { service, invitation: data }
}

async function loadTourPreview(service: ReturnType<typeof createServiceRoleClient>, tourId: string) {
  const { data } = await service
    .from("tours")
    .select("id,name,status")
    .eq("id", tourId)
    .maybeSingle()
  return data
}

export async function GET(request: NextRequest) {
  try {
    const parsed = tokenSchema.safeParse(extractToken(request.url))
    if (!parsed.success) return NextResponse.json({ error: "Invitation not found." }, { status: 404 })
    const { service, invitation } = await loadInvitation(parsed.data)
    if (!invitation?.id) return NextResponse.json({ error: "Invitation not found." }, { status: 404 })

    const expired = Date.parse(invitation.expires_at) <= Date.now()
    if (expired && invitation.status === "pending") {
      await service
        .from("tour_collaboration_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id)
        .eq("status", "pending")
    }
    const tour = await loadTourPreview(service, invitation.tour_id)
    if (!tour?.id) return NextResponse.json({ error: "Tour not found." }, { status: 404 })

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        tourId: invitation.tour_id,
        tourName: tour.name,
        role: invitation.role,
        channel: invitation.channel,
        status: expired && invitation.status === "pending" ? "expired" : invitation.status,
        expiresAt: invitation.expires_at,
        requiresAccount: true,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load invitation" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: "Sign in to accept this invitation." }, { status: 401 })

  try {
    const parsed = tokenSchema.safeParse(extractToken(request.url))
    if (!parsed.success) return NextResponse.json({ error: "Invitation not found." }, { status: 404 })
    const { data, error } = await auth.supabase.rpc("accept_tour_collaboration_invitation", {
      p_token_hash: hashInvitationToken(parsed.data),
    })
    if (error) {
      const status =
        error.code === "P0002" ? 404
          : error.code === "23505" ? 409
            : error.code === "42501" ? 403
              : error.code === "22023" ? 410
                : 500
      return NextResponse.json({ error: error.message || "Failed to accept invitation" }, { status })
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.tour_id) throw new Error("Invitation acceptance did not return a tour.")
    return NextResponse.json({
      success: true,
      tourId: result.tour_id,
      alreadyAccepted: Boolean(result.already_accepted),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to accept invitation" },
      { status: 500 },
    )
  }
}
