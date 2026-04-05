import { useMemo } from "react"
import { useAuth } from "@/lib/auth/auth-provider"

export function useSession() {
  const { session, isLoading } = useAuth()

  return useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthenticated: Boolean(session?.user?.id)
    }),
    [session, isLoading]
  )
}
