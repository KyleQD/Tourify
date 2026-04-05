import { useEffect } from "react"
import { ActivityIndicator, View } from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase/client"

export default function OAuthCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ code?: string; error?: string }>()

  useEffect(() => {
    async function completeAuth() {
      if (params.error) {
        router.replace("/(auth)/login")
        return
      }

      if (params.code) {
        await supabase.auth.exchangeCodeForSession(params.code)
      }

      router.replace("/(tabs)/discover")
    }

    void completeAuth()
  }, [params.code, params.error, router])

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#020617" }}>
      <ActivityIndicator size="large" color="#a855f7" />
    </View>
  )
}
