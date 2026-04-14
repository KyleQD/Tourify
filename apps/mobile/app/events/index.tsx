import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/lib/auth/auth-provider"

type EventStatus = "draft" | "published" | "cancelled" | "completed"

interface EventRow {
  id: string
  title: string
  event_date: string | null
  location: string | null
  status: EventStatus | null
  venue_name: string | null
  artist_id: string | null
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#1e293b", text: "#94a3b8" },
  published: { bg: "#064e3b", text: "#6ee7b7" },
  cancelled: { bg: "#7f1d1d", text: "#fca5a5" },
  completed: { bg: "#1e1b4b", text: "#a5b4fc" },
}

export default function EventsScreen() {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id

  const [events, setEvents] = useState<EventRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showMyEvents, setShowMyEvents] = useState(false)

  const loadEvents = useCallback(async () => {
    setIsLoading(true)

    let query = supabase
      .from("events")
      .select("id, title, event_date, location, status, venue_name, artist_id")
      .order("event_date", { ascending: true })
      .limit(100)

    if (showMyEvents && userId) {
      query = query.eq("artist_id", userId)
    }

    const { data, error } = await query

    if (error) {
      Alert.alert("Failed to load events", error.message)
      setEvents([])
      setIsLoading(false)
      return
    }

    setEvents((data || []) as EventRow[])
    setIsLoading(false)
  }, [showMyEvents, userId])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events
    const normalizedQuery = searchQuery.toLowerCase()
    return events.filter(
      (event) =>
        event.title?.toLowerCase().includes(normalizedQuery) ||
        event.venue_name?.toLowerCase().includes(normalizedQuery) ||
        event.location?.toLowerCase().includes(normalizedQuery)
    )
  }, [events, searchQuery])

  function renderEvent({ item }: { item: EventRow }) {
    const colors = statusColors[item.status || "draft"] || statusColors.draft
    const formattedDate = item.event_date
      ? new Date(item.event_date).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "Date TBD"

    return (
      <Pressable
        onPress={() => router.push(`/events/${item.id}`)}
        style={{
          borderWidth: 1,
          borderColor: "#334155",
          borderRadius: 12,
          padding: 14,
          gap: 6,
          backgroundColor: "#0f172a",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#f8fafc", fontWeight: "700", fontSize: 16, flex: 1 }} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={{ backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginLeft: 8 }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600", textTransform: "capitalize" }}>
              {item.status || "draft"}
            </Text>
          </View>
        </View>
        <Text style={{ color: "#94a3b8", fontSize: 13 }}>{formattedDate}</Text>
        {item.venue_name || item.location ? (
          <Text style={{ color: "#64748b", fontSize: 13 }} numberOfLines={1}>
            {item.venue_name || item.location}
          </Text>
        ) : null}
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ padding: 16, gap: 12, flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Events</Text>

        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events..."
          placeholderTextColor="#64748b"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            borderWidth: 1,
            borderColor: "#334155",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: "#fff",
          }}
        />

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setShowMyEvents(false)}
            style={filterPill(!showMyEvents)}
          >
            <Text style={pillText}>All Events</Text>
          </Pressable>
          {userId ? (
            <Pressable
              onPress={() => setShowMyEvents(true)}
              style={filterPill(showMyEvents)}
            >
              <Text style={pillText}>My Events</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#a855f7" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            contentContainerStyle={{ gap: 10, paddingBottom: 80 }}
            ListEmptyComponent={
              <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 14, backgroundColor: "#0f172a" }}>
                <Text style={{ color: "#94a3b8" }}>
                  {searchQuery ? "No events match your search." : "No events found."}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Pressable
        onPress={() => Alert.alert("Create Event", "Event creation will open the web editor.")}
        style={{
          position: "absolute",
          bottom: 32,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#7c3aed",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 6,
          elevation: 8,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "300", lineHeight: 30 }}>+</Text>
      </Pressable>
    </SafeAreaView>
  )
}

function filterPill(isActive: boolean) {
  return {
    borderWidth: 1,
    borderColor: isActive ? "#a855f7" : "#334155",
    backgroundColor: isActive ? "#581c87" : "transparent",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  } as const
}

const pillText = { color: "#cbd5e1", fontWeight: "600" } as const
