export interface TerminationCandidateInput { executionDate: Date; publicationDate?: Date; includesPublicationRight: boolean; workMadeForHire: boolean; }
export interface TerminationCandidate { eligibleForReview: boolean; earliestServiceDate?: Date; reason: string; }
function addYears(date: Date, years: number): Date { const next=new Date(date); next.setUTCFullYear(next.getUTCFullYear()+years); return next; }
export function calculateSection203Candidate(input: TerminationCandidateInput): TerminationCandidate {
  if (input.workMadeForHire) return { eligibleForReview:false, reason:"work_made_for_hire_requires_counsel_review" };
  const base = input.includesPublicationRight && input.publicationDate ? (input.publicationDate < input.executionDate ? input.publicationDate : input.executionDate) : input.executionDate;
  return { eligibleForReview:true, earliestServiceDate:addYears(base,25), reason:"candidate_only_not_legal_determination" };
}
