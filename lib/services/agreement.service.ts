import type { SupabaseClient } from '@supabase/supabase-js'

export interface RecordAgreementAcceptanceInput {
  templateId: string
  templateVersion: number
  userId: string
  organizationId?: string | null
  context?: string
  signatureMethod?: string
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Immutable-style acceptance row for org-supplied agreements (hiring, NDAs, etc.).
 * Templates are managed separately; counsel should review template copy per jurisdiction.
 */
export async function recordAgreementAcceptance(
  supabase: SupabaseClient,
  input: RecordAgreementAcceptanceInput
) {
  const { data, error } = await supabase
    .from('agreement_acceptances')
    .insert({
      template_id: input.templateId,
      template_version: input.templateVersion,
      user_id: input.userId,
      organization_id: input.organizationId ?? null,
      context: input.context ?? null,
      signature_method: input.signatureMethod ?? 'clickwrap',
      ip: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}
