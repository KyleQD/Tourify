import { useEffect, useState } from "react"
import { ActivityIndicator, Alert, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"
import * as Location from "expo-location"
import { getDiscoverFeed, DiscoverResponse } from "@/lib/api/discover"
import { followUser } from "@/lib/api/follow"
import { useAccountMode } from "@/hooks/use-account-mode"

type DiscoverIntent = "grow" | "network" | "book" | "learn"

export default function DiscoverScreen() {
  const { isVenueMode } = useAccountMode()
  const [isLoading, setIsLoading] = useState(true)
  const [location, setLocation] = useState("")
  const [creatorType, setCreatorType] = useState("")
  const [service, setService] = useState("")
  const [availableForHireOnly, setAvailableForHireOnly] = useState(false)
  const [intent, setIntent] = useState<DiscoverIntent>("grow")
  const [payload, setPayload] = useState<DiscoverResponse | null>(null)
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({})
  const [peopleFilter, setPeopleFilter] = useState<"all" | "venue" | "artist">("all")
  async function handleFollow(profileId: string) {
    try {
      await followUser(profileId)
      setFollowedIds((current) => ({
        ...current,
        [profileId]: true
      }))
    } catch (error) {
      Alert.alert("Follow failed", error instanceof Error ? error.message : "Please try again")
    }
  }


  useEffect(() => {
    void loadDiscover()
  }, [intent])

  async function loadDiscover(customLocation?: string) {
    setIsLoading(true)
    try {
      const response = await getDiscoverFeed({
        intent,
        location: customLocation ?? location,
        creatorType,
        service,
        availableForHire: availableForHireOnly
      })
      setPayload(response)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUseLocation() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) return
    const current = await Location.getCurrentPositionAsync({})
    const result = await Location.reverseGeocodeAsync({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude
    })
    const first = result[0]
    const resolved = [first?.city, first?.region].filter(Boolean).join(", ")
    setLocation(resolved)
    await loadDiscover(resolved)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{isVenueMode ? "Venue Leads" : "Discover"}</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          placeholder="Filter by location"
          placeholderTextColor="#64748b"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => loadDiscover()} style={pillStyle}>
            <Text style={pillTextStyle}>Apply</Text>
          </Pressable>
          <Pressable onPress={handleUseLocation} style={pillStyle}>
            <Text style={pillTextStyle}>Use current location</Text>
          </Pressable>
        </View>
        <TextInput
          value={creatorType}
          onChangeText={setCreatorType}
          placeholder="Creator type (photographer, designer...)"
          placeholderTextColor="#64748b"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
        />
        <TextInput
          value={service}
          onChangeText={setService}
          placeholder="Service keyword (video, merch, styling...)"
          placeholderTextColor="#64748b"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
        />
        <Pressable
          onPress={() => setAvailableForHireOnly((current) => !current)}
          style={intentStyle(availableForHireOnly)}
        >
          <Text style={pillTextStyle}>{availableForHireOnly ? "Hire-ready only: ON" : "Hire-ready only: OFF"}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["grow", "network", "book", "learn"] as DiscoverIntent[]).map((nextIntent) => (
            <Pressable key={nextIntent} onPress={() => setIntent(nextIntent)} style={intentStyle(intent === nextIntent)}>
              <Text style={pillTextStyle}>{nextIntent}</Text>
            </Pressable>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#a855f7" />
        ) : (
          <View style={{ gap: 12 }}>
            <Section title="Trending">
              {(payload?.sections.trending || []).map((item) => (
                <Card key={item.id} label={item.content} />
              ))}
            </Section>
            <Section title="Upcoming Events">
              {(payload?.sections.upcoming || []).map((item) => (
                <Card key={item.id} label={`${item.title} • ${item.venue_name || "Venue TBD"}`} />
              ))}
            </Section>
            <Section title="People">
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Pressable onPress={() => setPeopleFilter("all")} style={intentStyle(peopleFilter === "all")}>
                  <Text style={pillTextStyle}>All</Text>
                </Pressable>
                <Pressable onPress={() => setPeopleFilter("venue")} style={intentStyle(peopleFilter === "venue")}>
                  <Text style={pillTextStyle}>Venues</Text>
                </Pressable>
                <Pressable onPress={() => setPeopleFilter("artist")} style={intentStyle(peopleFilter === "artist")}>
                  <Text style={pillTextStyle}>Artists</Text>
                </Pressable>
              </View>
              {(payload?.sections.people || [])
                .filter((item) => peopleFilter === "all" || item.account_type === peopleFilter)
                .map((item) => (
                <Card
                  key={item.id}
                  label={[
                    item.display_name,
                    `@${item.username}`,
                    item.account_type,
                    item.creator_type || "",
                    item.available_for_hire ? "Available for hire" : ""
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                  actionLabel={followedIds[item.id] ? "Following" : "Follow"}
                  onAction={followedIds[item.id] ? undefined : () => handleFollow(item.id)}
                />
              ))}
            </Section>
            <Section title="Hire Matches">
              {(payload?.sections.hire_matches || []).map((item) => (
                <Card
                  key={`hire-${item.id}`}
                  label={[
                    item.display_name,
                    `@${item.username}`,
                    item.creator_type || "",
                    item.available_for_hire ? "Available for hire" : ""
                  ]
                    .filter(Boolean)
                    .join(" • ")}
                  actionLabel={followedIds[item.id] ? "Following" : "Follow"}
                  onAction={followedIds[item.id] ? undefined : () => handleFollow(item.id)}
                />
              ))}
            </Section>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: "#e2e8f0", fontWeight: "700", fontSize: 16 }}>{title}</Text>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  )
}

function Card({
  label,
  actionLabel,
  onAction
}: {
  label: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 8 }}>
      <Text style={{ color: "#cbd5e1" }}>{label}</Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          disabled={!onAction}
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#334155",
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignSelf: "flex-start",
            backgroundColor: onAction ? "transparent" : "#1e293b"
          }}
        >
          <Text style={{ color: "#cbd5e1", fontWeight: "600" }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const pillStyle = { borderWidth: 1, borderColor: "#334155", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 } as const
const pillTextStyle = { color: "#cbd5e1", fontWeight: "600" } as const

function intentStyle(isActive: boolean) {
  return {
    borderWidth: 1,
    borderColor: isActive ? "#a855f7" : "#334155",
    backgroundColor: isActive ? "#581c87" : "transparent",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  } as const
}
