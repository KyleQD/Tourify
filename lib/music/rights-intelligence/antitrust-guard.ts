const blockedPatterns = [
  /minimum (rate|price|fee)/i,
  /price floor/i,
  /everyone should (charge|demand|refuse)/i,
  /boycott/i,
  /do not deal with/i,
  /divide (customers|markets|territories)/i,
  /future (price|rate|discount)/i,
]

export interface TopicScreenResult {
  allowed: boolean
  matchedPatterns: string[]
}

export function screenCompetitionSensitiveTopic(text: string): TopicScreenResult {
  const matches = blockedPatterns.filter((pattern) => pattern.test(text)).map(String)
  return { allowed: matches.length === 0, matchedPatterns: matches }
}
