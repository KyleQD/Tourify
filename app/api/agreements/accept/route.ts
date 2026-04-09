import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { recordAgreementAcceptance } from '@/lib/services/agreement.service'

const bodySchema = z.object({
  template_id: z.string().uuid(),
  template_version: z.number().int().min(1),
  organization_id: z.string().uuid().optional().nullable(),
  context: z.string().max(500).optional(),
  signature_method: z.string().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
    }

    const fwd = request.headers.get('x-forwarded-for')
    const ip = fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null
    const userAgent = request.headers.get('user-agent')

    const row = await recordAgreementAcceptance(supabase, {
      templateId: parsed.data.template_id,
      templateVersion: parsed.data.template_version,
      userId: user.id,
      organizationId: parsed.data.organization_id,
      context: parsed.data.context,
      signatureMethod: parsed.data.signature_method,
      ip,
      userAgent,
      metadata: parsed.data.metadata,
    })

    return NextResponse.json({ success: true, data: row })
  } catch (e) {
    console.error('[agreements/accept]', e)
    return NextResponse.json({ success: false, error: 'Failed to record acceptance' }, { status: 500 })
  }
}
