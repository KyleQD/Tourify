import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from '@/lib/supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }

  // projectId is required in newer Expo SDKs — without it token registration
  // fails on production (EAS) builds even when extra.eas.projectId is set.
  const expoProjectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  const { data: token } = await Notifications.getExpoPushTokenAsync(
    expoProjectId ? { projectId: expoProjectId } : undefined,
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id)
  }

  return token
}
