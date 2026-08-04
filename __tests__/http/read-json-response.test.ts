import { describe, expect, it } from 'vitest'
import { readJsonResponse } from '@/lib/http/read-json-response'

describe('readJsonResponse', () => {
  it('parses valid JSON bodies', async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 })
    await expect(readJsonResponse<{ ok: boolean }>(response)).resolves.toEqual({ ok: true })
  })

  it('returns null for empty bodies instead of throwing', async () => {
    const response = new Response('', { status: 200 })
    await expect(readJsonResponse(response)).resolves.toBeNull()
  })

  it('returns null for truncated non-JSON bodies', async () => {
    const response = new Response('{', { status: 200 })
    await expect(readJsonResponse(response)).resolves.toBeNull()
  })
})
