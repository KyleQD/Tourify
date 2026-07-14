import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function extractTourId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const idx = segments.indexOf('tours')
  return idx >= 0 ? segments[idx + 1] : null
}

export const GET = withAdminAuth(async (request: NextRequest, { user }) => {
  const tourId = extractTourId(request.url)
  if (!tourId) return NextResponse.json({ error: 'Missing tour id' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: tour } = await supabase
    .from('tours')
    .select('id, org_id, user_id, created_by')
    .eq('id', tourId)
    .maybeSingle()

  if (!tour) return NextResponse.json({ error: 'Tour not found' }, { status: 404 })

  const isOwner = tour.user_id === user.id || tour.created_by === user.id
  if (!isOwner) {
    if (!tour.org_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('org_id', tour.org_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tasks, error } = await supabase
    .from('logistics_tasks')
    .select('type, status')
    .eq('tour_id', tourId)

  if (error) {
    if (error.code === '42P01' || error.code === '42703') {
      return NextResponse.json({
        summary: {
          percentage: 0,
          categories: {
            travel: { total: 0, completed: 0 },
            lodging: { total: 0, completed: 0 },
            equipment: { total: 0, completed: 0 },
          },
        },
      })
    }

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const categories = {
    travel: { total: 0, completed: 0 },
    lodging: { total: 0, completed: 0 },
    equipment: { total: 0, completed: 0 },
  }

  for (const task of tasks || []) {
    const key = task.type === 'lodging' || task.type === 'accommodations'
      ? 'lodging'
      : task.type === 'equipment' || task.type === 'backline'
        ? 'equipment'
        : task.type === 'transportation' || task.type === 'travel'
          ? 'travel'
          : null

    if (!key) continue
    categories[key].total += 1
    if (task.status === 'completed') categories[key].completed += 1
  }

  const total = Object.values(categories).reduce((sum, category) => sum + category.total, 0)
  const completed = Object.values(categories).reduce((sum, category) => sum + category.completed, 0)
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

  return NextResponse.json({ summary: { percentage, total, completed, categories } })
})
