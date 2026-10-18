import { transitionEditorialStatus } from '@/lib/news/editorial/workflow'

const input = {
  actorId: 'trusted-server-actor',
  actorRole: 'editor' as const,
  at: '2026-10-18T09:00:00Z',
  notes: 'Evidence reviewed and source confirmed'
}

describe('editorial workflow transitions', () => {
  it('allows a reviewer to start but not approve a submission', () => {
    const review = transitionEditorialStatus('pending', {
      ...input, action: 'start_review', actorRole: 'reviewer'
    })
    expect(review.status).toBe('in_review')
    expect(() => transitionEditorialStatus('in_review', {
      ...input, action: 'approve', actorRole: 'reviewer'
    })).toThrow()
  })

  it('records editor approval without automatically publishing', () => {
    const approval = transitionEditorialStatus('in_review', { ...input, action: 'approve' })
    expect(approval).toMatchObject({
      status: 'approved', readyForPublicationAssessment: true,
      event: { from: 'in_review', to: 'approved', actorId: input.actorId }
    })
  })

  it('allows withdrawal only before the submission is approved', () => {
    expect(transitionEditorialStatus('pending', {
      ...input, action: 'withdraw', actorRole: 'submitter'
    }).status).toBe('withdrawn')
    expect(() => transitionEditorialStatus('approved', {
      ...input, action: 'withdraw', actorRole: 'submitter'
    })).toThrow()
  })

  it('requires documented rationale for publish-related decisions', () => {
    expect(() => transitionEditorialStatus('in_review', {
      ...input, action: 'reject', notes: ''
    })).toThrow()
    expect(transitionEditorialStatus('rejected', {
      ...input, action: 'reopen'
    }).status).toBe('in_review')
  })

  it('refuses a community author approving their own reporting', () => {
    expect(() => transitionEditorialStatus('in_review', {
      ...input, action: 'approve', actorRole: 'submitter'
    })).toThrow()
  })
})
