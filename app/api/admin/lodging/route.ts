import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

async function requireAdmin(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'providers'

  const empty = [] as any[]

  const byType: Record<string, any> = {
    providers: empty,
    room_types: empty,
    bookings: empty,
    guest_assignments: empty,
    payments: empty,
    calendar_events: empty,
    availability: empty,
    analytics: [
      {
        month: '',
        quarter: '',
        year: '',
        total_bookings: 0,
        unique_providers: 0,
        unique_events: 0,
        unique_tours: 0,
        total_revenue: 0,
        total_paid: 0,
        avg_booking_value: 0,
        total_nights: 0,
        total_guests: 0,
        avg_guests_per_booking: 0,
        confirmed_bookings: 0,
        active_bookings: 0,
        cancelled_bookings: 0,
        paid_bookings: 0,
        overdue_bookings: 0,
        active_providers: 0,
        avg_provider_rating: 0
      }
    ],
    utilization: empty
  }

  const data = byType[type] ?? empty
  return NextResponse.json({ success: true, data })
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  const body = await safeJson(request)
  return NextResponse.json({ success: true, message: 'Lodging endpoint stubbed', action: body?.action || 'unknown', data: {} })
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  const body = await safeJson(request)
  return NextResponse.json({ success: true, message: 'Lodging endpoint stubbed', action: body?.action || 'unknown', data: {} })
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true, message: 'Lodging endpoint stubbed' })
}

async function safeJson(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    return null
  }
}


