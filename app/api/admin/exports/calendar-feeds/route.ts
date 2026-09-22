import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * EXP-604 — Calendar feeds: scoped token feeds with stable UID and revocation.
 */
export const GET = withAdminCapability(
  "content.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId

      const { data, error } = await supabase
        .from("calendar_feed_tokens")
        .select("id, org_id, scope, status, audience_class, created_by, created_at, expires_at, last_used_at, revoked_at, revoke_reason")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50)

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, tokens: [], unavailable: true, unavailableReason: "Calendar feed tokens table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const tokens = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          scope: r.scope ? String(r.scope) : null,
          status: String(r.status ?? "active"),
          audienceClass: r.audience_class ? String(r.audience_class) : null,
          createdBy: r.created_by ? String(r.created_by) : null,
          createdAt: String(r.created_at ?? ""),
          expiresAt: r.expires_at ? String(r.expires_at) : null,
          lastUsedAt: r.last_used_at ? String(r.last_used_at) : null,
          revokedAt: r.revoked_at ? String(r.revoked_at) : null,
          revokeReason: r.revoke_reason ? String(r.revoke_reason) : null,
        }
      })

      const active = tokens.filter((t) => t.status === "active").length
      const expired = tokens.filter((t) => t.status === "expired" || (t.expiresAt && new Date(t.expiresAt) < new Date())).length

      return NextResponse.json({ success: true, tokens, active, expired, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, tokens: [], unavailable: true, unavailableReason: "Calendar feed tokens table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Calendar feeds unavailable" }, { status: 503 })
    }
  },
)
