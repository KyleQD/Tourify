import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { useSession } from "@/hooks/use-session"
import { followUser, unfollowUser } from "@/lib/api/follow"

interface PublicProfile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  account_type: string | null
  avatar_url: string | null
}

interface PostItem {
  id: string
  content: string
  created_at: string
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>()
  const router = useRouter()
  const { user } = useSession()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!username) return

    setIsLoading(true)
    setNotFound(false)

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, account_type, avatar_url")
      .eq("username", username)
      .single()

    if (profileError || !profileData) {
      setNotFound(true)
      setIsLoading(false)
      return
    }

    setProfile(profileData)

    const [postsRes, followRes] = await Promise.allSettled([
      supabase
        .from("posts")
        .select("id, content, created_at")
        .eq("user_id", profileData.id)
        .order("created_at", { ascending: false })
        .limit(20),
      user?.id
        ? supabase
            .from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", profileData.id)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ])

    if (postsRes.status === "fulfilled" && postsRes.value.data) {
      setPosts(postsRes.value.data)
    }

    if (followRes.status === "fulfilled" && followRes.value.data) {
      setIsFollowing(true)
    }

    setIsLoading(false)
  }, [username, user?.id])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  async function handleToggleFollow() {
    if (!profile) return
    setIsToggling(true)
    try {
      if (isFollowing) {
        await unfollowUser(profile.id)
        setIsFollowing(false)
      } else {
        await followUser(profile.id)
        setIsFollowing(true)
      }
    } catch (error) {
      Alert.alert("Action failed", error instanceof Error ? error.message : "Please try again")
    } finally {
      setIsToggling(false)
    }
  }

  const isOwnProfile = user?.id && profile?.id === user.id

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </SafeAreaView>
    )
  }

  if (notFound) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <Text style={{ color: "#94a3b8", fontSize: 16, textAlign: "center", marginBottom: 16 }}>
          User not found
        </Text>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 10 }}>
          <Text style={{ color: "#a78bfa", fontWeight: "600" }}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 56 }}>
        <Pressable onPress={() => router.back()} style={{ paddingVertical: 4 }}>
          <Text style={{ color: "#a78bfa", fontWeight: "600" }}>Back</Text>
        </Pressable>

        <View style={{ alignItems: "center", gap: 12 }}>
          {profile?.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: "#334155" }}
            />
          ) : (
            <View style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: "#334155"
            }}>
              <Text style={{ color: "#a78bfa", fontSize: 32, fontWeight: "700" }}>
                {(profile?.display_name || profile?.username || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: "#f8fafc", fontSize: 22, fontWeight: "700" }}>
              {profile?.display_name || profile?.username}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 15 }}>@{profile?.username}</Text>
          </View>

          {profile?.account_type ? (
            <View style={{
              borderWidth: 1,
              borderColor: "#7c3aed",
              borderRadius: 999,
              paddingHorizontal: 14,
              paddingVertical: 5,
              backgroundColor: "#2e1065"
            }}>
              <Text style={{ color: "#c4b5fd", fontWeight: "600", fontSize: 13, textTransform: "capitalize" }}>
                {profile.account_type}
              </Text>
            </View>
          ) : null}

          {profile?.bio ? (
            <Text style={{ color: "#cbd5e1", fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 12 }}>
              {profile.bio}
            </Text>
          ) : null}

          {!isOwnProfile && user?.id ? (
            <Pressable
              onPress={handleToggleFollow}
              disabled={isToggling}
              style={{
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 32,
                backgroundColor: isFollowing ? "#1e293b" : "#7c3aed",
                borderWidth: isFollowing ? 1 : 0,
                borderColor: "#334155",
                marginTop: 4
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
                {isToggling ? "..." : isFollowing ? "Following" : "Follow"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {posts.length > 0 ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Text style={{ color: "#94a3b8", fontWeight: "700", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.6 }}>
              Recent Posts
            </Text>
            {posts.map((post) => (
              <View key={post.id} style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, backgroundColor: "#0f172a" }}>
                <Text style={{ color: "#e2e8f0", lineHeight: 20 }}>{post.content}</Text>
                <Text style={{ color: "#475569", fontSize: 12, marginTop: 6 }}>
                  {new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 16, backgroundColor: "#0f172a", marginTop: 8 }}>
            <Text style={{ color: "#475569", textAlign: "center" }}>No posts yet</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
