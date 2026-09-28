import { evaluatePhase18Activation } from '../lib/music/creator-treaty-system-renewal/phase18-activation-gate';

test('requires expiry and independent operation', () => {
  expect(evaluatePhase18Activation({ repeatedPhase17Cycles: 2, legalReviewApproved: true, renewalAuthorityVerified: true, archiveRestorePassed: true, independentOperators: 2, tourifyUnavailablePassed: true, unresolvedCriticalBlockers: 0, now: new Date('2026-01-01') }).allowed).toBe(false);
});
