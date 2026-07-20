export interface ResolveMandateInput {
  action: string;
  assetId: string;
  rightCategory: string;
  territoryCode: string;
  serviceCode: string;
  at: Date;
  mandates: Array<{
    id: string; status: "active" | "suspended" | "revoked" | "expired";
    assetIds: string[]; rightCategories: string[]; territoryCodes: string[];
    serviceCodes: string[]; startsAt: Date; endsAt?: Date;
  }>;
}

export interface MandateResolution { allowed: boolean; mandateId?: string; reason: string; }

export function resolveMandate(input: ResolveMandateInput): MandateResolution {
  const match = input.mandates.find((m) =>
    m.status === "active" && m.startsAt <= input.at && (!m.endsAt || m.endsAt >= input.at) &&
    m.assetIds.includes(input.assetId) && m.rightCategories.includes(input.rightCategory) &&
    (m.territoryCodes.includes("WORLDWIDE") || m.territoryCodes.includes(input.territoryCode)) &&
    m.serviceCodes.includes(input.serviceCode));
  return match ? { allowed: true, mandateId: match.id, reason: "active_exact_scope" }
    : { allowed: false, reason: "no_active_exact_scope_mandate" };
}
