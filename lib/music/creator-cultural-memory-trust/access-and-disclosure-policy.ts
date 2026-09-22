import type { AccessClass } from "./deep-time-domain";
export interface AccessInput { accessClass:AccessClass; purposeApproved:boolean; culturalApproval:boolean; privacyApproval:boolean; legalHold:boolean; disputed:boolean; }
export function mayDisclose(i:AccessInput):boolean { if(i.legalHold||i.disputed||!i.purposeApproved||!i.privacyApproval)return false; if(["community_controlled","sealed","closed"].includes(i.accessClass)&&!i.culturalApproval)return false; return i.accessClass!=="closed"; }
