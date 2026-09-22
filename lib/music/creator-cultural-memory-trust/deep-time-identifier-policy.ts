export type IdentifierStatus = "active" | "redirect" | "tombstone" | "disputed" | "revoked";
export interface ResolveInput { status:IdentifierStatus; target?:string; sourceFresh:boolean; }
export function resolveIdentifier(i:ResolveInput):{action:"resolve"|"redirect"|"deny"|"tombstone";target?:string}{ if(!i.sourceFresh||i.status==="disputed"||i.status==="revoked")return{action:"deny"}; if(i.status==="redirect"&&i.target)return{action:"redirect",target:i.target}; if(i.status==="tombstone")return{action:"tombstone"}; return{action:"resolve",target:i.target}; }
