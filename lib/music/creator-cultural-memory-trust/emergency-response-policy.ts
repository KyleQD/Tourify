export interface EmergencyInput { enumeratedGround:boolean; dualControl:boolean; expiresAt:string; scopeLimited:boolean; publicNoticePlanned:boolean; afterActionReview:boolean; }
export function mayUseEmergencyPower(i:EmergencyInput):boolean { return i.enumeratedGround && i.dualControl && Date.parse(i.expiresAt)>Date.now() && i.scopeLimited && i.publicNoticePlanned && i.afterActionReview; }
