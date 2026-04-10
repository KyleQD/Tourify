import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { buildResumeExport, getResumeAchievements } from '@/lib/services/resume-achievement.service'

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resumePayload = await getResumeAchievements({
      supabase,
      userId: user.id,
    })
    const exportPayload = buildResumeExport(resumePayload)

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    if (format === 'markdown') {
      return new NextResponse(exportPayload.markdown, {
        status: 200,
        headers: {
          'content-type': 'text/markdown; charset=utf-8',
        },
      })
    }

    if (format === 'text') {
      return new NextResponse(exportPayload.plain_text, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      })
    }

    return NextResponse.json(exportPayload)
  } catch (error) {
    console.error('[achievements-resume-export] GET failed:', error)
    return NextResponse.json({ error: 'Failed to export resume achievements' }, { status: 500 })
  }
}
