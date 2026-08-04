import { NextRequest, NextResponse } from "next/server"

import { withAdminAuth, withAdminCapability } from "@/lib/auth/api-auth"
import { resolveActingAdminContext } from "@/lib/auth/admin-context"
import { hasAdminCapability } from "@/lib/auth/admin-capabilities"

/**
 * B1 — Org Display Config (settings tab).
 *
 * GET  — withAdminAuth  → returns org identity + settings (timeZone, baseCurrency)
 *        with canEdit: boolean computed from org.settings.manage capability.
 * PATCH — withAdminCapability("org.settings.manage") → upsert admin_org_settings with version check.
 */

// ─── GET ─────────────────────────────────────────────────────────────────────

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  try {
    const { supabase } = auth
    const admin = await resolveActingAdminContext(request, auth)
    if (admin instanceof NextResponse) return admin

    const { orgId, profileId, capabilities } = admin
    const canEdit = hasAdminCapability(capabilities, "org.settings.manage")

    // Fetch org identity from organizer_accounts
    const { data: profile, error: profileError } = await supabase
      .from("organizer_accounts")
      .select("id, organization_name, organization_type, subtype, url_slug")
      .eq("id", profileId)
      .maybeSingle()

    if (profileError) {
      console.error("[Admin Org Settings GET] profile error", profileError)
      return NextResponse.json(
        { error: "Unable to load organization profile.", code: "profile_unavailable" },
        { status: 503 },
      )
    }

    const row = profile as Record<string, unknown> | null

    // Try to fetch settings from admin_org_settings (table may not exist yet)
    let timeZone: string | null = null
    let baseCurrency: string | null = null
    let version: number | null = null
    let settingsUnavailable = false
    let settingsUnavailableReason: string | undefined

    const { data: settingsRow, error: settingsError } = await supabase
      .from("admin_org_settings")
      .select("time_zone, base_currency, version")
      .eq("org_id", orgId)
      .maybeSingle()

    if (settingsError) {
      if (settingsError.code === "42P01" || settingsError.message?.includes("does not exist")) {
        settingsUnavailable = true
        settingsUnavailableReason = "admin_org_settings table not yet migrated."
      } else {
        console.error("[Admin Org Settings GET] settings error", settingsError)
        settingsUnavailable = true
        settingsUnavailableReason = settingsError.message
      }
    } else if (settingsRow) {
      const s = settingsRow as Record<string, unknown>
      timeZone = s.time_zone ? String(s.time_zone) : null
      baseCurrency = s.base_currency ? String(s.base_currency) : null
      version = s.version != null ? Number(s.version) : null
    }

    return NextResponse.json({
      success: true,
      orgId,
      profileId,
      organizationName: row?.organization_name ? String(row.organization_name) : null,
      organizationType: row?.organization_type ? String(row.organization_type) : null,
      subtype: row?.subtype ? String(row.subtype) : null,
      urlSlug: row?.url_slug ? String(row.url_slug) : null,
      timeZone,
      baseCurrency,
      version,
      canEdit,
      settingsUnavailable,
      ...(settingsUnavailableReason ? { settingsUnavailableReason } : {}),
      freshAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[Admin Org Settings GET]", err)
    return NextResponse.json({ error: "Settings unavailable.", code: "settings_failed" }, { status: 503 })
  }
})

// ─── PATCH ────────────────────────────────────────────────────────────────────

export const PATCH = withAdminCapability(
  "org.settings.manage",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const { orgId } = admin
      const body = (await request.json()) as {
        timeZone?: string
        baseCurrency?: string
        expectedVersion: number
      }

      const { timeZone, baseCurrency, expectedVersion } = body

      if (expectedVersion == null || typeof expectedVersion !== "number") {
        return NextResponse.json(
          { error: "expectedVersion (number) is required.", code: "validation_failed" },
          { status: 400 },
        )
      }

      // Check for existing row and version
      const { data: existing, error: fetchError } = await supabase
        .from("admin_org_settings")
        .select("version")
        .eq("org_id", orgId)
        .maybeSingle()

      if (fetchError) {
        if (fetchError.code === "42P01" || fetchError.message?.includes("does not exist")) {
          return NextResponse.json(
            {
              success: false,
              settingsUnavailable: true,
              settingsUnavailableReason: "admin_org_settings table not yet migrated.",
            },
            { status: 503 },
          )
        }
        throw new Error(fetchError.message)
      }

      // Version conflict check
      const currentVersion = existing ? Number((existing as Record<string, unknown>).version) : 0
      if (existing && currentVersion !== expectedVersion) {
        return NextResponse.json(
          { error: "Settings changed elsewhere — please reload", code: "version_conflict" },
          { status: 409 },
        )
      }

      const nextVersion = currentVersion + 1
      const upsertPayload: Record<string, unknown> = {
        org_id: orgId,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      }
      if (timeZone !== undefined) upsertPayload.time_zone = timeZone
      if (baseCurrency !== undefined) upsertPayload.base_currency = baseCurrency

      const { data: saved, error: upsertError } = await supabase
        .from("admin_org_settings")
        .upsert(upsertPayload, { onConflict: "org_id" })
        .select("time_zone, base_currency, version")
        .single()

      if (upsertError) {
        if (upsertError.code === "42P01" || upsertError.message?.includes("does not exist")) {
          return NextResponse.json(
            {
              success: false,
              settingsUnavailable: true,
              settingsUnavailableReason: "admin_org_settings table not yet migrated.",
            },
            { status: 503 },
          )
        }
        throw new Error(upsertError.message)
      }

      const s = saved as Record<string, unknown>
      return NextResponse.json({
        success: true,
        timeZone: s.time_zone ? String(s.time_zone) : null,
        baseCurrency: s.base_currency ? String(s.base_currency) : null,
        version: Number(s.version),
        freshAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error("[Admin Org Settings PATCH]", err)
      return NextResponse.json({ error: "Failed to save settings.", code: "settings_save_failed" }, { status: 503 })
    }
  },
)
