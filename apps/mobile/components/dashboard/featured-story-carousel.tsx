import { useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native"
import { Image } from "expo-image"
import { Ionicons } from "@expo/vector-icons"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { env } from "@/lib/config/env"
import { getFeaturedStory } from "@/lib/api/featured-story"
import { queryKeys } from "@/lib/query/keys"

interface CardShellProps {
  width: number
  label: string
  icon: keyof typeof Ionicons.glyphMap
  tint: string
  children: React.ReactNode
  onPress?: () => void
}

function CardShell({ width, label, icon, tint, children, onPress }: CardShellProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        width,
        borderWidth: 1,
        borderColor: "#1e293b",
        borderRadius: 16,
        padding: 14,
        gap: 10,
        backgroundColor: "#0b1220",
        justifyContent: "space-between",
        minHeight: 150,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Ionicons name={icon} size={14} color={tint} />
        <Text style={{ color: tint, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 }}>{label}</Text>
      </View>
      {children}
    </Pressable>
  )
}

export function FeaturedStoryCarousel() {
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth - 32
  const [activeIndex, setActiveIndex] = useState(0)
  const storyQuery = useQuery({
    queryKey: queryKeys.featuredStory(),
    queryFn: getFeaturedStory,
    staleTime: 60_000,
  })
  const story = storyQuery.data || { article: null, artist: null, song: null }

  if (storyQuery.isLoading) {
    return (
      <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
        <View
          style={{
            width: cardWidth,
            minHeight: 150,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "#1e293b",
            backgroundColor: "#0b1220",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ActivityIndicator color="#a855f7" />
        </View>
      </View>
    )
  }

  const cardItems = [
    {
      key: "article",
      node: (
        <CardShell
          width={cardWidth}
          label="TOP STORY"
          icon="newspaper-outline"
          tint="#f472b6"
          onPress={
            story.article
              ? () => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/blog/${story.article!.slug}`)
              : undefined
          }
        >
          {story.article ? (
            <View style={{ gap: 6 }}>
              {story.article.featuredImageUrl ? (
                <Image
                  source={{ uri: story.article.featuredImageUrl }}
                  style={{ width: "100%", height: 70, borderRadius: 10, backgroundColor: "#1e293b" }}
                  contentFit="cover"
                  transition={120}
                />
              ) : null}
              <Text style={{ color: "#f8fafc", fontSize: 16, fontWeight: "700" }} numberOfLines={2}>
                {story.article.title}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={2}>
                {story.article.excerpt}
              </Text>
            </View>
          ) : (
            <Text style={{ color: "#64748b", fontSize: 13 }}>No featured article yet.</Text>
          )}
        </CardShell>
      ),
    },
    {
      key: "artist",
      node: (
        <CardShell
          width={cardWidth}
          label="TOP ARTIST"
          icon="star-outline"
          tint="#c084fc"
          onPress={
            story.artist ? () => router.push(`/profile/${story.artist!.username}`) : undefined
          }
        >
          {story.artist ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {story.artist.avatarUrl ? (
                <Image
                  source={{ uri: story.artist.avatarUrl }}
                  style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#1e293b" }}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: "#1e293b",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="musical-notes" size={22} color="#c084fc" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#f8fafc", fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
                  {story.artist.displayName}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                  {story.artist.followers.toLocaleString()} followers
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: "#64748b", fontSize: 13 }}>No top artist yet.</Text>
          )}
        </CardShell>
      ),
    },
    {
      key: "song",
      node: (
        <CardShell
          width={cardWidth}
          label="TOP SONG"
          icon="disc-outline"
          tint="#38bdf8"
          onPress={
            story.song?.artistId ? () => router.push(`/profile/${story.song!.artistId}`) : undefined
          }
        >
          {story.song ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {story.song.coverArtUrl ? (
                <Image
                  source={{ uri: story.song.coverArtUrl }}
                  style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: "#1e293b" }}
                  contentFit="cover"
                  transition={120}
                />
              ) : (
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    backgroundColor: "#1e293b",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="disc" size={22} color="#38bdf8" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#f8fafc", fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
                  {story.song.title}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={1}>
                  {story.song.artistName}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={{ color: "#64748b", fontSize: 13 }}>No trending song yet.</Text>
          )}
        </CardShell>
      ),
    },
  ]

  return (
    <View style={{ marginBottom: 12 }}>
      <FlatList
        horizontal
        data={cardItems}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => item.node}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        snapToInterval={cardWidth + 12}
        decelerationRate="fast"
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 12))
          setActiveIndex(index)
        }}
      />
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 }}>
        {cardItems.map((item, index) => (
          <View
            key={item.key}
            style={{
              width: index === activeIndex ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: index === activeIndex ? "#7c3aed" : "#334155",
            }}
          />
        ))}
      </View>
    </View>
  )
}
