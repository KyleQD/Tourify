import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'
import { lookupFlightByNumber, toFlightFormTimes } from '@/lib/logistics/flight-lookup'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth)
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin)
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const flightNumber = searchParams.get('flight_number') || searchParams.get('q') || ''
  const flightDate = searchParams.get('flight_date') || searchParams.get('date') || null

  const result = await lookupFlightByNumber({ flightNumber, flightDate })
  if (!result.ok) {
    const status =
      result.error.code === 'missing_key' ? 503
        : result.error.code === 'not_found' ? 404
          : result.error.code === 'invalid_input' ? 400
            : 502
    return NextResponse.json({ success: false, error: result.error.message, code: result.error.code }, { status })
  }

  const formTimes = toFlightFormTimes(result.flight)
  return NextResponse.json({
    success: true,
    data: {
      ...result.flight,
      ...formTimes,
    },
    alternatives: (result.alternatives || []).map((flight) => ({
      ...flight,
      ...toFlightFormTimes(flight),
    })),
  })
}
