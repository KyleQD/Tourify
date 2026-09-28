import "server-only"

import { createHash, randomBytes } from "node:crypto"
import { z } from "zod"

export const TOUR_COLLABORATION_INVITE_NOTIFICATION_TYPE = "collaboration_invite" as const

export const tourCollaborationInviteChannelSchema = z.enum([
  "in_app",
  "email",
  "sms",
  "copy",
])

export const createTourCollaborationInviteSchema = z
  .object({
    channel: tourCollaborationInviteChannelSchema,
    inviteeUserId: z.string().uuid().optional(),
    email: z.string().trim().email().max(320).optional(),
    phone: z.string().trim().min(7).max(32).optional(),
    role: z.literal("admin").optional().default("admin"),
  })
  .superRefine((value, context) => {
    if (value.channel === "in_app" && !value.inviteeUserId) {
      context.addIssue({ code: "custom", message: "Select a Tourify user." })
    }
    if (value.channel === "email" && !value.email) {
      context.addIssue({ code: "custom", message: "Enter an email address." })
    }
    if (value.channel === "sms" && !value.phone) {
      context.addIssue({ code: "custom", message: "Enter a phone number." })
    }
  })

export function normalizeInviteEmail(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase() || ""
  return normalized || null
}

export function normalizeInvitePhone(value?: string | null): string | null {
  const normalized = value?.trim().replace(/[^+\d]/g, "") || ""
  return normalized || null
}

export function createInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url")
  return { token, tokenHash: hashInvitationToken(token) }
}

export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function buildTourCollaborationInviteNotification(input: {
  invitationId: string
  inviteUrl: string
  inviterUserId: string
  recipientUserId: string
  tourId: string
  tourName: string
  expiresAt: string
}) {
  return {
    userId: input.recipientUserId,
    type: TOUR_COLLABORATION_INVITE_NOTIFICATION_TYPE,
    title: `Join ${input.tourName}`,
    content: `You were invited to help administer ${input.tourName}. Open this message to review and join the tour.`,
    summary: "Tour administrator invitation",
    metadata: {
      link: input.inviteUrl,
      tourId: input.tourId,
      invitationId: input.invitationId,
      actionLabel: "Review invitation",
    },
    relatedUserId: input.inviterUserId,
    relatedContentId: input.tourId,
    relatedContentType: "tour",
    priority: "high" as const,
    expiresAt: input.expiresAt,
  }
}

export function invitationDeliveryErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message
  }
  return "Invitation delivery failed"
}

export function invitationIdentityMatches(args: {
  invitation: {
    invited_user_id?: string | null
    invited_email?: string | null
    invited_phone?: string | null
  }
  user: { id: string; email?: string | null; phone?: string | null }
}): boolean {
  const { invitation, user } = args
  if (invitation.invited_user_id && invitation.invited_user_id !== user.id) return false
  if (
    invitation.invited_email
    && normalizeInviteEmail(invitation.invited_email) !== normalizeInviteEmail(user.email)
  ) return false
  if (
    invitation.invited_phone
    && normalizeInvitePhone(invitation.invited_phone) !== normalizeInvitePhone(user.phone)
  ) return false
  return true
}

export function sanitizeInvitationRow(row: Record<string, unknown>) {
  return {
    id: String(row.id || ""),
    tourId: String(row.tour_id || ""),
    channel: String(row.channel || "copy"),
    role: String(row.role || "admin"),
    status: String(row.status || "pending"),
    deliveryStatus: String(row.delivery_status || "pending"),
    deliveryError: typeof row.delivery_error === "string" ? row.delivery_error : null,
    invitedUserId: typeof row.invited_user_id === "string" ? row.invited_user_id : null,
    invitedEmail: typeof row.invited_email === "string" ? row.invited_email : null,
    invitedPhone: typeof row.invited_phone === "string" ? row.invited_phone : null,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  }
}
