import { NextRequest, NextResponse } from "next/server"

import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * TRAVEL-501 / TRAVEL-502 — Travel provider documents.
 * Lists provider documents for the acting org; sensitive documents
 * require logistics.sensitive capability.
 */
export const GET = withAdminCapability(
  "logistics.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const tourId = searchParams.get("tour_id")
      const eventId = searchParams.get("event_id")
      const isSensitive = admin.capabilities?.includes("logistics.sensitive") ?? false
      const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)

      let query = supabase
        .from("travel_documents")
        .select("id, org_id, tour_id, event_id, segment_id, document_type, provider, file_name, is_sensitive, upload_status, matched, created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (!isSensitive) {
        query = query.eq("is_sensitive", false)
      }
      if (tourId) query = query.eq("tour_id", tourId)
      if (eventId) query = query.eq("event_id", eventId)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({
            success: true,
            documents: [],
            unavailable: true,
            unavailableReason: "Travel documents table not yet migrated.",
            freshAt: new Date().toISOString(),
          })
        }
        throw new Error(error.message)
      }

      const documents = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id),
          orgId: String(r.org_id),
          tourId: r.tour_id ? String(r.tour_id) : null,
          eventId: r.event_id ? String(r.event_id) : null,
          segmentId: r.segment_id ? String(r.segment_id) : null,
          documentType: String(r.document_type ?? "confirmation"),
          provider: r.provider ? String(r.provider) : null,
          fileName: String(r.file_name ?? ""),
          isSensitive: Boolean(r.is_sensitive),
          uploadStatus: String(r.upload_status ?? "pending"),
          matched: Boolean(r.matched),
          createdAt: String(r.created_at ?? ""),
        }
      })

      const unmatched = documents.filter((d) => !d.matched)

      return NextResponse.json({
        success: true,
        documents,
        unmatched: unmatched.length,
        freshAt: new Date().toISOString(),
      })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({
          success: true,
          documents: [],
          unavailable: true,
          unavailableReason: "Travel documents table not yet migrated.",
          freshAt: new Date().toISOString(),
        })
      }
      console.error("[Admin Travel Documents]", error)
      return NextResponse.json({ error: "Travel documents unavailable" }, { status: 503 })
    }
  },
)
