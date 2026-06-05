import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { z } from 'zod'

const patchSchema = z.object({
  moderation_status: z.enum(['approved', 'pending', 'flagged', 'removed']).optional(),
  is_visible: z.boolean().optional(),
  is_pinned: z.boolean().optional(),
  table: z.enum(['posts', 'artist_music']).default('posts'),
})

function extractContentId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('content')
  return idx >= 0 ? segments[idx + 1] || null : null
}

export const PATCH = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const id = extractContentId(request.url)
  if (!id) return NextResponse.json({ error: 'Missing content id' }, { status: 400 })

  const body = await request.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { table, ...updates } = parsed.data
  const updatePayload: Record<string, any> = {}
  if (updates.moderation_status !== undefined) updatePayload.moderation_status = updates.moderation_status
  if (updates.is_visible !== undefined) updatePayload.is_visible = updates.is_visible
  if (updates.is_pinned !== undefined) updatePayload.is_pinned = updates.is_pinned

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('id', id)
    .select('id, moderation_status, is_visible')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
})
