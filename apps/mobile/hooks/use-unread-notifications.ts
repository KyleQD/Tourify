import { useCallback, useEffect, useState } from "react"
import { getNotifications, isNotificationUnread } from "@/lib/api/notifications"
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications"

export function useUnreadNotifications(channelKey?: string) {
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const items = await getNotifications()
      setUnreadCount(items.filter(isNotificationUnread).length)
    } catch {
      // keep last known count on failure
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useRealtimeNotifications({ onChange: () => void refresh(), channelKey })

  return { unreadCount, refresh }
}
