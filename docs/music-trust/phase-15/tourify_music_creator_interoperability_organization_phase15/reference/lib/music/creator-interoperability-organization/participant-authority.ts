export interface ParticipantAuthorityInput {
  participantClass: "state" | "international_organization" | "creator_body" | "observer";
  authorityInstrumentCurrent: boolean;
  signatoryAuthorized: boolean;
  internalApprovalComplete: boolean;
  effective: boolean;
  suspended: boolean;
}
export function canBindParticipant(input: ParticipantAuthorityInput): boolean {
  return input.authorityInstrumentCurrent && input.signatoryAuthorized && input.internalApprovalComplete && input.effective && !input.suspended;
}
