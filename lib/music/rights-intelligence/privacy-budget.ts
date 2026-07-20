export interface PrivacyBudget {
  epsilonLimit: number
  epsilonSpent: number
  deltaLimit: number
  deltaSpent: number
}

export function canSpendPrivacyBudget(input: PrivacyBudget & {
  epsilonCost: number
  deltaCost: number
}): boolean {
  return input.epsilonSpent + input.epsilonCost <= input.epsilonLimit &&
    input.deltaSpent + input.deltaCost <= input.deltaLimit
}
