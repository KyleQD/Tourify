import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { fromZodError, requireApiUser, readJson } from '@/lib/api/route-helpers'
import { runPromoterMembershipCommand, PromoterMembershipCommandError } from '@/lib/promoter-network/membership-command'
import { promoterApplicationSchema } from '@/lib/promoter-network/membership-schemas'

function programId(request: NextRequest) {
  const segments = new URL(request.url).pathname.split('/').filter(Boolean)
  return z.string().uuid().parse(segments[segments.lastIndexOf('programs') + 1])
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.success) return auth.response
  const body = await readJson(request, promoterApplicationSchema, 'invalid_application', 'Invalid promoter application.')
  if (!body.success) return body.response
  try {
    const data = await runPromoterMembershipCommand({
      actorUserId: auth.auth.user.id,
      action: 'apply',
      programId: programId(request),
      targetUserId: auth.auth.user.id,
      note: body.data.application_message || null,
    })
    return NextResponse.json({ data })
  } catch (error) {
    const zod = fromZodError(error, 'Invalid promoter program id.')
    if (zod) return zod
    if (error instanceof PromoterMembershipCommandError) {
      return NextResponse.json({ error: { code: error.code, message: error.message, retryable: false } }, { status: error.status })
    }
    console.error('[promoter apply] failed', error)
    return NextResponse.json({ error: { code: 'application_unavailable', message: 'Unable to submit your application.', retryable: true } }, { status: 503 })
  }
}
