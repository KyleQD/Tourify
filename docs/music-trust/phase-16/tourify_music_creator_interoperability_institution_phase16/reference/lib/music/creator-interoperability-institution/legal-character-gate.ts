import type { LegalCharacter } from './institution-domain';

interface EvaluateLegalCharacterInput {
  constitutiveInstrumentEffective: boolean;
  intergovernmentalPartiesVerified: boolean;
  relationshipAgreementEffective: boolean;
  requestedClaim: 'international_organization' | 'specialized_agency' | 'treaty' | 'private_entity';
}

interface LegalCharacterDecision { allowed: boolean; character: LegalCharacter; reasons: string[] }

export function evaluateLegalCharacter(input: EvaluateLegalCharacterInput): LegalCharacterDecision {
  const reasons: string[] = [];
  if (input.requestedClaim === 'private_entity') return { allowed: true, character: 'private_entity', reasons };
  if (!input.constitutiveInstrumentEffective || !input.intergovernmentalPartiesVerified) reasons.push('effective intergovernmental constitutive basis missing');
  if (input.requestedClaim === 'specialized_agency' && !input.relationshipAgreementEffective) reasons.push('effective specialized-agency relationship agreement missing');
  return { allowed: reasons.length === 0, character: reasons.length ? 'unknown' : input.requestedClaim === 'specialized_agency' ? 'specialized_agency_relationship' : 'intergovernmental_organization', reasons };
}
