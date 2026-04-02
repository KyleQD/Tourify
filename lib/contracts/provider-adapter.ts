import type { SupabaseClient } from '@supabase/supabase-js'

export const CONTRACT_PROVIDERS = ['internal', 'docusign', 'dropboxsign', 'pandadoc'] as const

export type ContractProvider = (typeof CONTRACT_PROVIDERS)[number]

export interface SendHireContractInput {
  ownerUserId: string
  counterpartyUserId: string
  clientName: string
  clientEmail?: string | null
  title: string
  terms: string
  provider: ContractProvider
  metadata?: Record<string, unknown>
}

export interface SendHireContractResult {
  provider: ContractProvider
  contractId: string
  status: string
  signingUrl: string
}

function getExternalProviderBaseUrl(provider: ContractProvider): string | null {
  if (provider === 'docusign') return process.env.DOCUSIGN_APP_BASE_URL || null
  if (provider === 'dropboxsign') return process.env.DROPBOXSIGN_APP_BASE_URL || null
  if (provider === 'pandadoc') return process.env.PANDADOC_APP_BASE_URL || null
  return null
}

export async function sendHireContractWithProvider(input: {
  supabase: SupabaseClient
  payload: SendHireContractInput
}): Promise<SendHireContractResult> {
  const { supabase, payload } = input

  const today = new Date().toISOString().slice(0, 10)
  const baseMetadata = {
    ...(payload.metadata || {}),
    provider: payload.provider,
    workflow: 'hire_to_contract',
  }

  const { data: created, error: createError } = await supabase
    .from('artist_contracts')
    .insert({
      user_id: payload.ownerUserId,
      counterparty_user_id: payload.counterpartyUserId,
      title: payload.title,
      type: 'other',
      client_name: payload.clientName,
      client_email: payload.clientEmail || '',
      amount: 0,
      currency: 'USD',
      start_date: today,
      status: 'draft',
      terms: payload.terms,
      metadata: baseMetadata,
    })
    .select('id, status')
    .single()

  if (createError || !created?.id)
    throw new Error(createError?.message || 'Failed to create contract record')

  const internalFallbackUrl = `/contracts/${created.id}`
  if (payload.provider === 'internal') {
    const { error: sendError } = await supabase.rpc('send_artist_contract', {
      p_contract_id: created.id,
    })
    if (sendError) throw new Error(sendError.message)

    return {
      provider: payload.provider,
      contractId: created.id,
      status: 'sent',
      signingUrl: internalFallbackUrl,
    }
  }

  const providerBaseUrl = getExternalProviderBaseUrl(payload.provider)
  const signingUrl = providerBaseUrl
    ? `${providerBaseUrl.replace(/\/$/, '')}/contracts/${created.id}`
    : internalFallbackUrl

  await supabase
    .from('artist_contracts')
    .update({
      status: 'sent',
      metadata: {
        ...baseMetadata,
        external_provider_state: 'awaiting_signature',
        signing_url: signingUrl,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', created.id)

  return {
    provider: payload.provider,
    contractId: created.id,
    status: 'sent',
    signingUrl,
  }
}
