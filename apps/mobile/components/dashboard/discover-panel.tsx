import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { env } from "@/lib/config/env"
import { getDiscoverFeed, type DiscoverResponse } from "@/lib/api/discover"
import { getMarketplaceDiscover, type MarketplaceListing } from "@/lib/api/marketplace"
import { getHubFeed, type HubJobItem } from "@/lib/api/hub"

function SectionHeader({
  title,
  icon,
  onSeeAll,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  onSeeAll?: () => void
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Ionicons name={icon} size={18} color="#c084fc" />
        <Text style={{ color: "#f8fafc", fontSize: 17, fontWeight: "700" }}>{title}</Text>
      </View>
      {onSeeAll ? (
        <Pressable onPress={onSeeAll}>
          <Text style={{ color: "#a78bfa", fontSize: 13, fontWeight: "600" }}>See all</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <Text style={{ color: "#64748b", fontSize: 13, paddingVertical: 6 }}>{label}</Text>
}

export function DiscoverPanel() {
  const router = useRouter()
  const [discover, setDiscover] = useState<DiscoverResponse | null>(null)
  const [merch, setMerch] = useState<MarketplaceListing[]>([])
  const [jobs, setJobs] = useState<HubJobItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setIsLoading(true)
    try {
      const [discoverResult, merchResult, hubResult] = await Promise.all([
        getDiscoverFeed({ intent: "grow" }).catch(() => null),
        getMarketplaceDiscover(12).catch(() => []),
        getHubFeed({ intent: "grow" }).catch(() => null),
      ])
      setDiscover(discoverResult)
      setMerch(merchResult)
      setJobs(hubResult?.sections?.jobs ?? [])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const nearYouEvents = useMemo(() => {
    const nearby = discover?.sections?.nearby_events ?? []
    const upcoming = discover?.sections?.upcoming ?? []
    return (nearby.length > 0 ? nearby : upcoming).slice(0, 10)
  }, [discover])

  const artists = useMemo(() => {
    const seen = new Set<string>()
    const combined = [
      ...(discover?.sections?.new_artists ?? []),
      ...(discover?.sections?.suggestions ?? []),
      ...(discover?.sections?.artists ?? []),
      ...(discover?.sections?.people ?? []),
    ]
    return combined
      .filter((profile) => {
        if (!profile?.id || seen.has(profile.id)) return false
        if (profile.account_type && profile.account_type !== "artist") return false
        seen.add(profile.id)
        return true
      })
      .slice(0, 12)
  }, [discover])

  const music = useMemo(() => {
    const seen = new Set<string>()
    const combined = [
      ...(discover?.sections?.new_music ?? []),
      ...(discover?.sections?.trending_music ?? []),
    ]
    return combined
      .filter((track) => {
        if (!track?.id || seen.has(track.id)) return false
        seen.add(track.id)
        return true
      })
      .slice(0, 10)
  }, [discover])

  const trendingPosts = discover?.sections?.trending ?? []
  const venues = (discover?.sections?.venues ?? []).slice(0, 10)

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor="#a855f7" />
      }
    >
      <View>
        <Text style={{ color: "#f8fafc", fontSize: 22, fontWeight: "700" }}>Discover</Text>
        <Text style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
          Artists, shows near you, new music, and trending posts
        </Text>
      </View>

      <View>
        <SectionHeader
          title="Happening Near You"
          icon="calendar-outline"
          onSeeAll={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/discover/events`)}
        />
        {nearYouEvents.length === 0 ? (
          <EmptyRow label="No upcoming events nearby." />
        ) : (
          nearYouEvents.map((event) => (
            <Pressable
              key={event.id}
              onPress={() => router.push(`/events/${event.id}`)}
              style={{
                borderWidth: 1,
                borderColor: "#1e293b",
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                gap: 4,
              }}
            >
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                {event.title}
              </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                {[event.venue_name, event.venue_city].filter(Boolean).join(" · ") || "Venue TBA"}
              </Text>
              {event.event_date ? (
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {new Date(event.event_date).toLocaleDateString()}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </View>

      <View>
        <SectionHeader
          title="Artists to Discover"
          icon="people-outline"
          onSeeAll={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/discover/users`)}
        />
        {artists.length === 0 ? (
          <EmptyRow label="No artists to discover yet." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {artists.map((profile) => (
              <Pressable
                key={profile.id}
                onPress={() =>
                  profile.username
                    ? router.push(`/profile/${profile.username}`)
                    : undefined
                }
                style={{
                  width: 140,
                  borderWidth: 1,
                  borderColor: "#1e293b",
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    height: 80,
                    borderRadius: 8,
                    backgroundColor: "#1e293b",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="person" size={28} color="#a78bfa" />
                </View>
                <Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                  {profile.display_name}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>
                  @{profile.username}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View>
        <SectionHeader
          title="Fresh Music"
          icon="musical-notes-outline"
          onSeeAll={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/music`)}
        />
        {music.length === 0 ? (
          <EmptyRow label="No music to discover yet." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {music.map((track) => (
              <View
                key={track.id}
                style={{
                  width: 130,
                  borderWidth: 1,
                  borderColor: "#1e293b",
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                {track.cover_art_url ? (
                  <Image
                    source={{ uri: track.cover_art_url }}
                    style={{ width: "100%", height: 110, borderRadius: 8, backgroundColor: "#1e293b" }}
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 110,
                      borderRadius: 8,
                      backgroundColor: "#1e293b",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="disc" size={28} color="#38bdf8" />
                  </View>
                )}
                <Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                  {track.title}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 11 }} numberOfLines={1}>
                  {track.artist_name}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View>
        <SectionHeader
          title="Trending on Tourify"
          icon="flame-outline"
          onSeeAll={() => router.push("/(tabs)/feed")}
        />
        {trendingPosts.length === 0 ? (
          <EmptyRow label="No trending posts right now." />
        ) : (
          trendingPosts.slice(0, 10).map((post) => (
            <Pressable
              key={post.id}
              onPress={() =>
                post.profiles?.username && router.push(`/profile/${post.profiles.username}`)
              }
              style={{
                borderWidth: 1,
                borderColor: "#1e293b",
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                gap: 6,
              }}
            >
              <Text style={{ color: "#c084fc", fontSize: 12, fontWeight: "600" }}>
                @{post.profiles?.username || "user"}
              </Text>
              <Text style={{ color: "#e2e8f0", fontSize: 14 }} numberOfLines={3}>
                {post.content}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View>
        <SectionHeader
          title="Venues Nearby"
          icon="business-outline"
          onSeeAll={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/discover/users`)}
        />
        {venues.length === 0 ? (
          <EmptyRow label="No venues to discover yet." />
        ) : (
          venues.map((venue) => (
            <Pressable
              key={venue.id}
              onPress={() =>
                venue.username ? router.push(`/profile/${venue.username}`) : undefined
              }
              style={{
                borderWidth: 1,
                borderColor: "#1e293b",
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                gap: 4,
              }}
            >
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                {venue.display_name}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={1}>
                {venue.location || `@${venue.username}`}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <View>
        <SectionHeader
          title="Merch"
          icon="bag-handle-outline"
          onSeeAll={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/marketplace`)}
        />
        {merch.length === 0 ? (
          <EmptyRow label="No merch listings available." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {merch.map((listing) => (
              <View
                key={listing.id}
                style={{
                  width: 130,
                  borderWidth: 1,
                  borderColor: "#1e293b",
                  borderRadius: 12,
                  padding: 10,
                  gap: 6,
                }}
              >
                {listing.cover_image_url ? (
                  <Image
                    source={{ uri: listing.cover_image_url }}
                    style={{ width: "100%", height: 110, borderRadius: 8, backgroundColor: "#1e293b" }}
                  />
                ) : (
                  <View
                    style={{
                      width: "100%",
                      height: 110,
                      borderRadius: 8,
                      backgroundColor: "#1e293b",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="shirt-outline" size={28} color="#f472b6" />
                  </View>
                )}
                <Text style={{ color: "#f8fafc", fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                  {listing.title}
                </Text>
                {typeof listing.base_price === "number" ? (
                  <Text style={{ color: "#94a3b8", fontSize: 11 }}>
                    {(listing.currency || "USD").toUpperCase()} {listing.base_price.toFixed(2)}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View>
        <SectionHeader
          title="Open jobs"
          icon="briefcase-outline"
          onSeeAll={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/jobs`)}
        />
        {jobs.length === 0 ? (
          <EmptyRow label="No open roles right now." />
        ) : (
          jobs.map((job) => (
            <Pressable
              key={job.id}
              onPress={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/jobs`)}
              style={{
                borderWidth: 1,
                borderColor: "#1e293b",
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                gap: 4,
              }}
            >
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                {job.title}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                {[job.city, job.state, job.country].filter(Boolean).join(", ") || "Location flexible"}
              </Text>
              {typeof job.payment_amount === "number" ? (
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  {job.payment_type || "Pay"}: {job.payment_amount}
                </Text>
              ) : null}
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  )
}
