import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * CONT-501..506 — Contract workspace: templates, drafts, review, signing, amendments.
 */
export const GET = withAdminCapability(
  "contract.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const status = searchParams.get("status")
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)

      let query = supabase
        .from("contracts")
        .select("id, org_id, vendor_id, counterparty_name, title, status, contract_type, signed_at, expires_at, created_at, updated_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (status) query = query.eq("status", status)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, contracts: [], unavailable: true, unavailableReason: "Contracts table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const contracts = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          vendorId: r.vendor_id ? String(r.vendor_id) : null,
          counterpartyName: r.counterparty_name ? String(r.counterparty_name) : null,
          title: String(r.title ?? "Contract"),
          status: String(r.status ?? "draft"),
          contractType: r.contract_type ? String(r.contract_type) : null,
          signedAt: r.signed_at ? String(r.signed_at) : null,
          expiresAt: r.expires_at ? String(r.expires_at) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      const summary = {
        total: contracts.length,
        draft: contracts.filter((c) => c.status === "draft").length,
        under_review: contracts.filter((c) => c.status === "under_review").length,
        signed: contracts.filter((c) => c.status === "signed").length,
        expired: contracts.filter((c) => c.status === "expired").length,
      }

      return NextResponse.json({ success: true, contracts, summary, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, contracts: [], unavailable: true, unavailableReason: "Contracts table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Contracts unavailable" }, { status: 503 })
    }
  },
)
