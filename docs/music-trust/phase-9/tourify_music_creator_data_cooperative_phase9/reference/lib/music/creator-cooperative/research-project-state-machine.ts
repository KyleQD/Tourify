export type ResearchState = "concept" | "application" | "diligence" | "ethics_review" | "privacy_review" | "competition_review" | "approved" | "licensed" | "active" | "output_review" | "published" | "closed" | "terminated"

const next: Partial<Record<ResearchState, ResearchState[]>> = {
  concept: ["application", "terminated"], application: ["diligence", "terminated"],
  diligence: ["ethics_review", "terminated"], ethics_review: ["privacy_review", "terminated"],
  privacy_review: ["competition_review", "terminated"], competition_review: ["approved", "terminated"],
  approved: ["licensed", "terminated"], licensed: ["active", "terminated"],
  active: ["output_review", "terminated"], output_review: ["published", "terminated"],
  published: ["closed"], closed: [], terminated: [],
}

export function canTransitionResearch(input: { from: ResearchState; to: ResearchState }): boolean {
  return next[input.from]?.includes(input.to) ?? false
}
