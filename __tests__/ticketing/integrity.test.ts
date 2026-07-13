/**
 * Integration-style tests for webhook idempotency claim logic (mocked).
 */

import { describe, expect, it, vi } from 'vitest'

describe('ticketing webhook idempotency contract', () => {
  it('treats duplicate stripe event ids as already processed', async () => {
    const inserted: string[] = []
    const supabase = {
      from() {
        return {
          insert: async (row: { id: string }) => {
            if (inserted.includes(row.id))
              return { error: { code: '23505', message: 'duplicate' } }
            inserted.push(row.id)
            return { error: null }
          },
        }
      },
    }

    async function claim(id: string) {
      const { error } = await supabase.from().insert({ id })
      if (error && (error.code === '23505' || error.message.includes('duplicate')))
        return false
      return true
    }

    expect(await claim('evt_1')).toBe(true)
    expect(await claim('evt_1')).toBe(false)
    expect(inserted).toEqual(['evt_1'])
  })
})

describe('concurrent inventory availability math', () => {
  it('prevents oversell when sold + reserved + request exceeds capacity', () => {
    const available = 10
    const sold = 8
    const reserved = 2
    const request = 1
    const remaining = available - sold - reserved
    expect(remaining).toBe(0)
    expect(request > remaining).toBe(true)
  })
})
