import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * EXP-603 — Tour book: web/PDF tour book with version/checksum.
 */
export const GET = withAdminCapability(
  "tour.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const tourId = request.nextUrl.searchParams.get("tour_id")

      let query = supabase
        .from("tour_book_exports")
        .select("id, org_id, tour_id, version, checksum, sections_included, status, file_url, created_at, expires_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (tourId) query = query.eq("tour_id", tourId)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, books: [], unavailable: true, unavailableReason: "Tour book exports table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const books = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          version: Number(r.version ?? 1),
          checksum: r.checksum ? String(r.checksum) : null,
          sectionsIncluded: Array.isArray(r.sections_included) ? r.sections_included : [],
          status: String(r.status ?? "generating"),
          fileUrl: r.file_url ? String(r.file_url) : null,
          createdAt: String(r.created_at ?? ""),
          expiresAt: r.expires_at ? String(r.expires_at) : null,
        }
      })

      return NextResponse.json({ success: true, books, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, books: [], unavailable: true, unavailableReason: "Tour book exports table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Tour book unavailable" }, { status: 503 })
    }
  },
)
