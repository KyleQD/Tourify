"use server"

import { z } from 'zod'
import { createSafeActionClient } from 'next-safe-action'
import { createClient } from '@/lib/supabase/server'

const action = createSafeActionClient()

const ContractSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  type: z.enum(['performance','licensing','recording','management','publishing','endorsement','other']),
  client_name: z.string().min(1),
  client_email: z.string().email().optional().or(z.literal('')),
  client_company: z.string().optional().or(z.literal('')),
  amount: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  start_date: z.string().min(4),
  end_date: z.string().optional().or(z.literal('')),
  status: z.enum(['draft','sent','signed','expired','cancelled']).default('draft'),
  terms: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  document_url: z.string().url().optional().or(z.literal('')),
  counterparty_user_id: z.string().uuid().optional().nullable(),
  template_id: z.string().max(200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const createContractAction = action
  .schema(ContractSchema.omit({ id: true }))
  .action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error, data } = await supabase
    .from('artist_contracts')
    .insert({ ...parsedInput, user_id: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
})

export const updateContractAction = action
  .schema(ContractSchema.required({ id: true }))
  .action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { id, ...update } = parsedInput
  const { error, data } = await supabase
    .from('artist_contracts')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
})

export const deleteContractAction = action
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('artist_contracts')
    .delete()
    .eq('id', parsedInput.id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
})

export const updateContractStatusAction = action
  .schema(z.object({ id: z.string().uuid(), status: z.enum(['draft','sent','signed','expired','cancelled']) }))
  .action(async ({ parsedInput }) => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error, data } = await supabase
    .from('artist_contracts')
    .update({ status: parsedInput.status, updated_at: new Date().toISOString() })
    .eq('id', parsedInput.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
})


