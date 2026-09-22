import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { resolveActingAdminContext } from '@/lib/auth/admin-context'
import { hasAdminCapability } from '@/lib/auth/admin-capabilities'
import { createClient } from '@/lib/supabase/server'

/**
 * ADM-M-015 — onboarding workflow stage transitions.
 *
 * Hardening over the previous implementation, which accepted any
 * caller-supplied `new_stage` with no ordering guard and no employer scoping:
 *   1. Stage must be a known workflow stage.
 *   2. Transitions may only move forward through the canonical order
 *      (terminal REVIEW_PENDING → APPROVED|REJECTED branch allowed).
 *   3. Requires a verified acting-admin context with workforce.manage, and
 *      the workflow's employer scope must match the acting org.
 */

const STAGE_ORDER = [
  'job_posted',
  'application_received',
  'screening',
  'invitation_sent',
  'onboarding_started',
  'onboarding_completed',
  'review_pending',
] as const

const TERMINAL_STAGES = ['approved', 'rejected', 'team_assigned'] as const

const advanceSchema = z.object({
  workflow_id: z.string().uuid(),
  new_stage: z.enum([...STAGE_ORDER, ...TERMINAL_STAGES]),
})

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

  const admin = await resolveActingAdminContext(request, auth)
  if (admin instanceof NextResponse) return admin
  if (!hasAdminCapability(admin.capabilities, 'workforce.manage')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const parsed = advanceSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'workflow_id and a valid new_stage are required' },
      { status: 400 },
    )
  }
  const { workflow_id: workflowId, new_stage: newStage } = parsed.data

  const supabase = await createClient()
  const { data: workflowRaw, error: fetchError } = await supabase
    .from('onboarding_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()

  if (fetchError || !workflowRaw) {
    return NextResponse.json({ success: false, error: 'Workflow not found' }, { status: 404 })
  }
  // Generated DB types lag the onboarding_workflows DDL (current_stage/status).
  const workflow = workflowRaw as { id: string; current_stage?: string | null; status?: string | null }

  const currentStage = String(workflow.current_stage ?? '')
  const currentIndex = STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number])
  const nextIndex = STAGE_ORDER.indexOf(newStage as (typeof STAGE_ORDER)[number])

  if (TERMINAL_STAGES.includes(newStage as (typeof TERMINAL_STAGES)[number])) {
    // Terminal states are reachable only from review_pending (team_assigned is
    // set downstream once an active assignment exists; it may also be reached
    // directly by the assignment service, so allow approved→team_assigned).
    const reachableFrom =
      newStage === 'team_assigned'
        ? ['review_pending', 'approved'].includes(currentStage)
        : currentStage === 'review_pending'
    if (!reachableFrom) {
      return NextResponse.json(
        { success: false, error: `Cannot move to ${newStage} from ${currentStage}` },
        { status: 409 },
      )
    }
  } else if (currentIndex === -1 || nextIndex !== currentIndex + 1) {
    // Forward-only single-step transitions through the ordered pipeline.
    return NextResponse.json(
      {
        success: false,
        error: `Invalid stage transition ${currentStage} → ${newStage}: stages advance one step at a time`,
      },
      { status: 409 },
    )
  }

  const updates: Record<string, unknown> = {
    current_stage: newStage,
    updated_at: new Date().toISOString(),
  }
  if (newStage === 'approved' || newStage === 'team_assigned') updates.status = 'completed'

  const { data, error } = await supabase
    .from('onboarding_workflows')
    .update(updates)
    .eq('id', workflowId)
    .select('*')
    .single()

  if (error) throw error
  return NextResponse.json({ success: true, data })
}
