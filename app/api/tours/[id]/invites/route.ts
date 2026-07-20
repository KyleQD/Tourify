import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { EmailDeliveryService } from "@/lib/services/email-delivery.service"
import { sendSMSNotification } from "@/lib/services/notification-channels"

const createInviteSchema = z.object({
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(6).max(80).optional(),
  role: z.string().trim().min(1).max(160),
  positionDetails: z.object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().min(1).max(4000),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    location: z.string().max(500).optional(),
    compensation: z.string().max(500).optional(),
  }),
}).refine(input => Boolean(input.email || input.phone), {
  message: "An email address or phone number is required.",
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: "Validation error", details: error.issues }, { status: 400 })
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

function onboardingUrl(token: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || ""
  const base = configured
    ? `${/^https?:\/\//i.test(configured) ? "" : "https://"}${configured.replace(/\/$/, "")}`
    : ""
  return `${base}/onboarding/hire/${encodeURIComponent(token)}`
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] || character)
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAdminCapability("workforce.view", async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({ supabase, userId: user.id, tourId: id, orgId: admin.orgId })
      const { data, error } = await supabase
        .from("staff_invitations")
        .select("*")
        .eq("tour_id", id)
        .order("created_at", { ascending: false })
      if (error) throw new Error(error.message)
      return NextResponse.json({ success: true, invites: data ?? [] })
    } catch (error) {
      return routeError(error, "Failed to load tour invitations")
    }
  })(request)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return withAdminCapability("workforce.manage", async (_request, { user, supabase, admin }) => {
    try {
      const tour = await assertAdminTourAccess({ supabase, userId: user.id, tourId: id, orgId: admin.orgId }) as Record<string, unknown>
      const input = createInviteSchema.parse(await request.json())
      const token = crypto.randomUUID()
      const { data, error } = await supabase
        .from("staff_invitations")
        .insert({
          email: input.email ?? null,
          phone: input.phone ?? null,
          position_details: input.positionDetails,
          token,
          status: "pending",
          tour_id: id,
          role: input.role,
          origin: "tour",
          created_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      const inviteUrl = onboardingUrl(token)
      const tourName = String(tour.name || "your tour")
      const [emailDelivery, smsDelivery] = await Promise.all([
        input.email
          ? EmailDeliveryService.sendNotificationEmail({
              to: input.email,
              subject: `You're invited to join ${tourName} on Tourify`,
              text: `You've been invited as ${input.role}. Get started: ${inviteUrl}`,
              html: `<p>You've been invited to join <strong>${escapeHtml(tourName)}</strong> as ${escapeHtml(input.role)}.</p><p><a href="${escapeHtml(inviteUrl)}">Open your Tourify invitation</a></p>`,
            })
          : Promise.resolve(null),
        input.phone
          ? sendSMSNotification({ to: input.phone, body: `Tourify invitation for ${tourName} (${input.role}): ${inviteUrl}` })
          : Promise.resolve(null),
      ])
      return NextResponse.json({
        success: true,
        invite: data,
        onboardingUrl: inviteUrl,
        delivery: {
          email: emailDelivery,
          sms: smsDelivery,
          delivered: Boolean(emailDelivery?.success || smsDelivery?.success),
        },
      }, { status: 201 })
    } catch (error) {
      return routeError(error, "Failed to create tour invitation")
    }
  })(request)
}
