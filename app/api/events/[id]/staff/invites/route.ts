import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { EmailDeliveryService } from "@/lib/services/email-delivery.service"
import { sendSMSNotification } from "@/lib/services/notification-channels"
import { createStaffingInvitation } from "@/lib/services/staffing-invitation.service"
import { StaffingFlowError, staffingErrorStatus } from "@/lib/services/staffing-assignment.service"
import { resolveEventReference } from "../../../_lib/event-reference"

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(6).max(80).optional(),
  role: z.string().trim().min(1).max(160),
  department: z.string().trim().min(1).max(160),
  template_id: z.string().uuid(),
  shift_date: z.string().date(),
  start_time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  end_time: z.string().regex(/^\d{2}:\d{2}(?::\d{2})?$/),
  notes: z.string().trim().max(4000).optional(),
}).refine((input) => Boolean(input.email || input.phone), {
  message: "An email address or phone number is required.",
})

function absoluteInviteUrl(token: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || ""
  const base = configured
    ? `${/^https?:\/\//i.test(configured) ? "" : "https://"}${configured.replace(/\/$/, "")}`
    : ""
  return `${base}/staffing/invite/${encodeURIComponent(token)}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character)
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return withAdminCapability("workforce.manage", async (_request, { supabase, user, admin }) => {
    try {
      const event = await resolveEventReference(supabase, id)
      if (!event) return NextResponse.json({ error: "Event not found.", code: "not_found" }, { status: 404 })
      if (!event.orgId || event.orgId !== admin.orgId) {
        return NextResponse.json({ error: "This event is outside the active organization.", code: "forbidden" }, { status: 403 })
      }
      const input = schema.parse(await request.json())
      const created = await createStaffingInvitation(supabase, {
        orgId: admin.orgId,
        actorUserId: user.id,
        name: input.name,
        email: input.email,
        phone: input.phone,
        role: input.role,
        department: input.department,
        templateId: input.template_id,
        eventId: event.id,
        shiftDate: input.shift_date,
        startTime: input.start_time,
        endTime: input.end_time,
        notes: input.notes,
      })
      const inviteUrl = absoluteInviteUrl(created.token)
      const [emailDelivery, smsDelivery] = await Promise.all([
        input.email
          ? EmailDeliveryService.sendNotificationEmail({
              to: input.email,
              subject: "You're invited to work an event on Tourify",
              text: `Accept your ${input.role} assignment: ${inviteUrl}`,
              html: `<p>You've been invited to work as <strong>${escapeHtml(input.role)}</strong>.</p><p><a href="${escapeHtml(inviteUrl)}">Accept assignment</a></p>`,
            })
          : Promise.resolve(null),
        input.phone
          ? sendSMSNotification({ to: input.phone, body: `Tourify event staffing invitation (${input.role}): ${inviteUrl}` })
          : Promise.resolve(null),
      ])
      return NextResponse.json({
        success: true,
        invitation: created.invitation,
        onboardingCandidate: created.candidate,
        acceptUrl: inviteUrl,
        inviteUrl,
        delivery: { email: emailDelivery, sms: smsDelivery, delivered: Boolean(emailDelivery?.success || smsDelivery?.success) },
      }, { status: 201 })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Review the invitation fields.", code: "validation", details: error.flatten() }, { status: 400 })
      }
      if (error instanceof StaffingFlowError) {
        return NextResponse.json({ error: error.message, code: error.code, details: error.details }, { status: staffingErrorStatus(error) })
      }
      console.error("[event staff invite]", error)
      return NextResponse.json({ error: "Unable to send the staffing invitation.", code: "database" }, { status: 500 })
    }
  })(request)
}
