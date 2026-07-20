import { NextRequest, NextResponse } from 'next/server'
import { resolveActingContext } from '@/lib/auth/acting-context'
import {
  deleteArticle,
  getOwnedArticle,
  updateArticle,
  type ArticlePublishStatus,
} from '@/lib/blog/article-publishing'

interface RouteParams {
  params: Promise<{ id: string }>
}

function parseStatus(value: unknown): ArticlePublishStatus | undefined {
  if (value === 'draft' || value === 'published' || value === 'scheduled' || value === 'archived')
    return value
  return undefined
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    if (!id)
      return NextResponse.json({ success: false, error: 'Article id is required' }, { status: 400 })

    const result = await getOwnedArticle({ ctx, articleId: id })
    if (!result.success)
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, article: result.article })
  } catch (error) {
    console.error('[PulseArticle] Unexpected GET error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    if (!id)
      return NextResponse.json({ success: false, error: 'Article id is required' }, { status: 400 })

    const body = await request.json()
    const result = await updateArticle({
      ctx,
      articleId: id,
      body: {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        tags: body.tags,
        categories: body.categories,
        featuredImageUrl: body.featuredImageUrl,
        status: parseStatus(body.status),
        seoTitle: body.seoTitle,
        seoDescription: body.seoDescription,
        scheduledFor: body.scheduledFor,
        format: body.format,
        subtitle: body.subtitle,
        boilerplate: body.boilerplate,
        embargoUntil: body.embargoUntil,
        distribution: body.distribution,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          article: result.article,
        },
        { status: result.status }
      )
    }

    return NextResponse.json({
      success: true,
      article: result.article,
    })
  } catch (error) {
    console.error('[PulseArticle] Unexpected PATCH error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { id } = await params
    if (!id)
      return NextResponse.json({ success: false, error: 'Article id is required' }, { status: 400 })

    const result = await deleteArticle({ ctx, articleId: id })
    if (!result.success)
      return NextResponse.json({ success: false, error: result.error }, { status: result.status })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[PulseArticle] Unexpected DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
