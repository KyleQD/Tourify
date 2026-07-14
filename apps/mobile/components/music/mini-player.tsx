import { Image, Pressable, Text, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useMusicPlayer } from "@/providers/music-player-provider"

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0")
  return `${minutes}:${remaining}`
}

export function MiniMusicPlayer() {
  const player = useMusicPlayer()
  const track = player.currentTrack
  if (!track) return null

  const progress = player.duration > 0 ? Math.min(1, player.position / player.duration) : 0

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: "#1e293b",
        backgroundColor: "#020617",
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 12,
      }}
    >
      <View style={{ height: 3, borderRadius: 2, backgroundColor: "#1e293b", marginBottom: 10, overflow: "hidden" }}>
        <View style={{ width: `${progress * 100}%`, height: "100%", backgroundColor: "#38bdf8" }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        {track.cover_art_url ? (
          <Image
            source={{ uri: track.cover_art_url }}
            style={{ width: 46, height: 46, borderRadius: 8, backgroundColor: "#1e293b" }}
          />
        ) : (
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 8,
              backgroundColor: "#1e293b",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="musical-notes" size={21} color="#38bdf8" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "800" }} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={1}>
            {[track.artist_name || "Artist", player.accessLevel === "preview" ? "Sample" : "Full"].filter(Boolean).join(" · ")}
          </Text>
          <Text style={{ color: "#64748b", fontSize: 11 }}>
            {formatTime(player.position)} / {formatTime(player.duration)}
          </Text>
        </View>
        <Pressable
          onPress={player.isPlaying ? player.pause : player.resume}
          disabled={player.isLoading}
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "#0f172a",
            borderWidth: 1,
            borderColor: "#334155",
            alignItems: "center",
            justifyContent: "center",
            opacity: player.isLoading ? 0.6 : 1,
          }}
        >
          <Ionicons name={player.isPlaying ? "pause" : "play"} size={20} color="#f8fafc" />
        </Pressable>
        <Pressable
          onPress={player.stop}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="close" size={20} color="#94a3b8" />
        </Pressable>
      </View>
    </View>
  )
}
