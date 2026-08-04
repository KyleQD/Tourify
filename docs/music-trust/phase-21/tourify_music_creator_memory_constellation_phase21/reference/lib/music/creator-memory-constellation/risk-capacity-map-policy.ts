export interface RiskCapacityRecord {
  regionCode: string;
  hazardTypes: string[];
  capacityTypes: string[];
  confidence: number;
  sourceUpdatedAt: string;
  preciseLocationRestricted: boolean;
}

export function projectPublicRiskCapacity(input: RiskCapacityRecord): Omit<RiskCapacityRecord, "preciseLocationRestricted"> {
  return {
    regionCode: input.regionCode,
    hazardTypes: [...input.hazardTypes],
    capacityTypes: [...input.capacityTypes],
    confidence: input.confidence,
    sourceUpdatedAt: input.sourceUpdatedAt
  };
}
