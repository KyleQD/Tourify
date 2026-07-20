export type ReviewState = "filed" | "screening" | "accepted" | "panel_appointed" | "briefing" | "hearing" | "decided" | "remedy_pending" | "closed" | "dismissed"
const transitions: Record<ReviewState, ReviewState[]> = {
  filed:["screening"], screening:["accepted","dismissed"], accepted:["panel_appointed"], panel_appointed:["briefing"], briefing:["hearing","decided"], hearing:["decided"], decided:["remedy_pending","closed"], remedy_pending:["closed"], closed:[], dismissed:[]
}
export function canTransitionReview(from: ReviewState,to:ReviewState){ return transitions[from].includes(to) }
