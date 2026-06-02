import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/auth-provider"
import { apiRequest, ApiError } from "@/lib/api/client"

interface GroupMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string
  created_at: string
}

export default function GroupChatThreadScreen() {
  const { id: threadId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [threadName, setThreadName] = useState<string>("Group")
  const [draft, setDraft] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const listRef = useRef<FlatList>(null)

  const loadMessages = useCallback(async () => {
    if (!threadId) return
    try {
      const result = await apiRequest<{ messages: GroupMessage[] }>(
        `/api/groups/threads/${threadId}/messages?limit=50`,
      )
      setMessages(result.messages || [])
    } catch (error) {
      console.warn("[group-chat] load failed", error)
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (!threadId) return
    async function loadName() {
      const { data } = await supabase
        .from("group_threads")
        .select("name")
        .eq("id", threadId)
        .maybeSingle()
      if (data?.name) setThreadName(data.name)
    }
    void loadName()
  }, [threadId])

  useEffect(() => {
    if (!threadId || !userId) return
    const channel = supabase
      .channel(`group-thread-${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const incoming = payload.new as GroupMessage
          if (incoming.sender_id === userId) return
          setMessages((prev) => [incoming, ...prev])
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [threadId, userId])

  async function sendMessage() {
    const content = draft.trim()
    if (!content || !userId || !threadId || isSending) return
    setIsSending(true)
    setDraft("")
    try {
      const result = await apiRequest<{ success: boolean; message: GroupMessage }>(
        `/api/groups/threads/${threadId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        },
      )
      if (result?.message) {
        setMessages((prev) => [result.message, ...prev])
      }
    } catch (error) {
      setDraft(content)
      if (error instanceof ApiError) {
        console.warn("[group-chat] send failed:", error.status, error.message)
      } else {
        console.warn("[group-chat] send failed:", error)
      }
    } finally {
      setIsSending(false)
    }
  }

  function formatTime(value: string): string {
    const date = new Date(value)
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  }

  function renderMessage({ item }: { item: GroupMessage }) {
    const isMine = item.sender_id === userId
    return (
      <View
        style={{
          alignSelf: isMine ? "flex-end" : "flex-start",
          maxWidth: "78%",
          marginVertical: 3,
          marginHorizontal: 12,
        }}
      >
        <View
          style={{
            backgroundColor: isMine ? "#7c3aed" : "#1e293b",
            borderRadius: 18,
            borderBottomRightRadius: isMine ? 4 : 18,
            borderBottomLeftRadius: isMine ? 18 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, lineHeight: 20 }}>{item.content}</Text>
        </View>
        <Text
          style={{
            color: "#475569",
            fontSize: 11,
            marginTop: 2,
            alignSelf: isMine ? "flex-end" : "flex-start",
            marginHorizontal: 4,
          }}
        >
          {formatTime(item.created_at)}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
            gap: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: "#c084fc", fontSize: 28, fontWeight: "300" }}>{"‹"}</Text>
          </TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", flex: 1 }} numberOfLines={1}>
            {threadName}
          </Text>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color="#c084fc" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={{
              paddingVertical: 8,
              ...(messages.length === 0 && {
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }),
            }}
            ListEmptyComponent={
              <Text style={{ color: "#64748b", fontSize: 15 }}>
                Send a message to start the conversation
              </Text>
            }
          />
        )}

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            padding: 10,
            paddingBottom: Platform.OS === "ios" ? 10 : 14,
            borderTopWidth: 1,
            borderTopColor: "#1e293b",
            gap: 8,
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message..."
            placeholderTextColor="#475569"
            multiline
            style={{
              flex: 1,
              backgroundColor: "#0f172a",
              color: "#fff",
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: "#1e293b",
            }}
          />
          <TouchableOpacity
            onPress={() => void sendMessage()}
            disabled={!draft.trim() || isSending}
            style={{
              backgroundColor: draft.trim() ? "#7c3aed" : "#334155",
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
