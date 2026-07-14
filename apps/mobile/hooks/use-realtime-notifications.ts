import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useSession } from "@/hooks/use-session"

export function useRealtimeNotifications(params: { onChange: () => void; channelKey?: string }) {
  const { user } = useSession()
  const { onChange, channelKey } = params

  useEffect(() => {
    if (!user?.id) return
    let debounceTimeout: ReturnType<typeof setTimeout> | null = null

    const channelName = channelKey
      ? `mobile-notifications-${user.id}-${channelKey}`
      : `mobile-notifications-${user.id}`

    const channel = supabase
      .channel(channelName)
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
  }, [onChange, user?.id, channelKey])
}
