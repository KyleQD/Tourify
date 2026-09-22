export type ReuseType = "preservation_processing" | "research" | "commercial" | "ai_training" | "voice_model" | "style_model" | "embedding";
export interface ReuseInput { type:ReuseType; explicitAuthority:boolean; privacyApproved:boolean; culturalApproved:boolean; outputReview:boolean; benefitPlan:boolean; }
export function mayReuse(i:ReuseInput):boolean { if(i.type==="preservation_processing") return i.privacyApproved && i.culturalApproved; return i.explicitAuthority && i.privacyApproved && i.culturalApproved && i.outputReview && i.benefitPlan; }
