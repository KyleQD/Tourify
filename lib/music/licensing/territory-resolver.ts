export interface TerritoryRule { includes: string[]; excludes: string[]; startsAt: string; endsAt?: string | null }
export function territoryAllowed(rule: TerritoryRule, territory: string, at: Date): boolean {
  const start = new Date(rule.startsAt); const end = rule.endsAt ? new Date(rule.endsAt) : null
  if (at < start || (end && at > end)) return false
  if (rule.excludes.includes(territory)) return false
  return rule.includes.includes("WORLDWIDE") || rule.includes.includes(territory)
}
