import { describe, it, expect, vi } from 'vitest'
import { WorkforceRecognitionService, recognitionError } from '@/lib/services/workforce-recognition.service'
import type { SupabaseClient } from '@supabase/supabase-js'
function client(rpc: ReturnType<typeof vi.fn>) { return { rpc } as unknown as SupabaseClient }
describe('verified workforce recognition service', () => {
  it('delegates verification to the atomic authenticated RPC without accepting an actor or award level', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'credit', error: null })
    expect(await new WorkforceRecognitionService(client(rpc)).verify('assignment','Role delivered successfully','Signed operational closeout')).toBe('credit')
    expect(rpc).toHaveBeenCalledWith('verify_workforce_assignment', { p_assignment: 'assignment', p_endorsement: 'Role delivered successfully', p_evidence: 'Signed operational closeout' })
  })
  it('propagates database authorization denial', async () => {
    const error = { code: '42501', message: 'Not authorized' }
    const rpc = vi.fn().mockResolvedValue({ error })
    await expect(new WorkforceRecognitionService(client(rpc)).verify('id','endorsement','evidence')).rejects.toBe(error)
    expect(recognitionError(error).status).toBe(403)
  })
  it('denies manager queue before reading assignments for another employer', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null })
    await expect(new WorkforceRecognitionService(client(rpc)).managerQueue('actor','venue','other')).rejects.toMatchObject({ code: '42501' })
  })
  it('sends revocation with reason and leaves level recalculation to the transaction', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    await new WorkforceRecognitionService(client(rpc)).revoke('credit','Fraudulent attendance confirmed')
    expect(rpc).toHaveBeenCalledWith('revoke_workforce_credit', { p_credit: 'credit', p_reason: 'Fraudulent attendance confirmed' })
  })
  it('does not turn an unavailable database into an empty success', async () => {
    const error = { code: '42P01', message: 'Missing table' }
    const rpc = vi.fn().mockResolvedValue({ error })
    await expect(new WorkforceRecognitionService(client(rpc)).profile('worker')).rejects.toBe(error)
    expect(recognitionError(error)).toEqual({ status: 503, message: 'Recognition is unavailable. Please try again later.' })
  })
  it.each([['23505',409],['P0002',404],['22023',422]])('maps %s to %s', (code,status) => {
    expect(recognitionError({ code }).status).toBe(status)
  })
})
