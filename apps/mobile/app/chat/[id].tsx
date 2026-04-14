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
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/auth-provider"

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>()
  const { session } = useAuth()
  const router = useRouter()
  const userId = session?.user?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draft, setDraft] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [participantName, setParticipantName] = useState("Chat")
  const flatListRef = useRef<FlatList>(null)

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMessages(data ?? [])
    } catch {
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId || !userId) return
    async function loadParticipant() {
      const { data } = await supabase
        .from("conversations")
        .select(`
          participant_1,
          participant_2,
          profiles!conversations_participant_1_fkey(full_name),
          profiles_2:profiles!conversations_participant_2_fkey(full_name)
        `)
        .eq("id", conversationId)
        .single()

      if (!data) return
      const isParticipant1 = data.participant_1 === userId
      const otherProfile = isParticipant1 ? (data as any).profiles_2 : (data as any).profiles
      setParticipantName(otherProfile?.full_name ?? "Chat")
    }
    void loadParticipant()
  }, [conversationId, userId])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  // Mark messages as read when entering the chat
  useEffect(() => {
    if (!conversationId || !userId) return
    void supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .eq("read", false)
  }, [conversationId, userId])

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => [newMsg, ...prev])

          if (newMsg.sender_id !== userId) {
            void supabase
              .from("messages")
              .update({ read: true })
              .eq("id", newMsg.id)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId, userId])

  async function handleSend() {
    const trimmed = draft.trim()
    if (!trimmed || !userId || !conversationId || isSending) return

    setIsSending(true)
    setDraft("")

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: trimmed
      })
      if (error) throw error
    } catch {
      setDraft(trimmed)
    } finally {
      setIsSending(false)
    }
  }

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  }

  function renderMessage({ item }: { item: Message }) {
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
            {item.content}
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
            {participantName}
          </Text>
        </View>

        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#c084fc" size="large" />
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
                Send a message to start the conversation
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
