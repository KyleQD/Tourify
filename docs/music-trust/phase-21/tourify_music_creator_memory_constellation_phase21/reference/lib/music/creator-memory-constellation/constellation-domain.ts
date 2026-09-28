export type LifecycleState =
  | "draft" | "proposed" | "under_review" | "approved" | "effective"
  | "active" | "standby" | "assistance_requested" | "assistance_authorized"
  | "executing" | "reconciliation_due" | "completed" | "partially_completed"
  | "suspended" | "disputed" | "revoked" | "withdrawn" | "expired"
  | "superseded" | "terminated" | "rejected" | "archived";

export interface VersionedAuthorityRef {
  id: string;
  sourceType: string;
  sourceVersion: string;
  jurisdiction: string;
  effectiveAt: string;
  expiresAt?: string;
  suspended: boolean;
  revoked: boolean;
  disputed: boolean;
}

export interface RestrictionProfile {
  id: string;
  version: string;
  sourceAuthority: VersionedAuthorityRef;
  allowedPurposes: string[];
  prohibitedPurposes: string[];
  allowedRecipients: string[];
  allowedLocations: string[];
  accessClass: "public" | "registered" | "mediated" | "research_controlled" | "community_controlled" | "sealed" | "closed";
  onwardTransferAllowed: boolean;
  aiTrainingAllowed: boolean;
  commercialReuseAllowed: boolean;
}

export interface MutualAidRequest {
  id: string;
  idempotencyKey: string;
  sourceTrustId: string;
  receivingTrustId: string;
  purpose: string;
  collectionRefs: string[];
  restrictionProfileIds: string[];
  requestedAt: string;
  expiresAt: string;
  state: LifecycleState;
}
