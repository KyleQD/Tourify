export function evaluatePhase18Activation(input: {
  repeatedPhase17Cycles: number;
  legalReviewApproved: boolean;
  renewalAuthorityVerified: boolean;
  archiveRestorePassed: boolean;
  independentOperators: number;
  tourifyUnavailablePassed: boolean;
  unresolvedCriticalBlockers: number;
  expiresAt?: Date;
  now: Date;
}) {
  const allowed = input.repeatedPhase17Cycles >= 2
    && input.legalReviewApproved
    && input.renewalAuthorityVerified
    && input.archiveRestorePassed
    && input.independentOperators >= 2
    && input.tourifyUnavailablePassed
    && input.unresolvedCriticalBlockers === 0
    && !!input.expiresAt
    && input.expiresAt > input.now;
  return { allowed, reason: allowed ? 'activation_ready' : 'activation_denied' } as const;
}
