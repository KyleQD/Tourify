"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface Equipment {
  id?: string
  event_id: string
  name: string
  description?: string
  quantity: number
  status: 'available' | 'in_use' | 'maintenance'
  notes?: string
}

export async function addEquipment(equipment: Equipment) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_equipment')
    .insert([equipment])
    .select()
    .single()

  if (error) {
    console.error('Error adding equipment:', error)
    throw new Error('Failed to add equipment')
  }

  revalidatePath(`/artist/events/${equipment.event_id}`)
  return data
}

export async function updateEquipment(id: string, updates: Partial<Equipment>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_equipment')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating equipment:', error)
    throw new Error('Failed to update equipment')
  }

  revalidatePath(`/artist/events/${data.event_id}`)
  return data
}

export async function deleteEquipment(id: string) {
  const supabase = await createClient()
  
  const { data: equipment, error: fetchError } = await supabase
    .from('event_equipment')
    .select('event_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching equipment:', fetchError)
    throw new Error('Failed to fetch equipment')
  }

  const { error } = await supabase
    .from('event_equipment')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting equipment:', error)
    throw new Error('Failed to delete equipment')
  }

  revalidatePath(`/artist/events/${equipment.event_id}`)
  return { success: true }
}

export async function getEventEquipment(eventId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_equipment')
    .select('*')
    .eq('event_id', eventId)
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching event equipment:', error)
    throw new Error('Failed to fetch event equipment')
  }

  return data
} 