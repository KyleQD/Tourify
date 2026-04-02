import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createServerClient } from '@/lib/supabase/client'

export const PUT = withAdminAuth(async (request) => {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const itemIds: string[] = body.itemIds || []
    const action: string = body.action

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 })
    }

    if (action === 'mark_complete') {
      const { error } = await supabase
        .from('logistics_tasks')
        .update({ status: 'completed' })
        .in('id', itemIds)

      if (error) throw error
    } else {
      return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Logistics Items Bulk] PUT error:', error)
    return NextResponse.json({ error: 'Failed to perform bulk action' }, { status: 500 })
  }
})