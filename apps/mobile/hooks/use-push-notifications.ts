import { useState, useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { registerForPushNotifications } from '@/lib/notifications/push-notifications'

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [notification, setNotification] = useState<Notifications.Notification | null>(null)
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    registerForPushNotifications().then(setExpoPushToken)

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (n) => setNotification(n)
    )

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data
        if (data?.url && typeof data.url === 'string') {
          // Future: deep-link navigation based on data.url
        }
      }
    )

    return () => {
      if (notificationListener.current)
        Notifications.removeNotificationSubscription(notificationListener.current)
      if (responseListener.current)
        Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])

  return { expoPushToken, notification }
}
