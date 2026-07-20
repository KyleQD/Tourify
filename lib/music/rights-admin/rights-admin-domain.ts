export type AdministrationCaseStatus =
  | "draft" | "needs_authority" | "ready" | "approved" | "submitted"
  | "accepted" | "accepted_with_changes" | "rejected" | "conflict"
  | "disputed" | "suspended" | "collected" | "closed";

export interface RightsScope {
  assetId: string;
  assetKind: "musical_work" | "sound_recording" | "release" | "party";
  rightCategory: string;
  territoryCodes: string[];
  validFrom?: string;
  validThrough?: string;
  controlledShareNumerator?: bigint;
  controlledShareDenominator?: bigint;
}

export interface AdministrationCase {
  id: string;
  caseType: string;
  ownerUserId: string;
  organizationId?: string;
  mandateVersionId: string;
  scope: RightsScope;
  status: AdministrationCaseStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}
