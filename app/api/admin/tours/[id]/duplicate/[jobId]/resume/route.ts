import { NextRequest, NextResponse } from "next/server"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import {
  getTourDuplicateJob,
  stepTourDuplicateJob,
} from "@/lib/admin/tour-duplicate-job.service"
import { withAdminCapability } from "@/lib/auth/api-auth"

function extractIds(url: string): { tourId: string | null; jobId: string | null } {
  const segments = new URL(url).pathname.split("/")
  const toursIndex = segments.indexOf("tours")
  const tourId = toursIndex >= 0 ? segments[toursIndex + 1] || null : null
  const duplicateIndex = segments.indexOf("duplicate")
  const jobId = duplicateIndex >= 0 ? segments[duplicateIndex + 1] || null : null
  return { tourId, jobId }
}

/**
 * TOUR-206 — Resume one domain step on a paused/failed/running job.
 */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const { tourId, jobId } = extractIds(request.url)
      if (!tourId || !jobId) {
        return NextResponse.json(
          { success: false, error: "Missing tour id or job id" },
          { status: 400 },
        )
      }

      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
      })

      const existing = await getTourDuplicateJob({
        supabase,
        orgId: admin.orgId,
        jobId,
      })
      if (!existing || existing.source_tour_id !== tourId) {
        return NextResponse.json({ success: false, error: "Duplicate job not found" }, { status: 404 })
      }

      // Allow resume of failed domains by resetting the current failed domain to pending.
      if (existing.status === "failed" && existing.current_domain) {
        const domainStatus = { ...existing.domain_status }
        const current = domainStatus[existing.current_domain]
        if (current?.status === "failed") {
          domainStatus[existing.current_domain] = {
            ...current,
            status: "pending",
            error: null,
          }
          await supabase
            .from("tour_duplicate_jobs")
            .update({
              status: "queued",
              domain_status: domainStatus,
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId)
            .eq("org_id", admin.orgId)
        }
      }

      const job = await stepTourDuplicateJob({
        supabase,
        jobId,
        orgId: admin.orgId,
        userId: user.id,
      })

      const response = NextResponse.json({
        success: true,
        job,
        targetTourId: job.target_tour_id,
        domainStatus: job.domain_status,
      })
      response.headers.set("x-correlation-id", admin.correlationId)
      return response
    } catch (error: unknown) {
      const resolved = adminAccessErrorResponse(error, "Failed to resume duplicate job", 500)
      return NextResponse.json(
        { success: false, error: resolved.message },
        { status: resolved.status },
      )
    }
  },
)
