interface TrustStatusInput { issuerRecognized:boolean; status:'active'|'suspended'|'revoked'|'expired'; keyCurrent:boolean; sourceFresh:boolean; }
export function evaluateTrustStatus(input: TrustStatusInput) {
  const active = input.issuerRecognized && input.status === 'active' && input.keyCurrent && input.sourceFresh;
  return { trusted: active, reason: active ? 'trusted' : 'default_deny' } as const;
}
