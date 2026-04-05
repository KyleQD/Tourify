import Constants from "expo-constants"

interface MobileEnv {
  apiBaseUrl: string
  supabaseUrl: string
  supabaseAnonKey: string
}

function getExtraValue(key: string): string | undefined {
  const value = Constants.expoConfig?.extra?.[key]
  if (!value) return undefined
  if (typeof value !== "string") return undefined
  return value
}

function requireValue(value: string | undefined, name: string) {
  if (!value) throw new Error(`Missing mobile environment variable: ${name}`)
  return value
}

export const env: MobileEnv = {
  apiBaseUrl: requireValue(getExtraValue("apiBaseUrl"), "apiBaseUrl"),
  supabaseUrl: requireValue(getExtraValue("supabaseUrl"), "supabaseUrl"),
  supabaseAnonKey: requireValue(getExtraValue("supabaseAnonKey"), "supabaseAnonKey")
}
