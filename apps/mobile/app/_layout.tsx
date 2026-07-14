import { Stack } from "expo-router"
import { AuthProvider } from "@/lib/auth/auth-provider"
import { ConnectivityProvider } from "@/lib/connectivity/connectivity-provider"
import { MultiAccountProvider } from "@/providers/multi-account-provider"
import { MusicPlayerProvider } from "@/providers/music-player-provider"
import { usePushNotifications } from "@/hooks/use-push-notifications"

function PushNotificationRegistrar() {
  usePushNotifications()
  return null
}

export default function RootLayout() {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        <MultiAccountProvider>
          <MusicPlayerProvider>
            <PushNotificationRegistrar />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)/login" />
              <Stack.Screen name="(auth)/signup" />
              <Stack.Screen name="(auth)/callback" />
              <Stack.Screen name="(auth)/forgot-password" />
              <Stack.Screen name="connect/index" />
              <Stack.Screen name="connect/claim" />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="onboarding/index" />
              <Stack.Screen name="search/index" options={{ animation: "slide_from_bottom" }} />
              <Stack.Screen name="profile/[username]" />
              <Stack.Screen name="events/index" options={{ title: "Events" }} />
              <Stack.Screen name="events/[id]" options={{ title: "Event Detail" }} />
              <Stack.Screen name="checkout/index" options={{ title: "Checkout" }} />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </MusicPlayerProvider>
        </MultiAccountProvider>
      </AuthProvider>
    </ConnectivityProvider>
  )
}
