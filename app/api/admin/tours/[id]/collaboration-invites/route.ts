import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  buildTourCollaborationInviteNotification,
  createInvitationToken,
  createTourCollaborationInviteSchema,
  invitationDeliveryErrorMessage,
  normalizeInviteEmail,
  normalizeInvitePhone,
  sanitizeInvitationRow,
} from "@/lib/admin/tour-collaboration-invitations"
import { requireTourCapability } from "@/lib/admin/tour-access.service"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { EmailDeliveryService } from "@/lib/services/email-delivery.service"
import { sendSMSNotification } from "@/lib/services/notification-channels"
import { OptimizedNotificationService } from "@/lib/services/optimized-notification-service"

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character)
}

function invitationUrl(request: NextRequest, token: string): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL
  const origin = configuredOrigin?.replace(/\/$/, "") || request.nextUrl.origin
  return `${origin}/tours/invite/${encodeURIComponent(token)}`
}

export const GET = withAdminCapability(
  "workforce.view",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId) return NextResponse.json({ error: "Missing tour id" }, { status: 400 })
      await requireTourCapability({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
        capability: "workforce.view",
        capabilities: admin.capabilities,
      })

      const { data, error } = await supabase
        .from("tour_collaboration_invitations")
        .select(
          "id,tour_id,channel,role,status,delivery_status,delivery_error,invited_user_id,invited_email,invited_phone,expires_at,created_at",
        )
        .eq("tour_id", tourId)
        .order("created_at", { ascending: false })

      if (error) throw new Error(error.message)
      return NextResponse.json({ invitations: (data || []).map(sanitizeInvitationRow) })
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status) || 500
          : 500
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load invitations" },
        { status },
      )
    }
  },
)

export const POST = withAdminCapability(
  "workforce.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId) return NextResponse.json({ error: "Missing tour id" }, { status: 400 })
      const input = createTourCollaborationInviteSchema.parse(
        await request.json().catch(() => ({})),
      )

      const access = await requireTourCapability({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
        capability: "workforce.manage",
        capabilities: admin.capabilities,
      })
      if (!access.orgId) {
        return NextResponse.json({ error: "Tour organization is required." }, { status: 409 })
      }

      const { data: tour, error: tourError } = await supabase
        .from("tours")
        .select("id,name,org_id")
        .eq("id", tourId)
        .eq("org_id", access.orgId)
        .maybeSingle()
      if (tourError || !tour?.id) {
        return NextResponse.json({ error: "Tour not found." }, { status: 404 })
      }

      let inviteeEmail = normalizeInviteEmail(input.email)
      let inviteePhone = normalizeInvitePhone(input.phone)
      if (input.inviteeUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id,email")
          .eq("id", input.inviteeUserId)
          .maybeSingle()
        if (!profile?.id) {
          return NextResponse.json({ error: "Tourify user not found." }, { status: 404 })
        }
        inviteeEmail ||= normalizeInviteEmail(profile.email)
      }

      const { token, tokenHash } = createInvitationToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const deliveryStatus = input.channel === "copy" ? "not_requested" : "pending"
      const { data: inserted, error: insertError } = await supabase
        .from("tour_collaboration_invitations")
        .insert({
          tour_id: tourId,
          org_id: access.orgId,
          invited_by: user.id,
          invited_user_id: input.inviteeUserId || null,
          invited_email: inviteeEmail,
          invited_phone: inviteePhone,
          role: "admin",
          channel: input.channel,
          token_hash: tokenHash,
          status: "pending",
          delivery_status: deliveryStatus,
          expires_at: expiresAt,
        })
        .select(
          "id,tour_id,channel,role,status,delivery_status,delivery_error,invited_user_id,invited_email,invited_phone,expires_at,created_at",
        )
        .single()
      if (insertError || !inserted?.id) throw new Error(insertError?.message || "Failed to create invitation")

      const inviteUrl = invitationUrl(request, token)
      let delivered = input.channel === "copy"
      let deliveryError: string | null = null
      let deliveryMetadata: Record<string, unknown> = {}

      try {
        if (input.channel === "in_app" && input.inviteeUserId) {
          const notification = await OptimizedNotificationService.createNotification(
            buildTourCollaborationInviteNotification({
              invitationId: inserted.id,
              inviteUrl,
              inviterUserId: user.id,
              recipientUserId: input.inviteeUserId,
              tourId,
              tourName: tour.name,
              expiresAt,
            }),
          )
          delivered = true
          deliveryMetadata = {
            notificationId: notification.id,
            channel: "in_app_message",
          }
        } else if (input.channel === "email" && inviteeEmail) {
          const result = await EmailDeliveryService.sendNotificationEmail({
            to: inviteeEmail,
            subject: `Join ${tour.name} on Tourify`,
            html: `<p>You were invited to help administer <strong>${escapeHtml(tour.name)}</strong>.</p><p><a href="${escapeHtml(inviteUrl)}">Join the tour</a></p><p>This invitation expires in seven days.</p>`,
            text: `You were invited to help administer ${tour.name}. Join here: ${inviteUrl}`,
          })
          delivered = result.success
          deliveryError = result.error || null
          deliveryMetadata = result.id ? { providerRef: result.id } : {}
        } else if (input.channel === "sms" && inviteePhone) {
          const result = await sendSMSNotification({
            to: inviteePhone,
            body: `You're invited to administer ${tour.name} on Tourify: ${inviteUrl}`,
          })
          delivered = result.success
          deliveryError = result.error || null
          deliveryMetadata = {
            ...(result.providerId ? { providerId: result.providerId } : {}),
            ...(result.providerRef ? { providerRef: result.providerRef } : {}),
          }
        }
      } catch (error) {
        deliveryError = invitationDeliveryErrorMessage(error)
      }

      if (input.channel !== "copy") {
        await supabase
          .from("tour_collaboration_invitations")
          .update({
            delivery_status: delivered ? "sent" : "failed",
            delivery_error: deliveryError,
            delivery_metadata: deliveryMetadata,
          })
          .eq("id", inserted.id)
      }

      return NextResponse.json(
        {
          invitation: {
            ...sanitizeInvitationRow({
              ...inserted,
              delivery_status: input.channel === "copy" ? "not_requested" : delivered ? "sent" : "failed",
              delivery_error: deliveryError,
            }),
            inviteUrl,
          },
        },
        { status: 201 },
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid invitation", details: error.issues }, { status: 422 })
      }
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status) || 500
          : 500
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to create invitation" },
        { status },
      )
    }
  },
)

export const DELETE = withAdminCapability(
  "workforce.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      const invitationId = request.nextUrl.searchParams.get("invitationId")
      if (!tourId || !invitationId || !z.string().uuid().safeParse(invitationId).success) {
        return NextResponse.json({ error: "A valid invitation id is required." }, { status: 422 })
      }
      await requireTourCapability({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
        capability: "workforce.manage",
        capabilities: admin.capabilities,
      })

      const { data, error } = await supabase
        .from("tour_collaboration_invitations")
        .update({ status: "revoked" })
        .eq("id", invitationId)
        .eq("tour_id", tourId)
        .eq("status", "pending")
        .select("id,status")
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data?.id) {
        return NextResponse.json(
          { error: "Only a pending invitation can be revoked." },
          { status: 409 },
        )
      }
      return NextResponse.json({ invitation: data })
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? Number((error as { status?: number }).status) || 500
          : 500
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to revoke invitation" },
        { status },
      )
    }
  },
)
