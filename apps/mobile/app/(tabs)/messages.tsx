import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/auth-provider"

interface Conversation {
  id: string
  participant_name: string
  participant_avatar_url: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 1) return "Now"
  if (diffMins < 60) return `${diffMins}m`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function MessagesScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const userId = session?.user?.id

  const loadConversations = useCallback(async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          participant_1,
          participant_2,
          last_message,
          last_message_at,
          profiles!conversations_participant_1_fkey(full_name, avatar_url),
          profiles_2:profiles!conversations_participant_2_fkey(full_name, avatar_url)
        `)
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .order("last_message_at", { ascending: false })

      if (error) throw error

      const { data: unreadData } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("read", false)
        .neq("sender_id", userId)

      const unreadMap = new Map<string, number>()
      unreadData?.forEach((m: { conversation_id: string }) => {
        unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) ?? 0) + 1)
      })

      const mapped: Conversation[] = (data ?? []).map((c: any) => {
        const isParticipant1 = c.participant_1 === userId
        const otherProfile = isParticipant1 ? c.profiles_2 : c.profiles
        return {
          id: c.id,
          participant_name: otherProfile?.full_name ?? "Unknown",
          participant_avatar_url: otherProfile?.avatar_url ?? null,
          last_message: c.last_message,
          last_message_at: c.last_message_at,
          unread_count: unreadMap.get(c.id) ?? 0
        }
      })

      setConversations(mapped)
    } catch {
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel("conversations-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void loadConversations()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, loadConversations])

  function renderConversation({ item }: { item: Conversation }) {
    const initials = item.participant_name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#1e293b",
          gap: 12
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#334155",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: "#c084fc", fontWeight: "700", fontSize: 16 }}>
            {initials}
          </Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text
              style={{
                color: "#fff",
                fontWeight: item.unread_count > 0 ? "800" : "600",
                fontSize: 16
              }}
              numberOfLines={1}
            >
              {item.participant_name}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              {formatTimestamp(item.last_message_at)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                flex: 1,
                color: item.unread_count > 0 ? "#cbd5e1" : "#64748b",
                fontSize: 14,
                fontWeight: item.unread_count > 0 ? "600" : "400"
              }}
              numberOfLines={1}
            >
              {item.last_message ?? "No messages yet"}
            </Text>
            {item.unread_count > 0 && (
              <View
                style={{
                  backgroundColor: "#c084fc",
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6
                }}
              >
                <Text style={{ color: "#020617", fontSize: 11, fontWeight: "800" }}>
                  {item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Messages</Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#c084fc" size="large" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConversation}
          contentContainerStyle={conversations.length === 0 ? { flex: 1, alignItems: "center", justifyContent: "center" } : undefined}
          ListEmptyComponent={
            <Text style={{ color: "#64748b", fontSize: 16 }}>No conversations yet</Text>
          }
        />
      )}
    </SafeAreaView>
  )
}
