import type { RenewalState } from './renewal-domain';

const transitions: Record<RenewalState, RenewalState[]> = {
  draft: ['proposed', 'rejected'], proposed: ['under_review', 'withdrawn', 'rejected'],
  under_review: ['adopted', 'rejected', 'withdrawn'], adopted: ['approved', 'rejected'],
  approved: ['effective', 'expired', 'revoked'], effective: ['implementation_due', 'suspended', 'expired', 'terminated'],
  implementation_due: ['implemented', 'partially_implemented', 'non_compliant', 'suspended'],
  implemented: ['superseded', 'expired', 'terminated', 'suspended'],
  partially_implemented: ['implemented', 'non_compliant', 'suspended', 'expired'],
  non_compliant: ['implemented', 'suspended', 'revoked', 'terminated'],
  suspended: ['effective', 'revoked', 'terminated', 'expired'], revoked: ['archived'],
  withdrawn: ['archived'], expired: ['archived'], superseded: ['archived'],
  terminated: ['archived'], rejected: ['archived'], archived: []
};

export function canTransitionRenewal(input: { from: RenewalState; to: RenewalState }): boolean {
  return transitions[input.from].includes(input.to);
}
