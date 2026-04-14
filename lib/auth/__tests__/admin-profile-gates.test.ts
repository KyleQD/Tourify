import { profileIndicatesAdminAccess } from '@/lib/auth/admin-profile-gates'

describe('profileIndicatesAdminAccess', () => {
  it.each([
    ['null profile', null, false],
    ['empty profile', {}, false],
    ['is_admin', { is_admin: true }, true],
    ['role admin', { role: 'admin' }, true],
    ['account_type admin', { account_type: 'admin' }, true],
    ['account_type organizer', { account_type: 'organizer' }, true],
    ['account_type organization', { account_type: 'organization' }, true],
    ['legacy organizer_data', { account_settings: { organizer_data: { organization_name: 'Acme' } } }, true],
    ['organizer_accounts array', { account_settings: { organizer_accounts: [{}] } }, true],
    ['non-admin role', { role: 'viewer', account_type: 'general' }, false],
  ])('%s', (_label, profile, expected) => {
    expect(profileIndicatesAdminAccess(profile as any)).toBe(expected)
  })
})
