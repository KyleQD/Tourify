export type ProtocolState = 'draft'|'negotiated'|'adopted'|'signed'|'ratification_pending'|'effective'|'suspended'|'terminated'|'superseded'
const transitions: Record<ProtocolState, ProtocolState[]> = {
  draft:['negotiated'], negotiated:['adopted','draft'], adopted:['signed'], signed:['ratification_pending'],
  ratification_pending:['effective','terminated'], effective:['suspended','terminated','superseded'],
  suspended:['effective','terminated'], terminated:[], superseded:[]
}
export function mayTransitionProtocol(from: ProtocolState, to: ProtocolState): boolean { return transitions[from].includes(to); }
