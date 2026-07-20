import { useEffect, useRef, useState } from "react"
import * as Notifications from "expo-notifications"
import { useRouter } from "expo-router"
import { registerForPushNotifications } from "@/lib/notifications/push-notifications"
import { resolvePushNotificationHref } from "@/lib/notifications/push-routing"

export function usePushNotifications() {
  const router = useRouter()
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [notification, setNotification] = useState<Notifications.Notification | null>(null)
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)
  const handledResponseIds = useRef(new Set<string>())

  useEffect(() => {
    function navigateFromResponse(response: Notifications.NotificationResponse | null) {
      if (!response) return

      const responseId = response.notification.request.identifier
      if (handledResponseIds.current.has(responseId)) return
      handledResponseIds.current.add(responseId)

      const data = response.notification.request.content.data
      const href = resolvePushNotificationHref(data?.url)
      if (!href) return

      router.push(href as never)
    }

    registerForPushNotifications().then(setExpoPushToken)

    notificationListener.current = Notifications.addNotificationReceivedListener((n) => {
      setNotification(n)
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromResponse(response)
    })

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      navigateFromResponse(response)
    })

    return () => {
      if (notificationListener.current)
        Notifications.removeNotificationSubscription(notificationListener.current)
      if (responseListener.current)
        Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [router])

  return { expoPushToken, notification }
}
