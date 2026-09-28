import { evaluateNonPerpetuity } from '../lib/music/creator-treaty-system-renewal/non-perpetuity-gate';

test('expired authority cannot continue by silence', () => {
  const result = evaluateNonPerpetuity({ now: new Date('2030-01-02'), effectiveAt: new Date('2020-01-01'), expiresAt: new Date('2030-01-01'), renewalDecisionEffective: false, currentAuthorityValid: true, unresolvedCriticalBlocker: false });
  expect(result.allowed).toBe(false);
});
