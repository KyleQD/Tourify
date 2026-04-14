import { supabase } from '@/lib/supabase'
import type { EventParticipant } from '@/types/database.types'

export interface ListParticipantsArgs {
  eventId: string
}

export interface AddParticipantArgs {
  eventId: string
  participantType: EventParticipant['participant_type'] | string
  participantId: string
  role?: string
}

export interface RemoveParticipantArgs {
  eventId: string
  participantType: string
  participantId: string
}

export async function listParticipants({ eventId }: ListParticipantsArgs): Promise<EventParticipant[]> {
  if (!eventId) return []
  const { data, error } = await supabase
    .from('event_participants')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function addParticipant({ eventId, participantType, participantId, role }: AddParticipantArgs): Promise<EventParticipant> {
  if (!eventId || !participantId || !participantType) throw new Error('Missing required fields')
  const { data, error } = await supabase
    .from('event_participants')
    .insert({
      event_id: eventId,
      participant_type: participantType,
      participant_id: participantId,
      role: role ?? null
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function removeParticipant({ eventId, participantType, participantId }: RemoveParticipantArgs): Promise<boolean> {
  if (!eventId || !participantId || !participantType) return false
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .match({ event_id: eventId, participant_type: participantType, participant_id: participantId })

  if (error) throw error
  return true
}


