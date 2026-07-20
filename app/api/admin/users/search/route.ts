import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'

const querySchema = z.string().trim().min(2).max(120).transform(value => value.replace(/[,()%]/g, ' '))

export const GET = withAdminCapability('workforce.manage', async (request: NextRequest, { supabase }) => {
  try {
    const url = new URL(request.url)
    const rawQuery = url.searchParams.get('q') || url.searchParams.get('query') || ''
    if (rawQuery.trim().length < 2) return NextResponse.json({ users: [] })
    const query = querySchema.parse(rawQuery)
    const parsedLimit = Number.parseInt(url.searchParams.get('limit') || '10', 10)
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 50)) : 10

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .order('full_name', { ascending: true })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ users: data || [] })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid search query', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to search users' }, { status: 500 })
  }
})

