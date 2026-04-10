import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

const VALID_STATUS = new Set(['pending','confirmed','in_progress','completed','cancelled','needs_attention'])

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  return withAdminAuth(async (req) => {
    const supabase = await createClient()
    const { status } = await req.json()

    if (!VALID_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Fetch current status
    const { data: current, error: fetchErr } = await supabase
      .from('logistics_tasks')
      .select('id, status')
      .eq('id', id)
      .single()
    if (fetchErr || !current) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('logistics_tasks')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error

    // Log activity
    await supabase.from('logistics_activity').insert({
      task_id: id,
      action: 'status_changed',
      prev_status: current.status,
      new_status: status
    })

    return NextResponse.json({ item: data })
  })(request)
}


