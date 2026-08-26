import { profileIndicatesAdminAccess } from '@/lib/auth/admin-profile-gates'

describe('profileIndicatesAdminAccess', () => {
  it.each([
    ['null profile', null, false],
    ['empty profile', {}, false],
    ['is_admin', { is_admin: true }, true],
    ['role admin', { role: 'admin' }, true],
    // ADM-M-003: self-serviceable shapes are no longer grants
    ['account_type admin (not a grant)', { account_type: 'admin' } as any, false],
    ['account_type organizer (not a grant)', { account_type: 'organizer' } as any, false],
    ['account_type organization (not a grant)', { account_type: 'organization' } as any, false],
    ['legacy organizer_data (not a grant)', { account_settings: { organizer_data: { organization_name: 'Acme' } } } as any, false],
    ['organizer_accounts array (not a grant)', { account_settings: { organizer_accounts: [{}] } } as any, false],
    ['non-admin role', { role: 'viewer', account_type: 'general' } as any, false],
  ])('%s', (_label, profile, expected) => {
    expect(profileIndicatesAdminAccess(profile as any)).toBe(expected)
  })
})
