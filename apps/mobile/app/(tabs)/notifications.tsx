import { useCallback, useEffect, useState } from "react"
import { Alert, Pressable, SafeAreaView, ScrollView, Text, View } from "react-native"
import { getNotifications, markAllNotificationsAsRead, NotificationItem } from "@/lib/api/notifications"
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications"

export default function NotificationsScreen() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getNotifications()
      setItems(data)
    } catch (error) {
      Alert.alert("Failed to load", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadNotifications()
  }, [loadNotifications])

  useRealtimeNotifications({ onChange: () => void loadNotifications() })

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsAsRead()
      await loadNotifications()
    } catch (error) {
      Alert.alert("Failed to update", error instanceof Error ? error.message : "Please try again")
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Notifications</Text>
          <Pressable onPress={handleMarkAllRead} style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text style={{ color: "#cbd5e1", fontWeight: "600" }}>Mark all read</Text>
          </Pressable>
        </View>
        {isLoading ? (
          <Text style={{ color: "#94a3b8" }}>Loading notifications...</Text>
        ) : items.length === 0 ? (
          <Text style={{ color: "#94a3b8" }}>No notifications yet.</Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#fff", fontWeight: "700" }}>{item.title}</Text>
              <Text style={{ color: "#cbd5e1", marginTop: 4 }}>{item.content}</Text>
              <Text style={{ color: "#64748b", marginTop: 8, fontSize: 12 }}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
