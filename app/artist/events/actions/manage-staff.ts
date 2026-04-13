"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface StaffMember {
  id?: string
  event_id: string
  name: string
  role: string
  status: 'confirmed' | 'pending' | 'declined'
  contact: string
}

export async function addStaffMember(staff: StaffMember) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_staff')
    .insert([staff])
    .select()
    .single()

  if (error) {
    console.error('Error adding staff member:', error)
    throw new Error('Failed to add staff member')
  }

  revalidatePath(`/artist/events/${staff.event_id}`)
  return data
}

export async function updateStaffMember(id: string, updates: Partial<StaffMember>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_staff')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating staff member:', error)
    throw new Error('Failed to update staff member')
  }

  revalidatePath(`/artist/events/${data.event_id}`)
  return data
}

export async function deleteStaffMember(id: string) {
  const supabase = await createClient()
  
  const { data: staff, error: fetchError } = await supabase
    .from('event_staff')
    .select('event_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching staff member:', fetchError)
    throw new Error('Failed to fetch staff member')
  }

  const { error } = await supabase
    .from('event_staff')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting staff member:', error)
    throw new Error('Failed to delete staff member')
  }

  revalidatePath(`/artist/events/${staff.event_id}`)
  return { success: true }
}

export async function getEventStaff(eventId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_staff')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching event staff:', error)
    throw new Error('Failed to fetch event staff')
  }

  return data
} 