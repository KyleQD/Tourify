import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { resolveHiringActorFromRequest } from '@/lib/api/hiring-route-helpers'
import { presentTemplateListItem } from '@/lib/hiring/api-presenters'
import { cloneTemplateForEmployer } from '@/lib/services/hiring-onboarding-templates.service'
import { createHiringServiceClient } from '@/lib/supabase/hiring-service-client'

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const sourceId = body.template_id ?? body.source_id
    if (!sourceId) {
      return NextResponse.json({ ok: false, error: { message: 'template_id is required.' } }, { status: 400 })
    }

    const supabase = createHiringServiceClient()
    const actorResult = await resolveHiringActorFromRequest({ request: req, supabase, body })
    if (!actorResult.ok) {
      return NextResponse.json({ ok: false, error: { message: actorResult.error.message } }, { status: 403 })
    }

    const { data, error } = await cloneTemplateForEmployer({
      supabase,
      employer: actorResult.data.employer,
      actorUserId: actorResult.data.userId,
      sourceId,
      name: typeof body.name === 'string' ? body.name : null,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: { message: error } }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: presentTemplateListItem({ ...data, scope: 'employer' }) })
  })(request)
}
