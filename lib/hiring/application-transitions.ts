export const allowedApplicationTransitions: Record<string, string[]> = {
  pending: ['reviewed', 'shortlisted', 'approved', 'rejected', 'withdrawn'],
  reviewed: ['shortlisted', 'approved', 'rejected', 'withdrawn'],
  shortlisted: ['approved', 'rejected', 'withdrawn'],
  approved: ['withdrawn'],
  rejected: [],
  withdrawn: [],
}

export function canTransitionApplicationStatus(currentStatus: string, nextStatus: string) {
  if (currentStatus === nextStatus) return true
  return (allowedApplicationTransitions[currentStatus] || []).includes(nextStatus)
}
