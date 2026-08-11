export interface EmergencyCustodyTransferInput {
  sourceManifestVerified: boolean;
  destinationCapabilityVerified: boolean;
  restrictionProfileVerified: boolean;
  temporaryCustodyInstrumentEffective: boolean;
  returnOrDeletionDueAt: string;
  currentTime: string;
}

export function authorizeEmergencyCustodyTransfer(input: EmergencyCustodyTransferInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.sourceManifestVerified) reasons.push("source_manifest_unverified");
  if (!input.destinationCapabilityVerified) reasons.push("destination_capability_unverified");
  if (!input.restrictionProfileVerified) reasons.push("restriction_profile_unverified");
  if (!input.temporaryCustodyInstrumentEffective) reasons.push("custody_instrument_not_effective");
  if (new Date(input.returnOrDeletionDueAt) <= new Date(input.currentTime)) reasons.push("custody_period_invalid");
  return { allowed: reasons.length === 0, reasons };
}
