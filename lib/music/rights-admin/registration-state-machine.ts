export type RegistrationStatus = "draft" | "validated" | "approved" | "submitted" | "pending" | "accepted" | "accepted_with_changes" | "rejected" | "cancelled";
const transitions: Record<RegistrationStatus, RegistrationStatus[]> = {
  draft:["validated","cancelled"], validated:["approved","draft","cancelled"], approved:["submitted","cancelled"],
  submitted:["pending","accepted","accepted_with_changes","rejected"], pending:["accepted","accepted_with_changes","rejected"],
  accepted:[], accepted_with_changes:[], rejected:["draft"], cancelled:[]
};
export function canTransitionRegistration(from: RegistrationStatus, to: RegistrationStatus): boolean { return transitions[from].includes(to); }
