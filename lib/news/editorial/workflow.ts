export type EditorialStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'withdrawn'
export type EditorialAction = 'start_review' | 'approve' | 'reject' | 'withdraw' | 'reopen'
export type EditorialActorRole = 'submitter' | 'reviewer' | 'editor'

export interface EditorialTransition {
  action: EditorialAction
  actorId: string
  actorRole: EditorialActorRole
  notes?: string
  at: string
}

export interface EditorialDecision {
  status: EditorialStatus
  event: {
    action: EditorialAction
    actorId: string
    from: EditorialStatus
    to: EditorialStatus
    notes: string | null
    occurredAt: string
  }
  /**
   * Editorial approval alone never publishes a story. An independent rights,
   * moderation and public-visibility gate still controls News indexing.
   */
  readyForPublicationAssessment: boolean
}

const ALLOWED: Record<EditorialStatus, Partial<Record<EditorialAction, EditorialStatus>>> = {
  pending: { start_review: 'in_review', withdraw: 'withdrawn' },
  in_review: { approve: 'approved', reject: 'rejected', withdraw: 'withdrawn' },
  approved: {},
  rejected: { reopen: 'in_review' },
  withdrawn: {}
}

/**
 * Pure application policy, not authorization by itself. Calling routes must
 * first verify the actor's real identity/role server-side and ownership for
 * submitter withdrawals. Never trust actorRole supplied by browser JSON.
 */
export function transitionEditorialStatus(
  current: EditorialStatus,
  input: EditorialTransition
): EditorialDecision {
  const next = ALLOWED[current]?.[input.action]
  if (!next) throw new Error('Invalid editorial transition')
  if (!input.actorId.trim() || !Number.isFinite(Date.parse(input.at))) {
    throw new Error('Invalid editorial actor or timestamp')
  }

  if (input.action === 'withdraw') {
    if (input.actorRole !== 'submitter' && input.actorRole !== 'editor') {
      throw new Error('Not permitted to withdraw submission')
    }
  } else if (input.action === 'start_review') {
    if (!['reviewer', 'editor'].includes(input.actorRole)) {
      throw new Error('Not permitted to start review')
    }
  } else if (input.actorRole !== 'editor') {
    throw new Error('Editor permission required')
  }

  const notes = input.notes?.trim() || ''
  if (['approve', 'reject', 'reopen'].includes(input.action) && notes.length < 8) {
    throw new Error('Editorial decision requires a documented rationale')
  }

  return {
    status: next,
    event: {
      action: input.action,
      actorId: input.actorId,
      from: current,
      to: next,
      notes: notes || null,
      occurredAt: new Date(input.at).toISOString()
    },
    readyForPublicationAssessment: next === 'approved'
  }
}
