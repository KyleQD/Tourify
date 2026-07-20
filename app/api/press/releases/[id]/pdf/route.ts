import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { resolveActingContext } from '@/lib/auth/acting-context'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { canAccessPressRelease, recordPressReleaseDownload } from '@/lib/press/press-release-access'
import { PressReleasePdfDocument } from '@/components/press/press-release-pdf-document'
import React from 'react'

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

    const release = access.release
    const artistName = release.account_display_name || release.account_username || 'Artist'

    const buffer = await renderToBuffer(
      React.createElement(PressReleasePdfDocument, {
        title: release.title,
        content: release.content,
        artistName,
        publishedAt: release.published_at,
        embargoUntil: release.embargo_until,
        boilerplate: release.boilerplate,
        subtitle: release.subtitle,
      })
    )

    if (!access.isOwner)
      await recordPressReleaseDownload({
        supabase: service,
        pressPostId: id,
        userId: ctx.userId,
      })

    const filename = `${release.slug || 'press-release'}.pdf`

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    console.error('[PressPdf] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate PDF' }, { status: 500 })
  }
}
