"use client"

import { supabase } from '@/lib/supabase'

export function createClient() {
  return supabase
}

export function getSupabase() {
  return supabase
}

export { supabase }
export default supabase
