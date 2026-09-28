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
  View
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useAuth } from "@/lib/auth/auth-provider"
import { apiRequest } from "@/lib/api/client"

interface GroupMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string | null
  message_type: string | null
  created_at: string
  sender?: { id: string; username?: string; full_name?: string }
}

interface ThreadDetail {
  thread: { id: string; name?: string | null; description?: string | null }
}

export default function GroupChatScreen() {
  const { id: threadId } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const userId = session?.user?.id
  const router = useRouter()

  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [threadName, setThreadName] = useState("Group")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const flatListRef = useRef<FlatList>(null)

  const loadMessages = useCallback(async () => {
    if (!threadId) return
    try {
      setError(null)
      const detail = await apiRequest<{ thread?: { name?: string | null } }>(
        `/api/groups/threads/${threadId}`
      )
      if (detail?.thread?.name) setThreadName(detail.thread.name)

      const res = await apiRequest<{ messages?: GroupMessage[] }>(
        `/api/groups/threads/${threadId}/messages?limit=50`
      )
      setMessages(res?.messages ?? [])
    } catch (err) {
      console.warn("[group-chat] load failed:", err)
      setError("Could not load this group chat.")
    } finally {
      setIsLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  async function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || !threadId || isSending) return

    setIsSending(true)
    setDraft("")

    try {
      await apiRequest(`/api/groups/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: trimmed }),
      })
      // Refresh to include the newly sent message with server fields.
      const res = await apiRequest<{ messages?: GroupMessage[] }>(
        `/api/groups/threads/${threadId}/messages?limit=50`
      )
      setMessages(res?.messages ?? [])
    } catch (err) {
      setDraft(trimmed)
      console.warn("[group-chat] send failed:", err)
    } finally {
      setIsSending(false)
    }
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
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
          marginHorizontal: 12
        }}
      >
        {!isMine && (
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 11,
              marginLeft: 4,
              marginBottom: 1
            }}
            numberOfLines={1}
          >
            {item.sender?.full_name || item.sender?.username || "Member"}
          </Text>
        )}
        <View
          style={{
            backgroundColor: isMine ? "#7c3aed" : "#1e293b",
            borderRadius: 18,
            borderBottomRightRadius: isMine ? 4 : 18,
            borderBottomLeftRadius: isMine ? 18 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10
          }}
        >
          <Text style={{ color: "#fff", fontSize: 15, lineHeight: 20 }}>
            {item.content ?? ""}
          </Text>
        </View>
        <Text
          style={{
            color: "#475569",
            fontSize: 11,
            marginTop: 2,
            alignSelf: isMine ? "flex-end" : "flex-start",
            marginHorizontal: 4
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
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            borderBottomWidth: 1,
            borderBottomColor: "#1e293b",
            gap: 12
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
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#c084fc" size="large" />
          </View>
        ) : error ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={{ color: "#f87171", fontSize: 15, textAlign: "center" }}>{error}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            inverted
            contentContainerStyle={{
              paddingVertical: 8,
              ...(messages.length === 0 && {
                flex: 1,
                alignItems: "center",
                justifyContent: "center"
              })
            }}
            ListEmptyComponent={
              <Text style={{ color: "#64748b", fontSize: 15 }}>
                No messages yet — say hello
              </Text>
            }
          />
        )}

        {/* Input bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            padding: 10,
            paddingBottom: Platform.OS === "ios" ? 10 : 14,
            borderTopWidth: 1,
            borderTopColor: "#1e293b",
            gap: 8
          }}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message the group..."
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
              borderColor: "#1e293b"
            }}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!draft.trim() || isSending}
            style={{
              backgroundColor: draft.trim() ? "#7c3aed" : "#334155",
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
