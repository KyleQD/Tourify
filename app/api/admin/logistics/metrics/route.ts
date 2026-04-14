import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  return withAdminAuth(async () => {
    const supabase = await createClient()

    const types = ['transportation', 'equipment', 'backline', 'lodging', 'catering', 'communication', 'rental']
    const metrics: Record<string, any> = {}

    for (const t of types) {
      const { data, error } = await supabase
        .from('logistics_tasks')
        .select('status')
        .eq('type', t)

      if (error) {
        console.error(`[Logistics Metrics] Error fetching ${t}:`, error.message)
        metrics[t] = { percentage: 0, items: 0, completed: 0, status: 'Error' }
        continue
      }

      const total = data?.length || 0
      const completed = data?.filter(d => d.status === 'completed').length || 0
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
      const statusLabel = percentage === 100 ? 'Completed' : percentage > 0 ? 'In Progress' : 'Not Started'

      metrics[t] = { percentage, items: total, completed, status: statusLabel }
    }

    // Alias 'rental' as 'rentals' for UI consistency
    metrics['rentals'] = metrics['rental'] || { percentage: 0, items: 0, completed: 0, status: 'No Rentals', revenue: 0 }

    // Query real travel coordination data
    const { data: travelGroups } = await supabase
      .from('travel_groups')
      .select('id, status, coordination_status, total_members, confirmed_members')

    if (travelGroups && travelGroups.length > 0) {
      const totalGroups = travelGroups.length
      const fullyCoordinated = travelGroups.filter(g => g.coordination_status === 'complete').length
      const totalTravelers = travelGroups.reduce((sum, g) => sum + (g.total_members || 0), 0)
      const percentage = totalGroups > 0 ? Math.round((fullyCoordinated / totalGroups) * 100) : 0
      const statusLabel = percentage === 100 ? 'Complete' : percentage > 0 ? 'In Progress' : 'Not Started'

      metrics['travelCoordination'] = {
        percentage,
        items: totalGroups,
        completed: fullyCoordinated,
        status: statusLabel,
        travelers: totalTravelers
      }
    } else {
      metrics['travelCoordination'] = { percentage: 0, items: 0, completed: 0, status: 'Not Started', travelers: 0 }
    }

    // Query real lodging data for accommodation metrics
    const { data: lodgingBookings } = await supabase
      .from('lodging_bookings')
      .select('id, status, total_amount')

    if (lodgingBookings && lodgingBookings.length > 0) {
      const total = lodgingBookings.length
      const active = lodgingBookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length
      const revenue = lodgingBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0)
      const percentage = total > 0 ? Math.round((active / total) * 100) : 0

      metrics['accommodations'] = {
        percentage,
        items: total,
        completed: active,
        status: active > 0 ? 'Active' : 'No Bookings',
        revenue
      }
    } else {
      metrics['accommodations'] = metrics['lodging'] || { percentage: 0, items: 0, completed: 0, status: 'No Bookings', revenue: 0 }
    }

    // Query real rental agreements for enriched rental metrics
    const { data: rentalAgreements } = await supabase
      .from('rental_agreements')
      .select('id, status, total_amount')

    if (rentalAgreements && rentalAgreements.length > 0) {
      const total = rentalAgreements.length
      const active = rentalAgreements.filter(r => r.status === 'active').length
      const revenue = rentalAgreements.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

      metrics['rentals'] = {
        ...metrics['rentals'],
        items: (metrics['rentals']?.items || 0) + total,
        completed: (metrics['rentals']?.completed || 0) + active,
        status: active > 0 ? 'Active' : metrics['rentals']?.status || 'No Rentals',
        revenue
      }
    }

    return NextResponse.json({ success: true, metrics, timestamp: new Date().toISOString() })
  })(request)
}
