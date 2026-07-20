export interface UsageCandidate { assetId: string; identifierScore: number; metadataScore: number; audioScore: number; versionPenalty: number; }
export interface UsageMatch { assetId?: string; score: number; decision: "auto_candidate" | "manual_review" | "no_match"; }
export function rankUsageCandidates(candidates: UsageCandidate[]): UsageMatch {
  const ranked = candidates.map((c) => ({ assetId:c.assetId, score:(c.identifierScore*0.5)+(c.metadataScore*0.25)+(c.audioScore*0.25)-c.versionPenalty })).sort((a,b)=>b.score-a.score);
  const top=ranked[0]; if(!top) return {score:0,decision:"no_match"};
  return { ...top, decision: top.score >= .98 ? "auto_candidate" : top.score >= .70 ? "manual_review" : "no_match" };
}
