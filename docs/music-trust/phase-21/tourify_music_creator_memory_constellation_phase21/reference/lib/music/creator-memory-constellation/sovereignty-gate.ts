export interface SovereigntyGateInput {
  requestedScope: string[];
  delegatedScopes: string[];
  reservedScopes: string[];
  authorityCurrent: boolean;
  localDecisionConflict: boolean;
}

export interface SovereigntyGateResult { allowed: boolean; reasons: string[]; }

export function evaluateSovereigntyGate(input: SovereigntyGateInput): SovereigntyGateResult {
  const reasons: string[] = [];
  if (!input.authorityCurrent) reasons.push("authority_not_current");
  if (input.localDecisionConflict) reasons.push("local_decision_conflict");
  for (const scope of input.requestedScope) {
    if (!input.delegatedScopes.includes(scope)) reasons.push(`scope_not_delegated:${scope}`);
    if (input.reservedScopes.includes(scope)) reasons.push(`scope_reserved:${scope}`);
  }
  return { allowed: reasons.length === 0, reasons };
}
