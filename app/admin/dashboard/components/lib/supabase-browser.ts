"use client"

import { supabase } from '@/lib/supabase/client'

export function createClient() {
  return supabase
}

export function getSupabase() {
  return supabase
}

export { supabase }
export default supabase
