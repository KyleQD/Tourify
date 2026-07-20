export type LegalEffectState = 'draft' | 'adopted' | 'effective' | 'suspended' | 'terminated' | 'superseded';
export type ReviewCycleState = 'planned'|'mandate_proposed'|'mandate_approved'|'evidence_collection'|'expert_dialogue'|'public_consultation'|'conference'|'outcome_adopted'|'implementation'|'follow_up'|'closed'|'paused'|'blocked'|'terminated';
export interface AuthorityScope { actorId:string; participantId:string; jurisdiction:string; powers:string[]; effectiveAt:string; expiresAt?:string; suspended:boolean; revoked:boolean; }
export interface SourceManifest { id:string; version:string; sha256:string; createdAt:string; sources:Array<{type:string;id:string;version:string}>; }
export interface DurableAction { id:string; policyVersion:string; schemaVersion:string; jurisdiction:string; effectiveAt:string; sourceManifestId:string; actorAuthorityId:string; idempotencyKey:string; auditEventId:string; }
