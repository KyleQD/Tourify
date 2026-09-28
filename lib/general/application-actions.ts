const WITHDRAWABLE_APPLICATION_STATUSES = new Set([
  "pending",
  "received",
  "reviewed",
  "screening",
  "shortlisted",
  "interview",
  "assessment",
  "offer_pending",
  "offer_extended",
  "approved",
  "accepted",
  "on_hold",
])

export function canApplicantWithdraw(status: string | null | undefined): boolean {
  return WITHDRAWABLE_APPLICATION_STATUSES.has(
    String(status || "").trim().toLowerCase(),
  )
}
