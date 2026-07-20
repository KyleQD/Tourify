import type { ParticipantAuthority, PublicLawServiceDefinition } from './institution-domain';
interface Input { service: PublicLawServiceDefinition; authority: ParticipantAuthority | null; jurisdiction:string; localReservedPowerConflict:boolean; sourceCurrent:boolean; }
export function authorizePublicLawService(input: Input) {
  const reasons:string[]=[];
  if (input.service.state !== 'effective') reasons.push('service_not_effective');
  if (!input.service.legalBasisId) reasons.push('legal_basis_missing');
  if (!input.authority || input.authority.state !== 'effective') reasons.push('participant_authority_missing');
  if (input.authority && !input.service.allowedParticipantClasses.includes(input.authority.participantClass)) reasons.push('participant_class_not_allowed');
  if (!input.service.allowedJurisdictions.includes(input.jurisdiction)) reasons.push('jurisdiction_not_enabled');
  if (input.localReservedPowerConflict) reasons.push('local_reserved_power_conflict');
  if (!input.sourceCurrent) reasons.push('authoritative_source_stale');
  return { allowed: reasons.length === 0, reasons };
}
