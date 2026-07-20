export type ClaimStatus = "draft" | "review" | "approved" | "submitted" | "countered" | "accepted" | "partially_accepted" | "rejected" | "appealed" | "paid" | "closed" | "withdrawn";
const allowed: Record<ClaimStatus, ClaimStatus[]> = {
  draft:["review","withdrawn"], review:["approved","draft","withdrawn"], approved:["submitted","withdrawn"],
  submitted:["countered","accepted","partially_accepted","rejected","withdrawn"], countered:["accepted","partially_accepted","rejected","appealed"],
  accepted:["paid","closed"], partially_accepted:["paid","appealed","closed"], rejected:["appealed","closed"], appealed:["accepted","partially_accepted","rejected","closed"],
  paid:["closed"], closed:[], withdrawn:[]
};
export function canTransitionClaim(from: ClaimStatus, to: ClaimStatus): boolean { return allowed[from].includes(to); }
