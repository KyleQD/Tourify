import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { withAdminCapability } from "@/lib/auth/api-auth"

const revokeSchema = z.object({
  userId: z.string().uuid(),
})

/**
 * SEC-102, SEC-604 — Org membership workspace.
 * GET: List all active org members with role/status.
 * DELETE: Immediately revoke a member (subject to owner invariant).
 */
export const GET = withAdminCapability(
  "org.roles.manage",
  async (_request, { supabase, admin }) => {
    try {
      const { data, error } = await supabase
        .from("org_members")
        .select("user_id, role, status, invited_by, invited_at, activated_at, revoked_at, updated_at")
        .eq("org_id", admin.orgId)
        .order("activated_at", { ascending: false })
        .limit(200)

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            members: [],
            unavailable: true,
            unavailableReason: "Org members table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const members = (data ?? []).map((row: Record<string, unknown>) => ({
        userId: String(row.user_id),
        role: String(row.role ?? "member"),
        status: String(row.status ?? "active"),
        invitedBy: row.invited_by ? String(row.invited_by) : null,
        invitedAt: row.invited_at ? String(row.invited_at) : null,
        activatedAt: row.activated_at ? String(row.activated_at) : null,
        revokedAt: row.revoked_at ? String(row.revoked_at) : null,
      }))

      return NextResponse.json({
        success: true,
        members,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          members: [],
          unavailable: true,
          unavailableReason: "Org members table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin RBAC Members GET]", error)
      return NextResponse.json({ error: "Unable to load members" }, { status: 503 })
    }
  },
)

export const DELETE = withAdminCapability(
  "org.roles.manage",
  async (request: NextRequest, { supabase, admin, user }) => {
    try {
      const body = await request.json().catch(() => ({}))
      const parsed = revokeSchema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json({ error: "userId required" }, { status: 400 })
      }

      const { userId } = parsed.data
      if (userId === user.id) {
        return NextResponse.json({ error: "You cannot revoke your own membership." }, { status: 422 })
      }

      // Check owner invariant — cannot revoke the org owner
      const { data: target } = await supabase
        .from("org_members")
        .select("role, status")
        .eq("org_id", admin.orgId)
        .eq("user_id", userId)
        .maybeSingle()

      if (!target) {
        return NextResponse.json({ error: "Member not found in this organization." }, { status: 404 })
      }
      if (String(target.role) === "owner") {
        return NextResponse.json({ error: "The organization owner cannot be revoked." }, { status: 422 })
      }

      const { error } = await supabase
        .from("org_members")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("org_id", admin.orgId)
        .eq("user_id", userId)

      if (error) throw new Error(error.message)

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error("[Admin RBAC Members DELETE]", error)
      return NextResponse.json({ error: "Failed to revoke membership" }, { status: 500 })
    }
  },
)
