export type LifecycleState = "draft" | "under_review" | "approved" | "effective" | "suspended" | "revoked" | "withdrawn" | "expired" | "superseded" | "terminated" | "archived";
export type AccessClass = "public" | "registered" | "mediated" | "research_controlled" | "community_controlled" | "sealed" | "closed";
export interface VersionContext { policyVersion: string; schemaVersion: string; jurisdiction: string; effectiveAt: string; expiresAt?: string; sourceManifestId: string; actorAuthorityId: string; auditEventId: string; }
export interface DeepTimePackage { id: string; sourceType: string; sourceId: string; state: LifecycleState; accessClass: AccessClass; culturalAuthorityIds: string[]; custodianIds: string[]; version: VersionContext; }
