import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import * as WebBrowser from "expo-web-browser"
import { MiniMusicPlayer } from "@/components/music/mini-player"
import { env } from "@/lib/config/env"
import {
  addTrackToLibrary,
  getMusicFeed,
  getMusicLibrary,
  setProfileFeaturedTrack,
  type MobileMusicLibraryItem,
  type MobileMusicTrack,
} from "@/lib/api/music"
import { useMusicPlayer } from "@/providers/music-player-provider"

function normalizeLibraryTrack(item: MobileMusicLibraryItem): MobileMusicTrack {
  const track = item.artist_music
  return {
    id: item.music_track_id,
    title: track?.title || item.marketplace_listings?.title || "Untitled track",
    artist_name: track?.artist_name || "Artist",
    artist_user_id: track?.artist_user_id || null,
    genre: track?.genre || null,
    duration: track?.duration || null,
    cover_art_url: track?.cover_art_url || item.marketplace_listings?.cover_image_url || null,
    access_mode: track?.access_mode || "free",
    preview_mode: track?.preview_mode || "full",
    preview_duration_seconds: track?.preview_duration_seconds || 15,
    allow_library_add: false,
    allow_profile_feature: track?.allow_profile_feature !== false,
    listing_id: item.listing_id || item.marketplace_listings?.id || null,
  }
}

function formatDuration(seconds?: number | null) {
  if (!seconds || seconds <= 0) return null
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remaining}`
}

function MusicCard({
  track,
  libraryItemId,
  onPlay,
  onAdd,
  onFeature,
  onBuy,
}: {
  track: MobileMusicTrack
  libraryItemId?: string
  onPlay: (track: MobileMusicTrack) => void
  onAdd?: (track: MobileMusicTrack) => void
  onFeature?: (track: MobileMusicTrack, libraryItemId?: string) => void
  onBuy?: (track: MobileMusicTrack) => void
}) {
  const duration = formatDuration(track.duration)
  const isPaid = track.access_mode === "paid"

  return (
    <View style={{ borderWidth: 1, borderColor: "#1e293b", borderRadius: 12, padding: 12, marginBottom: 10, gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {track.cover_art_url ? (
          <Image
            source={{ uri: track.cover_art_url }}
            style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: "#1e293b" }}
          />
        ) : (
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 10,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="disc" size={28} color="#38bdf8" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: "#f8fafc", fontSize: 15, fontWeight: "700" }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 13 }} numberOfLines={1}>
            {track.artist_name || "Artist"}
          </Text>
          <Text style={{ color: "#64748b", fontSize: 12, marginTop: 4 }} numberOfLines={1}>
            {[track.genre, duration, isPaid ? "Paid" : "Free"].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <ActionButton icon="play" label={track.preview_mode === "clip" ? "Play sample" : "Play"} onPress={() => onPlay(track)} />
        {onAdd && track.allow_library_add !== false && !isPaid ? (
          <ActionButton icon="library-outline" label="Library" onPress={() => onAdd(track)} />
        ) : null}
        {onBuy && isPaid && track.listing_id ? (
          <ActionButton icon="bag-handle-outline" label="Buy" onPress={() => onBuy(track)} />
        ) : null}
        {onFeature && track.allow_profile_feature !== false ? (
          <ActionButton icon="star-outline" label="Feature" onPress={() => onFeature(track, libraryItemId)} />
        ) : null}
      </View>
    </View>
  )
}

function ActionButton({
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
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 18,
        backgroundColor: "#0f172a",
        borderWidth: 1,
        borderColor: "#334155",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={15} color="#c084fc" />
      <Text style={{ color: "#e2e8f0", fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  )
}

export default function MusicScreen() {
  const musicPlayer = useMusicPlayer()
  const [library, setLibrary] = useState<MobileMusicLibraryItem[]>([])
  const [discover, setDiscover] = useState<MobileMusicTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const libraryTrackIds = useMemo(
    () => new Set(library.map((item) => item.music_track_id)),
    [library]
  )

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)

    try {
      const [libraryResult, discoverResult] = await Promise.all([
        getMusicLibrary(50).catch(() => []),
        getMusicFeed(30).catch(() => []),
      ])
      setLibrary(libraryResult)
      setDiscover(discoverResult)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
      await load(true)
    } catch (error) {
      Alert.alert("Could not add track", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function featureTrack(track: MobileMusicTrack, libraryItemId?: string) {
    try {
      let hasLibraryAccess = Boolean(libraryItemId)
      if (!hasLibraryAccess) {
        const existing = library.find((item) => item.music_track_id === track.id)
        hasLibraryAccess = Boolean(existing)
      }
      if (!hasLibraryAccess && track.access_mode !== "paid") {
        await addTrackToLibrary(track.id)
        hasLibraryAccess = true
      }
      if (!hasLibraryAccess) {
        Alert.alert("Add it first", "Add or purchase this track before featuring it on your profile.")
        return
      }
      await setProfileFeaturedTrack(track.id)
      Alert.alert("Featured", "This track is now featured on your profile.")
      await load(true)
    } catch (error) {
      Alert.alert("Could not feature track", error instanceof Error ? error.message : "Please try again")
    }
  }

  async function buyTrack(track: MobileMusicTrack) {
    if (!track.listing_id) return
    await WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/marketplace/listings/${track.listing_id}`)
  }

  const discoverOnly = discover.filter((track) => !libraryTrackIds.has(track.id))

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: musicPlayer.currentTrack ? 24 : 48 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor="#a855f7" />
        }
      >
        <View style={{ marginBottom: 18 }}>
          <Text style={{ color: "#f8fafc", fontSize: 28, fontWeight: "800" }}>Music</Text>
          <Text style={{ color: "#94a3b8", fontSize: 14, marginTop: 4 }}>
            Listen, save tracks, and choose the song that plays from your profile.
          </Text>
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#a855f7" />
          </View>
        ) : (
          <>
            <SectionTitle title="Library" icon="library-outline" />
            {library.length === 0 ? (
              <EmptyState label="Saved songs will show up here." />
            ) : (
              library.map((item) => (
                <MusicCard
                  key={item.id}
                  track={normalizeLibraryTrack(item)}
                  libraryItemId={item.id}
                  onPlay={playTrack}
                  onFeature={featureTrack}
                />
              ))
            )}

            <SectionTitle title="Discover" icon="radio-outline" />
            {discoverOnly.length === 0 ? (
              <EmptyState label="No public tracks to discover right now." />
            ) : (
              discoverOnly.map((track) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  onPlay={playTrack}
                  onAdd={addTrack}
                  onFeature={featureTrack}
                  onBuy={buyTrack}
                />
              ))
            )}
          </>
        )}

        {musicPlayer.isLoading ? (
          <Text style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", marginTop: 10 }}>
            Loading secure stream...
          </Text>
        ) : null}
      </ScrollView>
      <MiniMusicPlayer />
    </SafeAreaView>
  )
}

function SectionTitle({ title, icon }: { title: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 10 }}>
      <Ionicons name={icon} size={18} color="#c084fc" />
      <Text style={{ color: "#f8fafc", fontSize: 18, fontWeight: "800" }}>{title}</Text>
    </View>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 14 }}>
      <Text style={{ color: "#64748b", fontSize: 13 }}>{label}</Text>
    </View>
  )
}
