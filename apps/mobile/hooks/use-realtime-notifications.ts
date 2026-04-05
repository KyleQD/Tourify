import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useSession } from "@/hooks/use-session"

export function useRealtimeNotifications(params: { onChange: () => void }) {
  const { user } = useSession()
  const { onChange } = params

  useEffect(() => {
    if (!user?.id) return
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`mobile-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`
        },
        () => {
          if (debounceTimeout) clearTimeout(debounceTimeout)
          debounceTimeout = setTimeout(() => onChange(), 250)
        }
      )
      .subscribe()

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout)
      void supabase.removeChannel(channel)
    }
  }, [onChange, user?.id])
}
