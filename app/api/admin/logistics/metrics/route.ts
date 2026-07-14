import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import {
  applyOrgLogisticsTaskFilter,
  resolveAuthorizedOrgLogisticsScope,
} from '@/lib/admin/resolve-authorized-org'

export async function GET(request: NextRequest) {
  return withAdminAuth(async (_req, { user }) => {
    try {
      const { searchParams } = new URL(request.url)
      const eventId = searchParams.get('eventId')
      const tourId = searchParams.get('tourId')
      const requestedOrgId = searchParams.get('orgId')

      const scope = await resolveAuthorizedOrgLogisticsScope({
        userId: user.id,
        requestedOrgId,
        eventId,
        tourId,
      })
      const supabase = scope.service

      const types = ['transportation', 'equipment', 'backline', 'lodging', 'catering', 'communication', 'rental']
      const metrics: Record<string, any> = {}

      for (const t of types) {
        let query = supabase
          .from('logistics_tasks')
          .select('status')
          .eq('type', t)

        query = applyOrgLogisticsTaskFilter({
          query,
          userId: user.id,
          eventIds: scope.eventIds,
          tourIds: scope.tourIds,
          eventId,
          tourId,
        })

        const { data, error } = await query

        if (error) {
          console.error(`[Logistics Metrics] Error fetching ${t}:`, error.message)
          metrics[t] = { percentage: 0, items: 0, completed: 0, status: 'Error' }
          continue
        }

        const total = data?.length || 0
        const completed = data?.filter((d: { status: string }) => d.status === 'completed').length || 0
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
        const statusLabel = percentage === 100 ? 'Completed' : percentage > 0 ? 'In Progress' : 'Not Started'

        metrics[t] = { percentage, items: total, completed, status: statusLabel }
      }

      metrics.rentals = metrics.rental || { percentage: 0, items: 0, completed: 0, status: 'No Rentals', revenue: 0 }

      let travelQuery = supabase
        .from('travel_groups')
        .select('id, status, coordination_status, total_members, confirmed_members')

      travelQuery = applyOrgLogisticsTaskFilter({
        query: travelQuery,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: false,
      })

      const { data: travelGroups } = await travelQuery

      if (travelGroups && travelGroups.length > 0) {
        const totalGroups = travelGroups.length
        const fullyCoordinated = travelGroups.filter(
          (g: { coordination_status: string }) => g.coordination_status === 'complete'
        ).length
        const totalTravelers = travelGroups.reduce(
          (sum: number, g: { total_members?: number }) => sum + (g.total_members || 0),
          0
        )
        const percentage = totalGroups > 0 ? Math.round((fullyCoordinated / totalGroups) * 100) : 0
        const statusLabel = percentage === 100 ? 'Complete' : percentage > 0 ? 'In Progress' : 'Not Started'

        metrics.travelCoordination = {
          percentage,
          items: totalGroups,
          completed: fullyCoordinated,
          status: statusLabel,
          travelers: totalTravelers,
        }
      } else {
        metrics.travelCoordination = {
          percentage: 0,
          items: 0,
          completed: 0,
          status: 'Not Started',
          travelers: 0,
        }
      }

      let lodgingQuery = supabase
        .from('lodging_bookings')
        .select('id, status, total_amount')

      lodgingQuery = applyOrgLogisticsTaskFilter({
        query: lodgingQuery,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: false,
      })

      const { data: lodgingBookings } = await lodgingQuery

      if (lodgingBookings && lodgingBookings.length > 0) {
        const total = lodgingBookings.length
        const active = lodgingBookings.filter(
          (b: { status: string }) => b.status === 'confirmed' || b.status === 'checked_in'
        ).length
        const revenue = lodgingBookings.reduce(
          (sum: number, b: { total_amount?: number }) => sum + (Number(b.total_amount) || 0),
          0
        )
        const percentage = total > 0 ? Math.round((active / total) * 100) : 0

        metrics.accommodations = {
          percentage,
          items: total,
          completed: active,
          status: active > 0 ? 'Active' : 'No Bookings',
          revenue,
        }
      } else {
        metrics.accommodations = metrics.lodging || {
          percentage: 0,
          items: 0,
          completed: 0,
          status: 'No Bookings',
          revenue: 0,
        }
      }

      let rentalQuery = supabase
        .from('rental_agreements')
        .select('id, status, total_amount')

      rentalQuery = applyOrgLogisticsTaskFilter({
        query: rentalQuery,
        userId: user.id,
        eventIds: scope.eventIds,
        tourIds: scope.tourIds,
        eventId,
        tourId,
        includeCreatedBy: false,
      })

      const { data: rentalAgreements } = await rentalQuery

      if (rentalAgreements && rentalAgreements.length > 0) {
        const total = rentalAgreements.length
        const active = rentalAgreements.filter((r: { status: string }) => r.status === 'active').length
        const revenue = rentalAgreements.reduce(
          (sum: number, r: { total_amount?: number }) => sum + (Number(r.total_amount) || 0),
          0
        )

        metrics.rentals = {
          ...metrics.rentals,
          items: (metrics.rentals?.items || 0) + total,
          completed: (metrics.rentals?.completed || 0) + active,
          status: active > 0 ? 'Active' : metrics.rentals?.status || 'No Rentals',
          revenue,
          total_budget: revenue,
        }
      }

      return NextResponse.json({
        success: true,
        metrics,
        orgId: scope.orgId,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Logistics Metrics] GET error:', message)

      if (
        message.includes('not available to this admin account') ||
        message.includes('Organization is not available')
      ) {
        return NextResponse.json({ error: message }, { status: 403 })
      }

      return NextResponse.json({ error: 'Failed to fetch logistics metrics' }, { status: 500 })
    }
  })(request)
}
