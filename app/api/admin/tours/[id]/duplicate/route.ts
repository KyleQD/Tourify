import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "crypto"

import { adminAccessErrorResponse, assertAdminTourAccess } from "@/lib/admin/admin-tour-event-access"
import {
  getTourDuplicateJob,
  runTourDuplicateJobToCompletion,
  startTourDuplicateJob,
  stepTourDuplicateJob,
} from "@/lib/admin/tour-duplicate-job.service"
import { TOUR_DUPLICATE_DOMAINS } from "@/lib/admin/tour-duplicate-preview"
import { withAdminCapability } from "@/lib/auth/api-auth"

const selectionSchema = z
  .object(
    Object.fromEntries(TOUR_DUPLICATE_DOMAINS.map((domain) => [domain, z.boolean().optional()])),
  )
  .partial()

const bodySchema = z.object({
  planToken: z.string().min(1),
  proposedName: z.string().trim().min(1).max(200).optional(),
  selection: selectionSchema.optional(),
  idempotencyKey: z.string().trim().min(8).max(200).optional(),
  /** When false, start job and return without stepping (cron/resume). Default true. */
  runToCompletion: z.boolean().optional().default(true),
  maxSteps: z.number().int().min(1).max(20).optional(),
})

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split("/")
  const index = segments.indexOf("tours")
  return index >= 0 ? segments[index + 1] || null : null
}

function resolveIdempotencyKey(request: NextRequest, bodyKey?: string): string {
  const header =
    request.headers.get("idempotency-key")
    || request.headers.get("Idempotency-Key")
  if (header && header.trim()) return header.trim()
  if (bodyKey && bodyKey.trim()) return bodyKey.trim()
  return randomUUID()
}

/**
 * TOUR-206 — Start / run idempotent tour duplication job.
 */
export const POST = withAdminCapability(
  "tour.manage",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId)
        return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

      const parsed = bodySchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.flatten() },
          { status: 400 },
        )
      }

      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
      })

      const idempotencyKey = resolveIdempotencyKey(request, parsed.data.idempotencyKey)
      const { job, created } = await startTourDuplicateJob({
        supabase,
        userId: user.id,
        orgId: admin.orgId,
        sourceTourId: tourId,
        planToken: parsed.data.planToken,
        idempotencyKey,
        correlationId: admin.correlationId,
        proposedName: parsed.data.proposedName,
        selection: parsed.data.selection,
      })

      let result = job
      if (parsed.data.runToCompletion) {
        if (job.status === "queued" || job.status === "running" || job.status === "paused") {
          result = await runTourDuplicateJobToCompletion({
            supabase,
            jobId: job.id,
            orgId: admin.orgId,
            userId: user.id,
            maxSteps: parsed.data.maxSteps,
          })
        }
      } else if (job.status === "queued") {
        result = await stepTourDuplicateJob({
          supabase,
          jobId: job.id,
          orgId: admin.orgId,
          userId: user.id,
        })
      }

      const response = NextResponse.json({
        success: true,
        created,
        job: result,
        targetTourId: result.target_tour_id,
        domainStatus: result.domain_status,
        meta: {
          tourId,
          orgId: admin.orgId,
          correlationId: admin.correlationId,
          idempotencyKey,
        },
      })
      response.headers.set("x-correlation-id", admin.correlationId)
      response.headers.set("Idempotency-Key", idempotencyKey)
      return response
    } catch (error: unknown) {
      const resolved = adminAccessErrorResponse(error, "Failed to execute tour duplication", 500)
      return NextResponse.json(
        { success: false, error: resolved.message },
        { status: resolved.status },
      )
    }
  },
)

/**
 * TOUR-206 — Poll duplication job status (?jobId=).
 */
export const GET = withAdminCapability(
  "tour.view",
  async (request: NextRequest, { supabase, user, admin }) => {
    try {
      const tourId = extractTourId(request.url)
      if (!tourId)
        return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })

      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId,
        orgId: admin.orgId,
      })

      const jobId = new URL(request.url).searchParams.get("jobId")
      if (!jobId)
        return NextResponse.json({ success: false, error: "Missing jobId" }, { status: 400 })

      const job = await getTourDuplicateJob({
        supabase,
        orgId: admin.orgId,
        jobId,
      })
      if (!job || job.source_tour_id !== tourId) {
        return NextResponse.json({ success: false, error: "Duplicate job not found" }, { status: 404 })
      }

      const response = NextResponse.json({
        success: true,
        job,
        targetTourId: job.target_tour_id,
        domainStatus: job.domain_status,
      })
      response.headers.set("x-correlation-id", admin.correlationId)
      return response
    } catch (error: unknown) {
      const resolved = adminAccessErrorResponse(error, "Failed to load duplicate job", 500)
      return NextResponse.json(
        { success: false, error: resolved.message },
        { status: resolved.status },
      )
    }
  },
)
