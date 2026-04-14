import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useAccountMode } from "@/hooks/use-account-mode"

export default function TabsLayout() {
  const { isVenueMode } = useAccountMode()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#020617", borderTopColor: "#1e293b" },
        tabBarActiveTintColor: "#c084fc",
        tabBarInactiveTintColor: "#94a3b8"
      }}
    >
      <Tabs.Screen name="discover" options={{ title: isVenueMode ? "Leads" : "Discover" }} />
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen name="bookings" options={{ title: isVenueMode ? "Requests" : "Bookings" }} />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: isVenueMode ? "Venue" : "Profile" }} />
    </Tabs>
  )
}
