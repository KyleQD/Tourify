export type InstitutionalLifecycleState =
  | 'draft' | 'proposed' | 'under_review' | 'approved' | 'effective'
  | 'suspended' | 'revoked' | 'withdrawn' | 'expired' | 'superseded'
  | 'rejected' | 'archived';

export type LegalCharacter =
  | 'private_entity' | 'treaty_support_secretariat' | 'intergovernmental_organization'
  | 'specialized_agency_relationship' | 'unknown';

export interface VersionedInstitutionalRecord {
  id: string;
  state: InstitutionalLifecycleState;
  policyVersion: string;
  schemaVersion: string;
  jurisdiction: string;
  effectiveAt: string | null;
  expiresAt: string | null;
  sourceManifestId: string;
  auditEventId: string;
}

export interface ParticipantAuthority extends VersionedInstitutionalRecord {
  participantId: string;
  participantClass: 'state' | 'international_organization' | 'non_state_body' | 'observer';
  authorityType: string;
  authorizedScopes: string[];
  evidenceIds: string[];
}

export interface PublicLawServiceDefinition extends VersionedInstitutionalRecord {
  code: string;
  legalBasisId: string | null;
  allowedParticipantClasses: ParticipantAuthority['participantClass'][];
  allowedJurisdictions: string[];
  highImpact: boolean;
  nonAdjudicative: boolean;
}
