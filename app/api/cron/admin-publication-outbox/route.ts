import { NextRequest, NextResponse } from "next/server"

import { processPublicationOutboxBatch } from "@/lib/admin/publication-outbox.service"
import "@/lib/admin/command-center-projection.service"
import { isAuthorizedCronRequest, unauthorizedResponse } from "@/lib/auth/route-guards"
import { listServiceRoleJobOrgIds } from "@/lib/supabase/service-role-job"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** PUB-101 — Idempotent publication outbox worker tick. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return unauthorizedResponse()

  const workerId = `cron-pub-outbox-${process.env.VERCEL_REGION ?? "local"}-${Date.now()}`
  const limitRaw = Number(new URL(request.url).searchParams.get("limit") ?? "25")
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 25

  try {
    const orgIds = await listServiceRoleJobOrgIds({
      reason: "Discover organizations with pending publication outbox work",
      moduleId: "admin.publication.outbox",
      lookup: async (client) => {
        const now = new Date()
        const staleClaim = new Date(now.getTime() - 15 * 60 * 1000)
        const { data, error } = await client
          .from("admin_publication_outbox")
          .select("org_id")
          .or(
            `and(status.in.(pending,failed),available_at.lte.${now.toISOString()}),and(status.eq.processing,locked_at.lt.${staleClaim.toISOString()})`,
          )
          .order("available_at", { ascending: true })
          .limit(Math.max(limit * 4, 100))
        if (error) throw new Error(error.message)
        return (data ?? []).map((row) => String(row.org_id)).filter(Boolean)
      },
    })

    const results: Awaited<ReturnType<typeof processPublicationOutboxBatch>> = []
    for (const orgId of orgIds) {
      const remaining = limit - results.length
      if (remaining <= 0) break
      results.push(...await processPublicationOutboxBatch({ orgId, workerId, limit: remaining }))
    }
    const delivered = results.filter((r) => r.outcome === "delivered").length
    const failed = results.filter((r) => r.outcome === "failed").length
    const dead = results.filter((r) => r.outcome === "dead").length

    return NextResponse.json({
      success: true,
      workerId,
      claimed: results.length,
      delivered,
      failed,
      dead,
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Outbox worker failed"
    console.error("[admin-publication-outbox]", message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
