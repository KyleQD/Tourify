import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import { presentTourMember, presentTourVendor, spreadsheetCsvCell } from "@/lib/admin/tour-collaboration"
import { renderTourReportPdf, type TourReportData } from "@/lib/admin/tour-export-document"
import { withAdminCapability } from "@/lib/auth/api-auth"
import { requireAdminCapability } from "@/lib/auth/admin-context"

export const runtime = "nodejs"

const formatSchema = z.enum(["pdf", "csv"])
const allowedSections = new Set(["tourInfo", "events", "team", "vendors", "finances"])

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

function safeFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "tour"
}

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const url = new URL(request.url)
    const tourId = extractTourId(request.url)
    if (!tourId) return NextResponse.json({ error: "Missing tour id" }, { status: 400 })
    const format = formatSchema.parse(url.searchParams.get("format") || "pdf")
    const requestedSections = (url.searchParams.get("sections") || "tourInfo,events,team,vendors,finances")
      .split(",")
      .map(section => section.trim())
      .filter(section => allowedSections.has(section))
    const sections = new Set(requestedSections.length > 0 ? requestedSections : ["tourInfo", "events"])

    for (const [section, capability] of [
      ["team", "workforce.view"],
      ["vendors", "vendor.view"],
      ["finances", "finance.view"],
    ] as const) {
      if (!sections.has(section)) continue
      const denied = requireAdminCapability(admin, capability)
      if (denied) return denied
    }

    const tour = await assertAdminTourAccess({ supabase, userId: user.id, tourId, orgId: admin.orgId }) as Record<string, any>
    const [eventResult, teamResult, vendorResult, financeResult] = await Promise.all([
      sections.has("events") || sections.has("tourInfo")
        ? supabase
            .from("tour_events")
            .select("ordinal, events_v2(id, title, start_at, venue_id, capacity, settings)")
            .eq("tour_id", tourId)
            .order("ordinal", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      sections.has("team")
        ? supabase.from("tour_team_members").select("*").eq("tour_id", tourId).order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      sections.has("vendors")
        ? supabase.from("tour_vendors").select("*").eq("tour_id", tourId).order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      sections.has("finances")
        ? supabase.from("financial_transactions").select("type, amount, category, description, transaction_date").eq("tour_id", tourId)
        : Promise.resolve({ data: [], error: null }),
    ])
    for (const result of [eventResult, teamResult, vendorResult, financeResult]) {
      if (result.error) throw new Error(result.error.message)
    }

    const events: TourReportData["events"] = (eventResult.data ?? []).flatMap((link: any) => {
      const event = link.events_v2
      if (!event) return []
      const settings = event.settings && typeof event.settings === "object" ? event.settings : {}
      return [{
        title: String(event.title || "Event"),
        date: String(event.start_at || ""),
        venue: String(settings.venue_label || "TBD"),
        capacity: event.capacity == null ? null : Number(event.capacity),
      }]
    })
    const team: TourReportData["team"] = (teamResult.data ?? []).map((row: Record<string, unknown>) => {
      const member = presentTourMember(row)
      return { name: member.name, role: member.role, status: member.status }
    })
    const vendors: TourReportData["vendors"] = (vendorResult.data ?? []).map((row: Record<string, unknown>) => {
      const vendor = presentTourVendor(row)
      return {
        name: vendor.name,
        type: vendor.type,
        status: vendor.status,
        amount: vendor.contract_amount == null ? null : Number(vendor.contract_amount),
      }
    })
    const transactions: Array<{
      type: string | null
      amount: number | string | null
      category: string | null
      description: string | null
      transaction_date: string | null
    }> = financeResult.data ?? []
    const income = transactions.filter((row: any) => row.type === "income").reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0)
    const expenses = transactions.filter((row: any) => row.type === "expense").reduce((sum: number, row: any) => sum + (Number(row.amount) || 0), 0)
    const settings = tour.settings && typeof tour.settings === "object" ? tour.settings : {}
    const report: TourReportData = {
      tour: {
        name: String(tour.name || "Tour"),
        artist: String(tour.main_artist || tour.artist || settings.main_artist || ""),
        genre: String(tour.genre || settings.genre || ""),
        description: String(tour.description || ""),
        status: String(tour.status || "planning"),
        startDate: String(tour.start_date || tour.startDate || ""),
        endDate: String(tour.end_date || tour.endDate || ""),
      },
      sections,
      events,
      team,
      vendors,
      finances: { income, expenses },
      generatedAt: new Date().toISOString(),
    }
    const filename = safeFilename(report.tour.name)

    if (format === "pdf") {
      const pdf = await renderTourReportPdf(report)
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}-report.pdf"`,
          "Cache-Control": "private, no-store",
        },
      })
    }

    const rows: unknown[][] = [["Section", "Name", "Role or type", "Date", "Venue", "Status", "Amount", "Notes"]]
    if (sections.has("tourInfo")) {
      rows.push([
        "Tour",
        report.tour.name,
        [report.tour.artist, report.tour.genre].filter(Boolean).join(" · "),
        [report.tour.startDate, report.tour.endDate].filter(Boolean).join(" – "),
        "",
        report.tour.status,
        "",
        [report.tour.description, `Shows: ${events.length}`].filter(Boolean).join(" | "),
      ])
    }
    if (sections.has("events")) {
      events.forEach(event => rows.push(["Event", event.title, "", event.date, event.venue, "", "", event.capacity == null ? "" : `Capacity: ${event.capacity}`]))
    }
    if (sections.has("team")) {
      team.forEach(member => rows.push(["Team", member.name, member.role, "", "", member.status, "", ""]))
    }
    if (sections.has("vendors")) {
      vendors.forEach(vendor => rows.push(["Vendor", vendor.name, vendor.type, "", "", vendor.status, vendor.amount ?? "", ""]))
    }
    if (sections.has("finances")) {
      transactions.forEach(transaction => rows.push([
        "Finance",
        transaction.description || transaction.category || transaction.type,
        transaction.type,
        transaction.transaction_date || "",
        "",
        "",
        transaction.amount ?? "",
        transaction.category || "",
      ]))
    }
    const csv = rows.map(row => row.map(spreadsheetCsvCell).join(",")).join("\r\n")
    return new NextResponse(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}-report.csv"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid export request", details: error.issues }, { status: 400 })
    }
    const resolved = adminAccessErrorResponse(error, "Failed to export tour", 500)
    return NextResponse.json({ error: resolved.message }, { status: resolved.status })
  }
})
