"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface Task {
  id?: string
  event_id: string
  title: string
  description?: string
  assigned_to: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
}

export async function addTask(task: Task) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_tasks')
    .insert([task])
    .select()
    .single()

  if (error) {
    console.error('Error adding task:', error)
    throw new Error('Failed to add task')
  }

  revalidatePath(`/artist/events/${task.event_id}`)
  return data
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating task:', error)
    throw new Error('Failed to update task')
  }

  revalidatePath(`/artist/events/${data.event_id}`)
  return data
}

export async function deleteTask(id: string) {
  const supabase = await createClient()
  
  const { data: task, error: fetchError } = await supabase
    .from('event_tasks')
    .select('event_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    console.error('Error fetching task:', fetchError)
    throw new Error('Failed to fetch task')
  }

  const { error } = await supabase
    .from('event_tasks')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting task:', error)
    throw new Error('Failed to delete task')
  }

  revalidatePath(`/artist/events/${task.event_id}`)
  return { success: true }
}

export async function getEventTasks(eventId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('event_tasks')
    .select('*')
    .eq('event_id', eventId)
    .order('due_date', { ascending: true })

  if (error) {
    console.error('Error fetching event tasks:', error)
    throw new Error('Failed to fetch event tasks')
  }

  return data
} 