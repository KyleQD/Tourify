import type { ParticipantAuthority } from './institution-domain';

interface AuthorizeParticipantActionInput {
  authority: ParticipantAuthority | null;
  requiredScope: string;
  now: string;
}
export function authorizeParticipantAction(input: AuthorizeParticipantActionInput) {
  if (!input.authority) return { allowed: false, reason: 'authority_missing' } as const;
  if (input.authority.state !== 'effective') return { allowed: false, reason: 'authority_not_effective' } as const;
  if (input.authority.expiresAt && input.authority.expiresAt <= input.now) return { allowed: false, reason: 'authority_expired' } as const;
  if (!input.authority.authorizedScopes.includes(input.requiredScope)) return { allowed: false, reason: 'scope_not_authorized' } as const;
  return { allowed: true, reason: 'authorized' } as const;
}
