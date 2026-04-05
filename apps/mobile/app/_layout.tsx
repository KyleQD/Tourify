import { Stack } from "expo-router"
import { AuthProvider } from "@/lib/auth/auth-provider"

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(auth)/signup" />
        <Stack.Screen name="(auth)/callback" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthProvider>
  )
}
