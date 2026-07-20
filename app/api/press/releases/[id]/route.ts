import { NextRequest, NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { canAccessPressRelease } from '@/lib/press/press-release-access'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    if (!id)
      return NextResponse.json({ success: false, error: 'Press release id is required' }, { status: 400 })

    const service = createServiceRoleClient()
    const access = await canAccessPressRelease({
      supabase: service,
      pressPostId: id,
      userId: ctx.userId,
    })

    if (!access.allowed || !access.release)
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

    return NextResponse.json({
      success: true,
      release: {
        ...access.release,
        isOwner: access.isOwner,
        url: `/artist/press/releases/${access.release.id}`,
        pdfUrl: `/api/press/releases/${access.release.id}/pdf`,
      },
    })
  } catch (error) {
    console.error('[PressRelease] Unexpected GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
