export interface HorizonImpact {
  horizon: 'immediate' | 'medium' | 'long' | 'very_long';
  benefits: string[];
  burdens: string[];
  affectedGroups: string[];
  uncertainty: 'low' | 'medium' | 'high' | 'unknown';
  irreversible: boolean;
  mitigation: string[];
}

export function validateIntergenerationalAssessment(input: { impacts: HorizonImpact[]; alternatives: string[]; reviewTrigger?: string }) {
  const horizons = new Set(input.impacts.map((item) => item.horizon));
  const required = ['immediate', 'medium', 'long', 'very_long'];
  const missing = required.filter((item) => !horizons.has(item as HorizonImpact['horizon']));
  return { valid: missing.length === 0 && input.alternatives.length > 0, missingHorizons: missing };
}
