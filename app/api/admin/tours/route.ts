import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import {
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"
import { TourMetadataVersionConflictError } from "@/lib/admin/tour-metadata-version-diff"
import { withTourListTelemetry } from "@/lib/admin/tour-observability"
import { withAdminCapability, withOrgCommand } from "@/lib/auth/api-auth"

const deleteTourSchema = z.object({
  id: z.string().uuid().optional(),
  tour_id: z.string().uuid().optional(),
}).refine((value) => Boolean(value.id || value.tour_id), {
  message: "Missing tour id",
})

export const GET = withAdminCapability("tour.view", async (request: NextRequest, { supabase, user, admin }) => {
  return withTourListTelemetry({
    endpoint: "/api/admin/tours",
    orgId: admin.orgId,
    userId: user.id,
    correlationId: admin.correlationId,
    isLegacy: false,
    getStatus: (response) => response.status,
    run: async () => {
      try {
        const { searchParams } = new URL(request.url)
        const { orgId, page, tours } = await AdminTourEventOperationsService.listTourPortfolio({
          supabase,
          userId: user.id,
          orgId: admin.orgId,
          query: searchParams,
          capabilities: admin.capabilities,
          allowedTourIds: admin.scope === "tour_collaborator" ? admin.allowedTourIds : undefined,
        })
        return NextResponse.json({
          success: true,
          orgId,
          tours,
          page: {
            totalCount: page.totalCount,
            nextCursor: page.nextCursor,
            limit: page.limit,
            sort: page.sort,
            order: page.order,
            filters: page.filters,
          },
        })
      } catch (error: any) {
        const code = error?.code || error?.details?.code
        if (code === "42P01" || code === "PGRST204" || code === "PGRST205") {
          return NextResponse.json({
            success: true,
            tours: [],
            page: {
              totalCount: 0,
              nextCursor: null,
              limit: 50,
              sort: "start_date",
              order: "asc",
              filters: {
                status: "all",
                q: "",
                start_from: null,
                start_to: null,
                tag: [],
                owner: null,
                lead: null,
              },
            },
          })
        }
        const status = getAdminTourEventErrorStatus(error, 500)
        console.error("[Admin Tours API] GET error:", error)
        return NextResponse.json(
          { success: false, error: error.message || "Failed to load tours", tours: [], code: error?.code },
          { status },
        )
      }
    },
  })
})

export const POST = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => null)
    const tour = await AdminTourEventOperationsService.createTour({
      supabase,
      userId: user.id,
      input: body,
      orgId: admin.orgId,
    })
    return NextResponse.json({ success: true, tour }, { status: 201 })
  } catch (error: any) {
    const status = getAdminTourEventErrorStatus(error, 500)
    console.error("[Admin Tours API] POST error:", error)
    return NextResponse.json({ success: false, error: error.message || "Failed to create tour" }, { status })
  }
})

export const PATCH = withAdminCapability("tour.manage", async (request: NextRequest, { supabase, user, admin }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const tourId = body.id || body.tour_id
    if (!tourId) return NextResponse.json({ success: false, error: "Missing tour id" }, { status: 400 })
    const tour = await AdminTourEventOperationsService.updateTour({
      supabase,
      userId: user.id,
      tourId,
      input: body,
      orgId: admin.orgId,
      capabilities: admin.capabilities,
    })
    return NextResponse.json({ success: true, tour })
  } catch (error: any) {
    if (error instanceof TourMetadataVersionConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          expectedVersion: error.expectedVersion,
          currentVersion: error.currentVersion,
          diff: error.diff,
          tour: error.serverTour,
        },
        { status: 409 },
      )
    }
    const status = getAdminTourEventErrorStatus(error, 500)
    return NextResponse.json({ success: false, error: error.message || "Failed to update tour" }, { status })
  }
})

export const DELETE = withOrgCommand({
  capability: "tour.delete",
  schema: deleteTourSchema,
  commandName: "admin.tours.delete",
  target: {
    kind: "entity",
    type: "tour",
    id: (input) => String(input.id || input.tour_id),
  },
  readInput: async (request) => {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    return {
      id: url.searchParams.get("id") || body.id || undefined,
      tour_id: url.searchParams.get("tour_id") || body.tour_id || undefined,
    }
  },
  handler: async ({ auth, context, input }) => {
    try {
      const tourId = String(input.id || input.tour_id)
      const result = await AdminTourEventOperationsService.deleteTour({
        supabase: auth.supabase,
        userId: auth.user.id,
        tourId,
        orgId: context.orgId,
        capabilities: context.capabilities,
      })
      return NextResponse.json(result)
    } catch (error: any) {
      const status = getAdminTourEventErrorStatus(error, 500)
      return NextResponse.json(
        { success: false, error: error.message || "Failed to delete tour" },
        { status },
      )
    }
  },
})
