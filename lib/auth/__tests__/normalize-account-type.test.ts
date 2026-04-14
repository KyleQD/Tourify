import {
  isAllowedDbAccountType,
  normalizeAccountTypeForProfile,
} from '@/lib/auth/normalize-account-type'

describe('normalizeAccountTypeForProfile', () => {
  it.each([
    [undefined, 'general'],
    ['', 'general'],
    ['  ARTIST  ', 'artist'],
    ['venue', 'venue'],
    ['industry', 'organization'],
    ['INDUSTRY', 'organization'],
    ['tour_manager', 'general'],
    ['unknown_type', 'general'],
  ])('%j -> %s', (input, expected) => {
    expect(normalizeAccountTypeForProfile(input)).toBe(expected)
  })
})

describe('isAllowedDbAccountType', () => {
  it('accepts canonical values', () => {
    expect(isAllowedDbAccountType('general')).toBe(true)
    expect(isAllowedDbAccountType('Organization')).toBe(true)
  })

  it('rejects unknown', () => {
    expect(isAllowedDbAccountType('tour_manager')).toBe(false)
  })
})
