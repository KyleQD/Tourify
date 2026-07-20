export interface CompetenceGateInput { requestedPower:string; effectivePowers:string[]; amendmentEffective:boolean; participantApprovalComplete:boolean; suspended:boolean; }
export function evaluateCompetence(input:CompetenceGateInput):{allowed:boolean;reason:string}{
 if(input.suspended) return {allowed:false,reason:'institution_or_power_suspended'};
 if(!input.effectivePowers.includes(input.requestedPower)) return {allowed:false,reason:'power_not_in_effective_competence'};
 if(!input.amendmentEffective || !input.participantApprovalComplete) return {allowed:false,reason:'required_legal_effect_not_complete'};
 return {allowed:true,reason:'effective_exact_scope_competence'};
}
