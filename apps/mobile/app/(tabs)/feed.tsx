import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "@/lib/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { env } from "@/lib/config/env"

interface Post {
  id: string
  user_id: string
  content: string
  media_url: string | null
  created_at: string
  author_name: string
  author_avatar: string | null
  like_count: number
  comment_count: number
  liked_by_me: boolean
}

export default function FeedScreen() {
  const { session } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [newPostContent, setNewPostContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchPosts = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await fetch(`${env.apiBaseUrl}/api/feed/posts`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (!res.ok) throw new Error(`Feed request failed (${res.status})`)
      const data = await res.json()
      setPosts(Array.isArray(data) ? data : data.posts ?? [])
    } catch (error) {
      Alert.alert("Failed to load feed", error instanceof Error ? error.message : "Please try again")
    }
  }, [session?.access_token])

  useEffect(() => {
    setIsLoading(true)
    fetchPosts().finally(() => setIsLoading(false))
  }, [fetchPosts])

  async function handleRefresh() {
    setIsRefreshing(true)
    await fetchPosts()
    setIsRefreshing(false)
  }

  async function handleToggleLike(post: Post) {
    if (!session?.user?.id) return

    const wasLiked = post.liked_by_me
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      )
    )

    try {
      if (wasLiked) {
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", session.user.id)
      } else {
        await supabase
          .from("post_likes")
          .insert({ post_id: post.id, user_id: session.user.id })
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, liked_by_me: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p
        )
      )
    }
  }

  async function handleCreatePost() {
    const trimmed = newPostContent.trim()
    if (!trimmed || !session?.user?.id) return

    setIsSubmitting(true)
    const { error } = await supabase.from("posts").insert({
      user_id: session.user.id,
      content: trimmed,
    })
    setIsSubmitting(false)

    if (error) {
      Alert.alert("Post failed", error.message)
      return
    }

    setNewPostContent("")
    setIsComposerOpen(false)
    await fetchPosts()
  }

  function renderPost({ item }: { item: Post }) {
    return (
      <View style={{ borderBottomWidth: 1, borderColor: "#1e293b", padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {item.author_avatar ? (
            <Image
              source={{ uri: item.author_avatar }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#334155" }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "#334155",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="person" size={18} color="#94a3b8" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 15 }}>
              {item.author_name || "Anonymous"}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <Text style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 22 }}>{item.content}</Text>

        {item.media_url ? (
          <Image
            source={{ uri: item.media_url }}
            style={{ width: "100%", height: 200, borderRadius: 10, backgroundColor: "#1e293b" }}
            resizeMode="cover"
          />
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 4 }}>
          <Pressable
            onPress={() => handleToggleLike(item)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Ionicons
              name={item.liked_by_me ? "heart" : "heart-outline"}
              size={20}
              color={item.liked_by_me ? "#f43f5e" : "#94a3b8"}
            />
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>{item.like_count}</Text>
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="chatbubble-outline" size={18} color="#94a3b8" />
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>{item.comment_count}</Text>
          </View>
        </View>
      </View>
    )
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Feed</Text>
        <Pressable
          onPress={() => setIsComposerOpen(true)}
          style={{ backgroundColor: "#7c3aed", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Post</Text>
        </Pressable>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#a855f7" />
        }
        ListEmptyComponent={
          <View style={{ padding: 32, alignItems: "center", gap: 12 }}>
            <Ionicons name="newspaper-outline" size={48} color="#475569" />
            <Text style={{ color: "#94a3b8", fontSize: 16, textAlign: "center" }}>
              No posts yet. Be the first to share!
            </Text>
          </View>
        }
      />

      <Modal visible={isComposerOpen} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#0f172a", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>New Post</Text>
              <Pressable onPress={() => setIsComposerOpen(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </Pressable>
            </View>

            <TextInput
              value={newPostContent}
              onChangeText={setNewPostContent}
              placeholder="What's on your mind?"
              placeholderTextColor="#64748b"
              multiline
              autoFocus
              style={{
                color: "#f1f5f9",
                fontSize: 16,
                minHeight: 120,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: "#334155",
                borderRadius: 12,
                padding: 12,
              }}
            />

            <Pressable
              onPress={handleCreatePost}
              disabled={isSubmitting || !newPostContent.trim()}
              style={{
                backgroundColor: newPostContent.trim() ? "#7c3aed" : "#334155",
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Publish</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
