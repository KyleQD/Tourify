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
  const type = searchParams.get('type') || 'agreements'

  if (type === 'clients') return NextResponse.json({ clients: [], total: 0 })
  if (type === 'agreements') return NextResponse.json({ agreements: [], total: 0 })
  if (type === 'analytics') return NextResponse.json({ analytics: [] })
  if (type === 'utilization') return NextResponse.json({ utilization: [] })
  return NextResponse.json({})
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true })
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request)
  if (denied) return denied
  return NextResponse.json({ success: true })
}


