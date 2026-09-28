export type Remedy = "metadata_correction" | "access_copy" | "shared_custody" | "digital_return" | "physical_return_coordination" | "restriction_change";
export interface RepatriationInput { authorityVerified:boolean; provenanceReviewed:boolean; rightsReviewed:boolean; communityReviewed:boolean; requestedRemedy:Remedy; }
export function mayApproveRepatriation(i:RepatriationInput):boolean { return i.authorityVerified && i.provenanceReviewed && i.rightsReviewed && i.communityReviewed; }
