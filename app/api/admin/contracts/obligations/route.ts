import { NextRequest, NextResponse } from "next/server"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { OrgEntityAccessError } from "@/lib/admin/org-entity-access"

/**
 * CONT-507 / CONT-508 — Contract obligations, evidence, reminders, and finance links.
 */
export const GET = withAdminCapability(
  "contract.view",
  async (request: NextRequest, { supabase, admin }) => {
    try {
      const orgId = admin.orgId
      const { searchParams } = request.nextUrl
      const contractId = searchParams.get("contract_id")
      const status = searchParams.get("status")

      let query = supabase
        .from("contract_obligations")
        .select("id, org_id, contract_id, obligation_type, description, due_date, status, responsible_party, evidence_note, created_at")
        .eq("org_id", orgId)
        .order("due_date", { ascending: true })
        .limit(100)

      if (contractId) query = query.eq("contract_id", contractId)
      if (status) query = query.eq("status", status)

      const { data, error } = await query

      if (error) {
        if (error.code === "42P01") {
          return NextResponse.json({ success: true, obligations: [], unavailable: true, unavailableReason: "Contract obligations table not yet migrated.", freshAt: new Date().toISOString() })
        }
        throw new Error(error.message)
      }

      const obligations = ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>
        return {
          id: String(r.id), orgId: String(r.org_id),
          contractId: r.contract_id ? String(r.contract_id) : null,
          obligationType: String(r.obligation_type ?? "milestone"),
          description: r.description ? String(r.description) : null,
          dueDate: r.due_date ? String(r.due_date) : null,
          status: String(r.status ?? "pending"),
          responsibleParty: r.responsible_party ? String(r.responsible_party) : null,
          evidenceNote: r.evidence_note ? String(r.evidence_note) : null,
          createdAt: String(r.created_at ?? ""),
        }
      })

      const now = new Date()
      const overdue = obligations.filter((o) => o.dueDate && new Date(o.dueDate) < now && !["fulfilled", "waived"].includes(o.status)).length

      return NextResponse.json({ success: true, obligations, overdue, freshAt: new Date().toISOString() })
    } catch (error) {
      if (error instanceof OrgEntityAccessError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
      }
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes("relation") && msg.includes("does not exist")) {
        return NextResponse.json({ success: true, obligations: [], unavailable: true, unavailableReason: "Contract obligations table not yet migrated.", freshAt: new Date().toISOString() })
      }
      return NextResponse.json({ error: "Obligations unavailable" }, { status: 503 })
    }
  },
)
