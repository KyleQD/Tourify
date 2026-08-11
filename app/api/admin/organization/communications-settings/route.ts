import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability, withAdminAuth } from "@/lib/auth/api-auth"

export const GET = withAdminAuth(async (request: NextRequest, { supabase, user }) => {
  // Derive org_id from the user's profile (same pattern as audit route)
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.org_id) {
    return NextResponse.json({ error: "No org found for user" }, { status: 403 })
  }

  const orgId = profile.org_id as string

  let settings: Record<string, unknown> | null = null
  let unavailable = false

  try {
    const { data, error } = await supabase
      .from("admin_org_notification_settings")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle()
    if (error?.code === "42P01") {
      unavailable = true
    } else if (error) {
      throw error
    } else {
      settings = data as Record<string, unknown> | null
    }
  } catch {
    unavailable = true
  }

  return NextResponse.json({
    success: true,
    orgId,
    settings: settings ?? {
      email_operational: true,
      email_commercial: true,
      email_security: true,
      email_emergency: true,
      quiet_hours_start: null,
      quiet_hours_end: null,
      quiet_hours_timezone: "UTC",
    },
    unavailable,
    freshAt: new Date().toISOString(),
  })
})

export const PATCH = withAdminCapability("org.settings.manage", async (request: NextRequest, { supabase, admin }) => {
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  try {
    const { error } = await supabase
      .from("admin_org_notification_settings")
      .upsert({
        org_id: admin.orgId,
        email_operational: body.email_operational,
        email_commercial: body.email_commercial,
        email_security: body.email_security,
        email_emergency: body.email_emergency,
        quiet_hours_start: body.quiet_hours_start ?? null,
        quiet_hours_end: body.quiet_hours_end ?? null,
        quiet_hours_timezone: body.quiet_hours_timezone ?? "UTC",
        updated_at: new Date().toISOString(),
      })

    if (error?.code === "42P01") {
      return NextResponse.json({ success: false, unavailable: true, unavailableReason: "Notification settings table not available" }, { status: 503 })
    }
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
})
