import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }))
import { POST as managerPost, GET as managerGet } from '@/app/api/admin/workforce/recognition/route'
import { GET as profileGet, PATCH as visibilityPatch } from '@/app/api/workforce/recognition/route'
const worker = '11111111-1111-4111-8111-111111111111'
const assignment = '22222222-2222-4222-8222-222222222222'
function post(body: object) { return new NextRequest('http://localhost/api/admin/workforce/recognition', { method: 'POST', body: JSON.stringify(body) }) }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: worker } } }) }, rpc: mocks.rpc })
  mocks.rpc.mockResolvedValue({ data: 'credit', error: null })
})
describe('workforce recognition request boundary', () => {
  it('requires authenticated identity', async () => {
    mocks.createClient.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } })
    expect((await managerPost(post({}))).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('refuses client-supplied verifier and level fields', async () => {
    const response = await managerPost(post({ action: 'verify', assignment_id: assignment, endorsement: 'Role completed successfully', evidence: 'Checked operational closeout', verified_by: worker, level: 5 }))
    expect(response.status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('returns 403 when database rejects self or cross-employer verification', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: '42501' } })
    const response = await managerPost(post({ action: 'verify', assignment_id: assignment, endorsement: 'Role completed successfully', evidence: 'Checked operational closeout' }))
    expect(response.status).toBe(403)
  })
  it('maps duplicate event credit to conflict', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: '23505' } })
    expect((await managerPost(post({ action: 'verify', assignment_id: assignment, endorsement: 'Role completed successfully', evidence: 'Checked operational closeout' }))).status).toBe(409)
  })
  it('requires employer scope for a manager queue', async () => {
    expect((await managerGet(new NextRequest('http://localhost/api/admin/workforce/recognition'))).status).toBe(400)
  })
  it('validates profile identity and disables shared caching', async () => {
    expect((await profileGet(new NextRequest('http://localhost/api/workforce/recognition?user_id=bad'))).status).toBe(400)
    mocks.rpc.mockResolvedValue({ data: { badges: [], endorsements: [], history: [], is_public: false } })
    const response = await profileGet(new NextRequest('http://localhost/api/workforce/recognition'))
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(mocks.rpc).toHaveBeenCalledWith('workforce_recognition_profile', { p_user: worker })
  })
  it('does not permit changing another user visibility', async () => {
    expect((await visibilityPatch(new NextRequest('http://localhost', { method: 'PATCH', body: JSON.stringify({ is_public: true, user_id: assignment }) }))).status).toBe(400)
  })
  it('rejects malformed JSON without awarding', async () => {
    expect((await managerPost(new NextRequest('http://localhost', { method: 'POST', body: '{bad' }))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
