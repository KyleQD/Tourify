export interface AssetTransferInput {
  classification: "transferable" | "restricted" | "escrowed" | "public_trust" | "inalienable"
  authorityApproved: boolean
  publicNoticeComplete: boolean
  conflictsCleared: boolean
  replacementPlanApproved: boolean
  rollbackAvailable: boolean
}
export function evaluateAssetTransfer(input:AssetTransferInput){
  const reasons:string[]=[]
  if(input.classification==="inalienable") reasons.push("ASSET_INALIENABLE")
  if(!input.authorityApproved) reasons.push("AUTHORITY_APPROVAL_REQUIRED")
  if(!input.publicNoticeComplete) reasons.push("PUBLIC_NOTICE_REQUIRED")
  if(!input.conflictsCleared) reasons.push("CONFLICT_REVIEW_REQUIRED")
  if(!input.replacementPlanApproved) reasons.push("REPLACEMENT_PLAN_REQUIRED")
  if(!input.rollbackAvailable && input.classification!=="public_trust") reasons.push("ROLLBACK_REQUIRED")
  return {allowed:reasons.length===0,reasons}
}
