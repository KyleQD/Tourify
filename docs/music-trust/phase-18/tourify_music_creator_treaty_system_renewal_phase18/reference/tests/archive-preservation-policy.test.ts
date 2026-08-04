import { evaluateArchivePackage } from '../lib/music/creator-treaty-system-renewal/archive-preservation-policy';

test('rejects archive package without fixity', () => {
  expect(evaluateArchivePackage({ manifestId: 'm1', checksumVerified: false, provenanceComplete: true, representationInfoComplete: true, retentionAuthorized: true, accessPurposeApproved: true }).accepted).toBe(false);
});
