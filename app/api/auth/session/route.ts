import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie, Authorization',
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: PRIVATE_HEADERS },
    )
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: auth.user.id,
        email: auth.user.email ?? null,
      },
    },
    { headers: PRIVATE_HEADERS },
  )
}
