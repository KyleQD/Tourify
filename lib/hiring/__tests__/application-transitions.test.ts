import { canTransitionApplicationStatus } from '../application-transitions'

describe('application transition rules', () => {
  it('allows valid transitions', () => {
    expect(canTransitionApplicationStatus('pending', 'reviewed')).toBe(true)
    expect(canTransitionApplicationStatus('reviewed', 'approved')).toBe(true)
    expect(canTransitionApplicationStatus('approved', 'withdrawn')).toBe(true)
  })

  it('blocks invalid transitions', () => {
    expect(canTransitionApplicationStatus('rejected', 'approved')).toBe(false)
    expect(canTransitionApplicationStatus('withdrawn', 'approved')).toBe(false)
    expect(canTransitionApplicationStatus('approved', 'reviewed')).toBe(false)
  })
})
