export type LicenseRequestStatus = "draft" | "submitted" | "needs_information" | "under_clearance" | "quote_pending" | "quoted" | "approval_pending" | "approved" | "rejected" | "expired" | "withdrawn" | "contracting" | "licensed" | "cancelled"
const allowed: Record<LicenseRequestStatus, LicenseRequestStatus[]> = {
  draft:["submitted","cancelled"], submitted:["needs_information","under_clearance","withdrawn"], needs_information:["submitted","withdrawn"],
  under_clearance:["quote_pending","rejected","withdrawn"], quote_pending:["quoted","rejected","withdrawn"], quoted:["approval_pending","expired","withdrawn"],
  approval_pending:["approved","rejected","quoted","withdrawn"], approved:["contracting","expired"], rejected:[], expired:[], withdrawn:[],
  contracting:["licensed","cancelled"], licensed:["cancelled"], cancelled:[]
}
export function canTransitionLicenseRequest(from: LicenseRequestStatus,to:LicenseRequestStatus):boolean{return allowed[from].includes(to)}
