export interface ConferenceDecisionInput { withinCompetence:boolean; quorumMet:boolean; credentialsApproved:boolean; noticeComplete:boolean; conflictsResolved:boolean; requiredThresholdMet:boolean; }
export function mayAdoptConferenceDecision(i:ConferenceDecisionInput){
 const failures:string[]=[]; if(!i.withinCompetence)failures.push('outside_competence'); if(!i.quorumMet)failures.push('quorum'); if(!i.credentialsApproved)failures.push('credentials'); if(!i.noticeComplete)failures.push('notice'); if(!i.conflictsResolved)failures.push('conflicts'); if(!i.requiredThresholdMet)failures.push('threshold'); return {allowed:failures.length===0,failures};
}
