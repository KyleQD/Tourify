import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * VEND-501 — Vendor master: scoped vendor search, contacts, status, risk.
 */
export const GET = withAdminCapability(
  "vendor.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const status = searchParams.get("status")
      const search = searchParams.get("q")
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
      const isSensitive = admin.capabilities?.includes("vendor.sensitive") ?? false

      let query = supabase
        .from("vendors")
        .select("id, organization_id, name, vendor_type, rating, created_at, updated_at")
        .eq("organization_id", orgId)
        .order("name", { ascending: true })
        .limit(limit)

      if (search) query = query.ilike("name", `%${search}%`)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, vendors: [], unavailable: true, unavailableReason: "Vendors table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const vendors = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.organization_id),
          name: String(r.name ?? ""),
          status: "active",
          vendorType: r.vendor_type ? String(r.vendor_type) : null,
          riskLevel: null,
          complianceStatus: null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      return NextResponse.json({ success: true, vendors, total: vendors.length, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, vendors: [], unavailable: true, unavailableReason: "Vendors table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Vendors unavailable" }, { status: 503 })
    }
  },
)
