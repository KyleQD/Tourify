import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"

export const POST = withAdminCapability(
  "content.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const platform = typeof body.platform === "string" ? body.platform : undefined

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) {
      return NextResponse.json({ success: false, error: "Server misconfigured" }, { status: 503 })
    }

    // INTG-007 — eligibility derives from encrypted envelope presence, never
    // from plaintext columns (client SELECT revoked by 20260921000000). The
    // Edge Function layer performs its own server-side vault decryption.
    let query = supabase
      .from("organization_social_integrations")
      .select("id, platform, token_envelope, token_expires_at, is_connected")
      .eq("organizer_account_id", admin.profileId)
      .eq("is_connected", true)

    if (platform) query = query.eq("platform", platform)

    const { data: rows, error: listError } = await query
    if (listError) {
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 })
    }

    const eligible = (rows || []).some(
      (row: { token_envelope?: unknown }) => !!row.token_envelope,
    )
    if (!eligible) {
      return NextResponse.json(
        { success: false, error: "OAuth required for analytics. Connect a platform first." },
        { status: 400 },
      )
    }

    const fnUrl = `${supabaseUrl}/functions/v1/social-analytics`
    const response = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        scope: "organization",
        organizer_account_id: admin.profileId,
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: payload.error || "Analytics sync failed",
          details: payload,
        },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      syncedBy: user.id,
      organizerAccountId: admin.profileId,
      ...payload,
    })
  },
)
