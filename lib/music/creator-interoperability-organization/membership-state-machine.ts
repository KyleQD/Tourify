export type MembershipState = "draft" | "invited" | "signed" | "approved" | "instrument_deposited" | "effective" | "suspended" | "withdrawing" | "withdrawn" | "rejected"
const transitions: Record<MembershipState, MembershipState[]> = {
  draft:["invited","rejected"], invited:["signed","rejected"], signed:["approved","rejected"], approved:["instrument_deposited","rejected"], instrument_deposited:["effective","rejected"], effective:["suspended","withdrawing"], suspended:["effective","withdrawing"], withdrawing:["withdrawn"], withdrawn:[], rejected:[]
}
export function canTransitionMembership(from: MembershipState, to: MembershipState): boolean { return transitions[from].includes(to); }
