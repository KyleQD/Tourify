export interface ConformanceGateInput {
  profileApproved: boolean
  automatedTestsPassed: boolean
  securityReviewPassed: boolean
  privacyReviewPassed: boolean
  accessibilityReviewPassed: boolean
  unresolvedCriticalFindings: number
}

export function evaluateConformanceGate(input: ConformanceGateInput) {
  const passed = input.profileApproved && input.automatedTestsPassed && input.securityReviewPassed && input.privacyReviewPassed && input.accessibilityReviewPassed && input.unresolvedCriticalFindings === 0
  return { passed, reason: passed ? "conformant" : "requirements_incomplete" }
}
