import type { SupabaseClient } from '@supabase/supabase-js'
import type { RecognitionProfile, ManagerRecognition } from '@/lib/workforce/recognition-types'

/** Use a request-scoped authenticated client. No service-role fallback or client actor id. */
export class WorkforceRecognitionService {
  constructor(private readonly db: SupabaseClient) {}
  async profile(userId: string): Promise<RecognitionProfile> {
    const { data, error } = await this.db.rpc('workforce_recognition_profile', { p_user: userId })
    if (error) throw error
    return data as RecognitionProfile
  }
  async verify(assignmentId: string, endorsement: string, evidence: string): Promise<string> {
    const { data, error } = await this.db.rpc('verify_workforce_assignment', {
      p_assignment: assignmentId, p_endorsement: endorsement, p_evidence: evidence,
    })
    if (error) throw error
    return data as string
  }
  async revoke(creditId: string, reason: string): Promise<void> {
    const { error } = await this.db.rpc('revoke_workforce_credit', { p_credit: creditId, p_reason: reason })
    if (error) throw error
  }
  async visibility(userId: string, isPublic: boolean): Promise<void> {
    const { error } = await this.db.from('workforce_recognition_visibility')
      .upsert({ user_id: userId, is_public: isPublic })
    if (error) throw error
  }
  async managerQueue(actorId: string, entityType: string, entityId: string): Promise<ManagerRecognition> {
    const { data: allowed, error: permissionError } = await this.db.rpc('can_manage_hiring', {
      p_user_id: actorId, p_entity_type: entityType, p_entity_id: entityId,
    })
    if (permissionError) throw permissionError
    if (!allowed) throw { code: '42501', message: 'Employer/manager permission required' }
    const [assignments, credits] = await Promise.all([
      this.db.from('employment_assignments')
        .select('id,user_id,role_title,role_key,status,starts_at,ends_at,event_id,tour_id')
        .eq('employer_entity_type', entityType).eq('employer_entity_id', entityId)
        .in('status', ['confirmed', 'active', 'completed']).order('ends_at', { ascending: false }).limit(200),
      this.db.from('workforce_role_credits')
        .select('id,assignment_id,user_id,role_key,verified_by,verified_at,endorsement,evidence,endorsement_expires_at,revoked_at,revocation_reason')
        .eq('employer_entity_type', entityType).eq('employer_entity_id', entityId)
        .order('verified_at', { ascending: false }).limit(200),
    ])
    if (assignments.error) throw assignments.error
    if (credits.error) throw credits.error
    return { assignments: assignments.data ?? [], credits: credits.data ?? [] }
  }
}
export function recognitionError(error: unknown): { status: number; message: string } {
  const e = error as { code?: string; message?: string }
  if (e.code === '42501') return { status: 403, message: 'Employer/manager permission required' }
  if (e.code === 'P0002') return { status: 404, message: 'Record not found' }
  if (e.code === '23505') return { status: 409, message: 'This worker already has credit for this role/event or overlapping tour work.' }
  if (e.code === '22023') return { status: 422, message: e.message ?? 'Completion requirements not met' }
  return { status: 503, message: 'Recognition is unavailable. Please try again later.' }
}
