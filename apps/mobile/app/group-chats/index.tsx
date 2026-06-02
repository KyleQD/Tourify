import { useEffect, useState } from "react"
import { ActivityIndicator, FlatList, SafeAreaView, Text, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"

interface GroupThreadRow {
  id: string
  name: string
  thread_type: string
  updated_at: string
}

export default function GroupChatsScreen() {
  const router = useRouter()
  const [threads, setThreads] = useState<GroupThreadRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadThreads() {
      try {
        const { data, error } = await supabase
          .from("group_threads")
          .select("id, name, thread_type, updated_at")
          .order("updated_at", { ascending: false })
          .limit(100)

        if (error) throw error
        setThreads(data || [])
      } catch {
        setThreads([])
      } finally {
        setIsLoading(false)
      }
    }

    void loadThreads()
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Group Chats</Text>
      </View>
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={threads.length === 0 ? { flex: 1, justifyContent: "center", alignItems: "center" } : undefined}
          ListEmptyComponent={<Text style={{ color: "#64748b" }}>No group chats yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/group-chats/${item.id}`)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#1e293b",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>{item.name}</Text>
              <Text style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{item.thread_type}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}
