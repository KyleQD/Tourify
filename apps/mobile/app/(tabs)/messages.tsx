import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/auth-provider"
import { apiRequest } from "@/lib/api/client"

interface Conversation {
  id: string
  source: "direct" | "group" | "event_group"
  participant_name: string
  participant_avatar_url: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
  trust_tier: "open" | "request" | "context" | null
  context_type: string | null
}

interface UnifiedItem {
  id: string
  source: "direct" | "group" | "event_group"
  badge: string
  name?: string | null
  last_message: string | null
  last_activity: string | null
  trust_tier?: string | null
  context_type?: string | null
}

const TABS: Array<{ id: "primary" | "requests" | "work"; label: string }> = [
  { id: "primary", label: "Primary" },
  { id: "requests", label: "Requests" },
  { id: "work", label: "Work" },
]

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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<"primary" | "requests" | "work">("primary")

  const userId = session?.user?.id

  const loadConversations = useCallback(async () => {
    if (!userId) return
    try {
      const result = await apiRequest<{ data: UnifiedItem[] }>(
        "/api/messages/unified-list?limit=80",
      )
      const items = result.data || []

      // Pull profile names for direct conversations so the list renders human names.
      const directIds = items.filter((item) => item.source === "direct").map((item) => item.id)
      const directProfiles = new Map<string, { name: string; avatar: string | null }>()
      if (directIds.length > 0) {
        const { data: convRows } = await supabase
          .from("conversations")
          .select(`
            id,
            participant_1,
            participant_2,
            profiles!conversations_participant_1_fkey(full_name, avatar_url),
            profiles_2:profiles!conversations_participant_2_fkey(full_name, avatar_url)
          `)
          .in("id", directIds)

        ;(convRows || []).forEach((row: any) => {
          const isOne = row.participant_1 === userId
          const other = isOne ? row.profiles_2 : row.profiles
          directProfiles.set(row.id, {
            name: other?.full_name ?? "Unknown",
            avatar: other?.avatar_url ?? null,
          })
        })
      }

      const { data: unreadData } = await supabase
        .from("messages")
        .select("conversation_id")
        .eq("is_read", false)
        .neq("sender_id", userId)

      const unreadMap = new Map<string, number>()
      unreadData?.forEach((row: { conversation_id: string }) => {
        unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) ?? 0) + 1)
      })

      const mapped: Conversation[] = items.map((item) => {
        if (item.source === "direct") {
          const profile = directProfiles.get(item.id)
          return {
            id: item.id,
            source: "direct",
            participant_name: profile?.name ?? "Unknown",
            participant_avatar_url: profile?.avatar ?? null,
            last_message: item.last_message,
            last_message_at: item.last_activity,
            unread_count: unreadMap.get(item.id) ?? 0,
            trust_tier: (item.trust_tier as Conversation["trust_tier"]) ?? null,
            context_type: item.context_type ?? null,
          }
        }
        return {
          id: item.id,
          source: item.source,
          participant_name: item.name || (item.source === "group" ? "Group thread" : "Event group"),
          participant_avatar_url: null,
          last_message: item.last_message,
          last_message_at: item.last_activity,
          unread_count: 0,
          trust_tier: null,
          context_type: null,
        }
      })

      setConversations(mapped)
    } catch {
      setConversations([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId])

  useEffect(() => {
    void loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`conversations-list-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void loadConversations(),
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, loadConversations])

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      if (activeTab === "primary") {
        return (
          conversation.source === "direct" &&
          (conversation.trust_tier ?? "open") === "open" &&
          !conversation.context_type
        )
      }
      if (activeTab === "requests") {
        return conversation.source === "direct" && conversation.trust_tier === "request"
      }
      // work: group threads, event groups, and direct conversations with context
      return (
        conversation.source !== "direct" ||
        Boolean(conversation.context_type) ||
        conversation.trust_tier === "context"
      )
    })
  }, [conversations, activeTab])

  function handleOpenConversation(item: Conversation) {
    if (item.source === "direct") router.push(`/chat/${item.id}`)
    else if (item.source === "group") router.push(`/group-chats/${item.id}`)
  }

  function renderConversation({ item }: { item: Conversation }) {
    const initials = item.participant_name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)

    return (
      <TouchableOpacity
        onPress={() => handleOpenConversation(item)}
        activeOpacity={0.7}
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#1e293b",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#334155",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#c084fc", fontWeight: "700", fontSize: 16 }}>{initials}</Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text
              style={{
                color: "#fff",
                fontWeight: item.unread_count > 0 ? "800" : "600",
                fontSize: 16,
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
                fontWeight: item.unread_count > 0 ? "600" : "400",
              }}
              numberOfLines={1}
            >
              {item.last_message ?? "No messages yet"}
            </Text>
            {item.trust_tier === "request" && (
              <View
                style={{
                  borderColor: "#f59e0b",
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: "#fbbf24", fontSize: 10, fontWeight: "700" }}>Request</Text>
              </View>
            )}
            {item.source !== "direct" && (
              <View
                style={{
                  borderColor: "#64748b",
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700" }}>
                  {item.source === "group" ? "Group" : "Event"}
                </Text>
              </View>
            )}
            {item.unread_count > 0 && (
              <View
                style={{
                  backgroundColor: "#c084fc",
                  borderRadius: 10,
                  minWidth: 20,
                  height: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 6,
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
      <View style={{ padding: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700", flex: 1 }}>Messages</Text>
        <TouchableOpacity
          onPress={() => router.push("/group-chats")}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            borderColor: "#7c3aed",
            borderWidth: 1,
          }}
        >
          <Text style={{ color: "#c084fc", fontWeight: "700", fontSize: 12 }}>Groups</Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          backgroundColor: "#0f172a",
          borderRadius: 999,
          padding: 4,
          gap: 4,
          borderColor: "#1e293b",
          borderWidth: 1,
        }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? "#7c3aed" : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: isActive ? "#fff" : "#94a3b8",
                  fontWeight: isActive ? "700" : "600",
                  fontSize: 13,
                }}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#c084fc" size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.source}-${item.id}`}
          renderItem={renderConversation}
          contentContainerStyle={
            filtered.length === 0
              ? { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }
              : undefined
          }
          refreshControl={
            <RefreshControl
              tintColor="#c084fc"
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true)
                void loadConversations()
              }}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text style={{ color: "#cbd5e1", fontSize: 16, fontWeight: "700" }}>
                {activeTab === "requests"
                  ? "No pending requests"
                  : activeTab === "work"
                  ? "No work threads yet"
                  : "No conversations yet"}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>
                {activeTab === "requests"
                  ? "Strangers who reach out land here as intro requests."
                  : activeTab === "work"
                  ? "Event teams, applications, and group chats live here."
                  : "Pull to refresh once people start messaging you."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}
