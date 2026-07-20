import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { POST as hiringInvitePost } from "@/app/api/hiring/invite/route"
import { GET as hiringRosterGet } from "@/app/api/hiring/roster/route"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  position: z.string().min(1),
  department: z.string().optional(),
  employment_type: z.enum(["full_time", "part_time", "contractor", "volunteer"]).default("part_time"),
  venue_id: z.string().uuid(),
  onboarding_template_id: z.string().uuid().optional(),
})

/**
 * Thin compatibility proxy → modern hiring APIs.
 * Prefer /api/hiring/invite and /api/hiring/roster for new clients.
 */
export async function GET(request: NextRequest) {
  const venueId =
    request.nextUrl.searchParams.get("venue_id") ||
    request.nextUrl.searchParams.get("venueId")

  if (!venueId) {
    return NextResponse.json({ error: "venue_id is required" }, { status: 400 })
  }

  const rosterUrl = new URL("/api/hiring/roster", request.url)
  rosterUrl.searchParams.set("venue_id", venueId)
  rosterUrl.searchParams.set("employer_entity_type", "venue")
  rosterUrl.searchParams.set("employer_entity_id", venueId)
  rosterUrl.searchParams.set("limit", "250")

  const rosterRequest = new NextRequest(rosterUrl, {
    method: "GET",
    headers: request.headers,
  })

  const response = await hiringRosterGet(rosterRequest)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json(
      {
        error: payload?.error?.message || payload?.error || "Failed to load staff onboarding data",
        onboarding_data: [],
      },
      { status: response.status },
    )
  }

  const members = Array.isArray(payload?.data?.members)
    ? payload.data.members
    : Array.isArray(payload?.data)
      ? payload.data
      : []

  return NextResponse.json({
    success: true,
    onboarding_data: members.map((row: Record<string, any>) => ({
      ...row,
      progress: row.onboarding_completed || row.status === "active" ? 100 : Number(row.onboarding_progress || 0),
      onboarding_status:
        row.onboarding_completed || row.status === "active" ? "completed" : row.status || "pending",
    })),
  })
}

export async function POST(request: NextRequest) {
  const parsed = createSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const body = parsed.data
  const inviteRequest = new NextRequest(new URL("/api/hiring/invite", request.url), {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      email: body.email,
      name: body.name,
      phone: body.phone,
      position: body.position,
      department: body.department,
      employment_type: body.employment_type,
      template_id: body.onboarding_template_id ?? null,
      venue_id: body.venue_id,
      employer_entity_type: "venue",
      employer_entity_id: body.venue_id,
    }),
  })

  const response = await hiringInvitePost(inviteRequest)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error?.message || payload?.error || "Failed to create staff invitation" },
      { status: response.status },
    )
  }

  const data = payload.data || {}
  const candidate = data.candidate || data
  const invitation = data.invitation || {}

  return NextResponse.json({
    success: true,
    staff_profile: candidate,
    user_account: {
      id: candidate.user_id || candidate.id || invitation.id || "",
      email: body.email,
      existing_user: Boolean(candidate.user_id),
    },
    invitation_token: invitation.token,
    message: "Staff invitation created. Share the onboarding link to finish setup.",
  })
}
