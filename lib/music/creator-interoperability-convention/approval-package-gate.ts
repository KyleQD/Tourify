export interface ApprovalPackageInput {
  packageStatus: "draft" | "review" | "executed" | "rejected" | "expired"
  dualControl: boolean
  publicNoticeComplete: boolean
  independentReviewComplete: boolean
  stateOrIoParticipationRequested: boolean
  stateOrIoPackageAttached: boolean
}

export function evaluateApprovalPackage(input: ApprovalPackageInput) {
  const reasons: string[] = []
  if (input.packageStatus !== "executed") reasons.push("PACKAGE_NOT_EXECUTED")
  if (!input.dualControl) reasons.push("DUAL_CONTROL_REQUIRED")
  if (!input.publicNoticeComplete) reasons.push("PUBLIC_NOTICE_REQUIRED")
  if (!input.independentReviewComplete) reasons.push("INDEPENDENT_REVIEW_REQUIRED")
  if (input.stateOrIoParticipationRequested && !input.stateOrIoPackageAttached)
    reasons.push("STATE_IO_PACKAGE_REQUIRED")
  return { allowed: reasons.length === 0, reasons }
}
