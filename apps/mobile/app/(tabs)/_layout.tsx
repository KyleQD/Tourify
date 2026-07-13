import { Tabs } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { useAccountMode } from "@/hooks/use-account-mode"
import { useUnreadNotifications } from "@/hooks/use-unread-notifications"

export default function TabsLayout() {
  const { isVenueMode } = useAccountMode()
  const { unreadCount } = useUnreadNotifications("tabbar")

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#020617", borderTopColor: "#1e293b" },
        tabBarActiveTintColor: "#c084fc",
        tabBarInactiveTintColor: "#94a3b8"
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? (unreadCount > 9 ? "9+" : unreadCount) : undefined
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Leads",
          // Discover content lives in the Home → Discover sub-tab for general/creator mode.
          // Keep the standalone tab only for venue mode (venue leads workflow).
          href: isVenueMode ? undefined : null
        }}
      />
      <Tabs.Screen name="bookings" options={{ title: isVenueMode ? "Requests" : "Bookings" }} />
      <Tabs.Screen
        name="music"
        options={{
          title: "Music",
          tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          // Merged into Home → Your Stuff.
          href: null
        }}
      />
      <Tabs.Screen name="profile" options={{ title: isVenueMode ? "Venue" : "Profile" }} />
    </Tabs>
  )
}
