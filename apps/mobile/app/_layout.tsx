import { Stack } from "expo-router"
import { AuthProvider } from "@/lib/auth/auth-provider"
import { ConnectivityProvider } from "@/lib/connectivity/connectivity-provider"

export default function RootLayout() {
  return (
    <ConnectivityProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/signup" />
          <Stack.Screen name="(auth)/callback" />
          <Stack.Screen name="connect/index" />
          <Stack.Screen name="connect/claim" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </ConnectivityProvider>
  )
}
