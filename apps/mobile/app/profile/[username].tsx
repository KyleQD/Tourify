import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View
} from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { supabase } from "@/lib/supabase"
import { useSession } from "@/hooks/use-session"
import { followUser, unfollowUser } from "@/lib/api/follow"
import { MiniMusicPlayer } from "@/components/music/mini-player"
import { env } from "@/lib/config/env"
import {
  addTrackToLibrary,
  getArtistPublicMusic,
  getProfileFeaturedTrack,
  setProfileFeaturedTrack,
  type MobileMusicTrack,
} from "@/lib/api/music"
import { useMusicPlayer } from "@/providers/music-player-provider"

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
  const musicPlayer = useMusicPlayer()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [posts, setPosts] = useState<PostItem[]>([])
  const [featuredTrack, setFeaturedTrack] = useState<MobileMusicTrack | null>(null)
  const [artistTracks, setArtistTracks] = useState<MobileMusicTrack[]>([])
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

    const [postsRes, followRes, featuredTrackRes, artistTracksRes] = await Promise.allSettled([
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
        : Promise.resolve({ data: null }),
      getProfileFeaturedTrack(profileData.id).catch(() => null),
      profileData.account_type === "artist"
        ? getArtistPublicMusic(profileData.id, 20).catch(() => [])
        : Promise.resolve([])
    ])

    if (postsRes.status === "fulfilled" && postsRes.value.data) {
      setPosts(postsRes.value.data)
    }

    if (followRes.status === "fulfilled" && followRes.value.data) {
      setIsFollowing(true)
    } else {
      setIsFollowing(false)
    }

    setFeaturedTrack(
      featuredTrackRes.status === "fulfilled" && featuredTrackRes.value
        ? {
            ...featuredTrackRes.value,
            artist_name:
              featuredTrackRes.value.artist_user_id === profileData.id
                ? profileData.display_name || profileData.username
                : featuredTrackRes.value.artist_name,
          }
        : null
    )
    setArtistTracks(artistTracksRes.status === "fulfilled" ? artistTracksRes.value : [])
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

  async function playTrack(track: MobileMusicTrack) {
    try {
      await musicPlayer.playTrack(track)
    } catch (error) {
      Alert.alert("Could not play track", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function addTrack(track: MobileMusicTrack) {
    try {
      await addTrackToLibrary(track.id)
      Alert.alert("Added", "Track added to your library.")
    } catch (error) {
      Alert.alert("Could not add track", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function featureTrack(track: MobileMusicTrack) {
    try {
      if (track.access_mode !== "paid") await addTrackToLibrary(track.id).catch(() => null)
      await setProfileFeaturedTrack(track.id)
      Alert.alert("Featured", "This track is now featured on your profile.")
    } catch (error) {
      Alert.alert("Could not feature track", error instanceof Error ? error.message : "Please add or purchase it first.")
    }
  }

  async function buyTrack(track: MobileMusicTrack) {
    if (!track.listing_id) return
    await WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/marketplace/listings/${track.listing_id}`)
  }

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
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: musicPlayer.currentTrack ? 24 : 56 }}>
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

        {featuredTrack ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Text style={{ color: "#94a3b8", fontWeight: "700", fontSize: 13, textTransform: "uppercase" }}>
              Featured Song
            </Text>
            <MusicProfileCard
              track={featuredTrack}
              featured
              onPlay={playTrack}
              onAdd={addTrack}
              onFeature={featureTrack}
              onBuy={buyTrack}
            />
          </View>
        ) : null}

        {artistTracks.length > 0 ? (
          <View style={{ gap: 10, marginTop: 4 }}>
            <Text style={{ color: "#94a3b8", fontWeight: "700", fontSize: 13, textTransform: "uppercase" }}>
              Artist Tracks
            </Text>
            {artistTracks
              .filter((track) => track.id !== featuredTrack?.id)
              .map((track) => (
                <MusicProfileCard
                  key={track.id}
                  track={track}
                  onPlay={playTrack}
                  onAdd={addTrack}
                  onFeature={featureTrack}
                  onBuy={buyTrack}
                />
              ))}
          </View>
        ) : null}

        {posts.length > 0 ? (
          <View style={{ gap: 10, marginTop: 8 }}>
            <Text style={{ color: "#94a3b8", fontWeight: "700", fontSize: 13, textTransform: "uppercase" }}>
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
      <MiniMusicPlayer />
    </SafeAreaView>
  )
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remaining}`
}

function MusicProfileCard({
  track,
  featured,
  onPlay,
  onAdd,
  onFeature,
  onBuy,
}: {
  track: MobileMusicTrack
  featured?: boolean
  onPlay: (track: MobileMusicTrack) => void
  onAdd: (track: MobileMusicTrack) => void
  onFeature: (track: MobileMusicTrack) => void
  onBuy: (track: MobileMusicTrack) => void
}) {
  const isPaid = track.access_mode === "paid"
  const duration = formatDuration(track.duration)

  return (
    <View style={{ borderWidth: 1, borderColor: featured ? "#7c3aed" : "#334155", borderRadius: 12, padding: 12, backgroundColor: "#0f172a", gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {track.cover_art_url ? (
          <Image source={{ uri: track.cover_art_url }} style={{ width: 58, height: 58, borderRadius: 10, backgroundColor: "#1e293b" }} />
        ) : (
          <View style={{ width: 58, height: 58, borderRadius: 10, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="disc" size={26} color="#38bdf8" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: "#f8fafc", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 13 }} numberOfLines={1}>
            {[track.artist_name || "Artist", track.genre, duration].filter(Boolean).join(" · ")}
          </Text>
          <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
            {[isPaid ? "Paid" : "Free", track.preview_mode === "clip" ? "Sample available" : "Full preview"].join(" · ")}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <MusicAction icon="play" label={track.preview_mode === "clip" ? "Sample" : "Play"} onPress={() => onPlay(track)} />
        {!isPaid && track.allow_library_add !== false ? (
          <MusicAction icon="library-outline" label="Library" onPress={() => onAdd(track)} />
        ) : null}
        {isPaid && track.listing_id ? (
          <MusicAction icon="bag-handle-outline" label="Buy" onPress={() => onBuy(track)} />
        ) : null}
        {track.allow_profile_feature !== false ? (
          <MusicAction icon="star-outline" label="Feature" onPress={() => onFeature(track)} />
        ) : null}
      </View>
    </View>
  )
}

function MusicAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 34,
        paddingHorizontal: 11,
        borderRadius: 17,
        backgroundColor: "#020617",
        borderWidth: 1,
        borderColor: "#334155",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={14} color="#c084fc" />
      <Text style={{ color: "#e2e8f0", fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  )
}
