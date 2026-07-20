export type ProtocolState='draft'|'negotiated'|'adopted'|'signed'|'approval_pending'|'effective'|'suspended'|'terminated'|'superseded';
const transitions:Record<ProtocolState,ProtocolState[]>={draft:['negotiated'],negotiated:['adopted','draft'],adopted:['signed'],signed:['approval_pending'],approval_pending:['effective','terminated'],effective:['suspended','terminated','superseded'],suspended:['effective','terminated','superseded'],terminated:[],superseded:[]};
export function mayTransitionProtocol(from:ProtocolState,to:ProtocolState){return transitions[from].includes(to);}
