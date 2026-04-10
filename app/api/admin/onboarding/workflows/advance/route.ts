import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  return withAdminAuth(async (req) => {
    const body = await req.json()
    const workflowId = body.workflow_id
    const newStage = body.new_stage
    if (!workflowId || !newStage) {
      return NextResponse.json(
        { success: false, error: 'workflow_id and new_stage are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const updates: Record<string, unknown> = {
      current_stage: newStage,
      updated_at: new Date().toISOString(),
    }
    if (newStage === 'team_assigned') updates.status = 'completed'

    const { data, error } = await supabase
      .from('onboarding_workflows')
      .update(updates)
      .eq('id', workflowId)
      .select('*')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, data })
  })(request)
}
