import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { useSession } from "@/hooks/use-session"
import { supabase } from "@/lib/supabase"
import { useMultiAccount } from "@/providers/multi-account-provider"
import { getFeedPosts, type FeedPost, type FeedTab } from "@/lib/api/feed"

const PAGE_SIZE = 20

interface FeedPostListProps {
  type: FeedTab
  refreshSignal?: number
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null
  emptyLabel?: string
}

function getProfilePath(post: FeedPost): string {
  const context = post.profiles?.account_context
  if (context?.profile_path) return context.profile_path
  return `/profile/${post.profiles?.username || "user"}`
}

export function FeedPostList({ type, refreshSignal, ListHeaderComponent, emptyLabel }: FeedPostListProps) {
  const router = useRouter()
  const { user } = useSession()
  const { currentAccount, actingHeaders } = useMultiAccount()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)

  const profileId = currentAccount?.profile_id ?? null

  const load = useCallback(
    async (mode: "initial" | "refresh" | "more") => {
      if (mode === "more" && (!hasMore || isFetchingMore)) return

      if (mode === "initial") setIsLoading(true)
      if (mode === "refresh") setIsRefreshing(true)
      if (mode === "more") setIsFetchingMore(true)

      const offset = mode === "more" ? offsetRef.current : 0

      try {
        const data = await getFeedPosts({
          type,
          profileId,
          limit: PAGE_SIZE,
          offset,
          headers: actingHeaders,
        })

        setHasMore(data.length === PAGE_SIZE)
        offsetRef.current = offset + data.length

        setPosts((prev) => {
          if (mode === "more") {
            const seen = new Set(prev.map((p) => p.id))
            return [...prev, ...data.filter((p) => !seen.has(p.id))]
          }
          return data
        })
      } catch {
        if (mode !== "more") setPosts([])
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
        setIsFetchingMore(false)
      }
    },
    [type, profileId, actingHeaders, hasMore, isFetchingMore]
  )

  useEffect(() => {
    offsetRef.current = 0
    setHasMore(true)
    void load("initial")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, profileId, refreshSignal])

  async function handleToggleLike(post: FeedPost) {
    if (!user?.id) return
    const wasLiked = post.is_liked
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, is_liked: !wasLiked, like_count: p.like_count + (wasLiked ? -1 : 1) }
          : p
      )
    )
    try {
      if (wasLiked) {
        await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id)
      } else {
        await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id })
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, is_liked: wasLiked, like_count: p.like_count + (wasLiked ? 1 : -1) }
            : p
        )
      )
    }
  }

  function renderPost({ item }: { item: FeedPost }) {
    return (
      <View style={{ borderBottomWidth: 1, borderColor: "#1e293b", padding: 16, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable onPress={() => router.push(getProfilePath(item))}>
            {item.profiles?.avatar_url ? (
              <Image
                source={{ uri: item.profiles.avatar_url }}
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
          </Pressable>
          <Pressable style={{ flex: 1 }} onPress={() => router.push(getProfilePath(item))}>
            <Text style={{ color: "#f1f5f9", fontWeight: "600", fontSize: 15 }}>
              {item.profiles?.full_name || item.profiles?.username || "Anonymous"}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </Pressable>
        </View>

        {item.content ? (
          <Text style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
        ) : null}

        {item.media_urls?.length ? (
          <Image
            source={{ uri: item.media_urls[0] }}
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
              name={item.is_liked ? "heart" : "heart-outline"}
              size={20}
              color={item.is_liked ? "#f43f5e" : "#94a3b8"}
            />
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>{item.like_count}</Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="chatbubble-outline" size={18} color="#94a3b8" />
            <Text style={{ color: "#94a3b8", fontSize: 13 }}>{item.comments_count}</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      ListHeaderComponent={ListHeaderComponent}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => load("refresh")} tintColor="#a855f7" />
      }
      onEndReached={() => load("more")}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingMore ? (
          <View style={{ paddingVertical: 20 }}>
            <ActivityIndicator color="#a855f7" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={{ padding: 32, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#a855f7" />
          </View>
        ) : (
          <View style={{ padding: 32, alignItems: "center", gap: 12 }}>
            <Ionicons name="newspaper-outline" size={44} color="#475569" />
            <Text style={{ color: "#94a3b8", fontSize: 15, textAlign: "center" }}>
              {emptyLabel || "No posts yet. Be the first to share!"}
            </Text>
          </View>
        )
      }
      contentContainerStyle={posts.length === 0 ? { flexGrow: 1 } : undefined}
    />
  )
}
