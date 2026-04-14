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
  const type = searchParams.get('type') || 'groups'

  const empty: any[] = []
  const map: Record<string, any> = {
    groups: empty,
    group_members: empty,
    flights: empty,
    flight_passengers: empty,
    transportation: empty,
    transportation_passengers: empty,
    hotel_assignments: empty,
    timeline: empty,
    analytics: [],
    utilization: []
  }

  return NextResponse.json({ success: true, data: map[type] ?? empty })
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true, message: 'Travel coordination stub' })
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true, message: 'Travel coordination stub' })
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true, message: 'Travel coordination stub' })
}


