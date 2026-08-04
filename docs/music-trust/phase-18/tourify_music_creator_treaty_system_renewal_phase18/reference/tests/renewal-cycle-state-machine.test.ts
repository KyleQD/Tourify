import { canTransitionRenewal } from '../lib/music/creator-treaty-system-renewal/renewal-cycle-state-machine';

describe('renewal cycle', () => {
  it('allows approved to effective', () => expect(canTransitionRenewal({ from: 'approved', to: 'effective' })).toBe(true));
  it('denies expired to effective', () => expect(canTransitionRenewal({ from: 'expired', to: 'effective' })).toBe(false));
});
