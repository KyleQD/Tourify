/**
 * Comment clarifying tour_manager signup maps to General human identity.
 * Tour managers receive Admin / Work Mode grants; they are not a public persona.
 * See docs/organization-personas.md.
 */
import { describe, expect, it } from 'vitest'
import { normalizeAccountTypeForProfile } from '@/lib/auth/normalize-account-type'

describe('tour manager identity', () => {
  it('normalizes tour_manager signup to general', () => {
    expect(normalizeAccountTypeForProfile('tour_manager')).toBe('general')
  })
})
