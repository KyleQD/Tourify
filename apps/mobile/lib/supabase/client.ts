import * as SecureStore from "expo-secure-store"
import { createClient } from "@supabase/supabase-js"
import { env } from "@/lib/config/env"

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key)
}

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: "pkce",
    storage: secureStorage
  },
  global: {
    headers: {
      "X-Client-Info": "tourify-mobile"
    }
  }
})
