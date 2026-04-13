'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Event {
  id: string
  name: string
  date: string
  status: 'draft' | 'active' | 'completed' | 'cancelled'
  location: string
  venue?: string
  capacity: number
  tickets_sold: number
  revenue: number
  cover_image_url?: string
  created_at: string
  updated_at: string
}

export interface EventWizardMainData {
  name: string
  date: string
  location: string
  venue?: string
  capacity: number
  cover_image_url?: string
}

export async function fetchEvents(userId: string): Promise<Event[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', userId)
    .order('date', { ascending: true })
  
  if (error) {
    console.error('Error fetching events:', error)
    return []
  }
  return data || []
}

export async function createEvent(userId: string, data: EventWizardMainData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .insert([{ ...data, created_by: userId, status: 'draft' }])
  
  if (error) throw error
  
  revalidatePath('/artist/events')
}

export async function updateEvent(userId: string, eventId: string, data: EventWizardMainData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .update(data)
    .eq('id', eventId)
    .eq('created_by', userId)
  
  if (error) throw error
  
  revalidatePath('/artist/events')
}

export async function deleteEvent(userId: string, eventId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('created_by', userId)
  
  if (error) throw error
  
  revalidatePath('/artist/events')
} 