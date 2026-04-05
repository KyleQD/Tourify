import { createContext, useContext, useEffect, useMemo, useState } from "react"
import * as Linking from "expo-linking"
import * as WebBrowser from "expo-web-browser"
import { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase/client"

WebBrowser.maybeCompleteAuthSession()

interface AuthContextValue {
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithOAuth: (provider: "google" | "apple" | "facebook") => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsLoading(false)
    })

    const subscription = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      isMounted = false
      subscription.data.subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email: string, password: string) {
    const redirectTo = Linking.createURL("/auth/callback")
    const emailPrefix = email.split("@")[0]?.trim() || "creator"
    const normalizedUsername = emailPrefix
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 32)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: emailPrefix,
          username: normalizedUsername
        },
        emailRedirectTo: `${redirectTo}?type=signup&mobile_redirect_uri=${encodeURIComponent("tourify://(tabs)/discover")}`
      }
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  async function signInWithOAuth(provider: "google" | "apple" | "facebook") {
    const redirectTo = Linking.createURL("/auth/callback")
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    })
    if (error) throw error
    if (!data?.url) throw new Error("No OAuth URL returned")

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
    if (result.type !== "success") throw new Error("OAuth was cancelled")

    const callbackUrl = Linking.parse(result.url)
    const callbackCode = callbackUrl.queryParams?.code
    if (typeof callbackCode === "string") {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(callbackCode)
      if (exchangeError) throw exchangeError
    }
  }

  const value = useMemo(
    () => ({
      session,
      isLoading,
      signIn,
      signUp,
      signOut,
      signInWithOAuth
    }),
    [session, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
