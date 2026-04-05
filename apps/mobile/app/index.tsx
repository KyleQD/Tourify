import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"
import { useSession } from "@/hooks/use-session"
import { useAccountMode } from "@/hooks/use-account-mode"

export default function IndexScreen() {
  const { isLoading, isAuthenticated } = useSession()
  const { isLoading: isAccountLoading, isVenueMode } = useAccountMode()

  if (isLoading || isAccountLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#020617" }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />
  return <Redirect href={isVenueMode ? "/(tabs)/bookings" : "/(tabs)/discover"} />
}
