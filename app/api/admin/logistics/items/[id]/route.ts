import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAdminAuth(async (req) => {
    const supabase = await createClient()
    const body = await req.json()

    const updates: Record<string, any> = {}
    if (body.type) updates.type = body.type
    if (body.title) updates.title = body.title
    if (typeof body.description !== 'undefined') updates.description = body.description
    if (body.status) updates.status = body.status
    if (body.priority) updates.priority = body.priority
    if (typeof body.assignedTo !== 'undefined') updates.assigned_to_user_id = body.assignedTo
    if (typeof body.dueDate !== 'undefined') updates.due_date = body.dueDate
    if (typeof body.budget !== 'undefined') updates.budget = body.budget
    if (typeof body.actualCost !== 'undefined') updates.actual_cost = body.actualCost
    if (typeof body.notes !== 'undefined') updates.notes = body.notes
    if (typeof body.tags !== 'undefined') updates.tags = body.tags

    const { data, error } = await supabase
      .from('logistics_tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ item: data })
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAdminAuth(async () => {
    const supabase = await createClient()

    const { error } = await supabase
      .from('logistics_tasks')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  })(request)
}


