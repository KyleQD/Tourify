import { NextRequest, NextResponse } from 'next/server'
import {
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import { withAdminAuth } from '@/lib/auth/api-auth'

function isLogisticsTasksUnavailableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message || '').toLowerCase()
  if (error.code === 'PGRST205') return true
  if (error.code === '42P01') return true
  if (msg.includes('schema cache') && msg.includes('logistics_tasks')) return true
  if (msg.includes('does not exist') && msg.includes('logistics_tasks')) return true
  return false
}

function dueDateRangeFilter(range: string | null): { from: string; to: string } | null {
  const now = new Date()
  if (range === 'today') {
    const from = startOfDay(now)
    const to = endOfDay(now)
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') }
  }
  if (range === 'week') {
    const from = startOfWeek(now, { weekStartsOn: 0 })
    const to = endOfWeek(now, { weekStartsOn: 0 })
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') }
  }
  if (range === 'month') {
    const from = startOfMonth(now)
    const to = endOfMonth(now)
    return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') }
  }
  return null
}

export const GET = withAdminAuth(async (request: NextRequest, auth) => {
  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range')

  let query = auth.supabase
    .from('logistics_tasks')
    .select('id, title, description, status, priority, due_date, assigned_to_user_id, created_at, type')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const bounds = range ? dueDateRangeFilter(range) : null
  if (bounds) {
    query = query.gte('due_date', bounds.from).lte('due_date', bounds.to)
  }

  const { data, error } = await query

  if (error) {
    if (isLogisticsTasksUnavailableError(error))
      return NextResponse.json({ success: true, tasks: [] })
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 })
  }

  const rows = data ?? []
  const tasks = rows.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    status: row.status as string,
    priority: row.priority as string,
    due_date: row.due_date as string | null,
    assigned_to: (row.assigned_to_user_id as string | null) ?? null,
    created_at: row.created_at as string,
  }))

  return NextResponse.json({ success: true, tasks })
})

export const PATCH = withAdminAuth(async (request: NextRequest, auth) => {
  let body: { taskIds?: string[]; updates?: { status?: string; priority?: string } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const taskIds = body?.taskIds
  const updates = body?.updates ?? {}

  if (!Array.isArray(taskIds) || taskIds.length === 0)
    return NextResponse.json({ success: false, error: 'taskIds[] is required' }, { status: 400 })

  const patch: { status?: string; priority?: string } = {}
  if (updates.status !== undefined && updates.status !== null) patch.status = updates.status
  if (updates.priority !== undefined && updates.priority !== null) patch.priority = updates.priority

  if (Object.keys(patch).length === 0)
    return NextResponse.json(
      { success: false, error: 'updates must include status and/or priority' },
      { status: 400 }
    )

  const { data, error } = await auth.supabase
    .from('logistics_tasks')
    .update(patch)
    .in('id', taskIds)
    .select('id')

  if (error) {
    if (isLogisticsTasksUnavailableError(error))
      return NextResponse.json({ success: true, updated: 0, tasks: [] })
    return NextResponse.json({ success: false, error: 'Failed to update tasks' }, { status: 500 })
  }

  const updated = Array.isArray(data) ? data.length : 0
  return NextResponse.json({ success: true, updated })
})
