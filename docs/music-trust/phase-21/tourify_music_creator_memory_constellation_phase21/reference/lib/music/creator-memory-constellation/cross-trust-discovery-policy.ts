export interface DiscoveryProjectionInput {
  findingAidApproved: boolean;
  accessClass: string;
  disputed: boolean;
  revoked: boolean;
  fields: Record<string, unknown>;
  approvedPublicFields: string[];
}

export function buildDiscoveryProjection(input: DiscoveryProjectionInput): Record<string, unknown> | null {
  if (!input.findingAidApproved || input.revoked || input.accessClass === "closed") return null;
  const result: Record<string, unknown> = { disputed: input.disputed, accessClass: input.accessClass };
  for (const key of input.approvedPublicFields) {
    if (Object.prototype.hasOwnProperty.call(input.fields, key)) result[key] = input.fields[key];
  }
  return result;
}
