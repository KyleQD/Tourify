import { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "@/lib/supabase"

interface ProfileResult {
  id: string
  username: string
  display_name: string | null
  account_type: string | null
  avatar_url: string | null
}

interface EventResult {
  id: string
  name: string
  event_date: string | null
  venue_name: string | null
}

type SearchResult =
  | { kind: "section"; title: string }
  | { kind: "profile"; data: ProfileResult }
  | { kind: "event"; data: EventResult }

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const runSearch = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    const pattern = `%${trimmed}%`

    const [profilesRes, eventsRes] = await Promise.allSettled([
      supabase
        .from("profiles")
        .select("id, username, display_name, account_type, avatar_url")
        .or(`display_name.ilike.${pattern},username.ilike.${pattern},name.ilike.${pattern}`)
        .limit(15),
      supabase
        .from("events")
        .select("id, name, event_date, venue_name")
        .ilike("name", pattern)
        .limit(15)
    ])

    const profiles: ProfileResult[] =
      profilesRes.status === "fulfilled" && profilesRes.value.data
        ? profilesRes.value.data
        : []

    const events: EventResult[] =
      eventsRes.status === "fulfilled" && eventsRes.value.data
        ? eventsRes.value.data
        : []

    const combined: SearchResult[] = []

    if (profiles.length) {
      combined.push({ kind: "section", title: "People" })
      for (const profile of profiles) combined.push({ kind: "profile", data: profile })
    }

    if (events.length) {
      combined.push({ kind: "section", title: "Events" })
      for (const event of events) combined.push({ kind: "event", data: event })
    }

    setResults(combined)
    setIsSearching(false)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void runSearch(query), 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, runSearch])

  function getItemKey(item: SearchResult, index: number) {
    if (item.kind === "section") return `section-${item.title}`
    if (item.kind === "profile") return `profile-${item.data.id}`
    return `event-${item.data.id}-${index}`
  }

  function renderItem({ item }: { item: SearchResult }) {
    if (item.kind === "section") {
      return (
        <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "700", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {item.title}
        </Text>
      )
    }

    if (item.kind === "profile") {
      return (
        <Pressable
          onPress={() => router.push(`/profile/${item.data.username}`)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#a78bfa", fontWeight: "700", fontSize: 16 }}>
              {(item.data.display_name || item.data.username).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#f8fafc", fontWeight: "600" }}>
              {item.data.display_name || item.data.username}
            </Text>
            <Text style={{ color: "#64748b", fontSize: 13 }}>
              @{item.data.username}
              {item.data.account_type ? ` · ${item.data.account_type}` : ""}
            </Text>
          </View>
        </Pressable>
      )
    }

    return (
      <Pressable
        onPress={() => router.push(`/events/${item.data.id}` as never)}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#c084fc", fontWeight: "700", fontSize: 16 }}>E</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#f8fafc", fontWeight: "600" }}>{item.data.name}</Text>
          <Text style={{ color: "#64748b", fontSize: 13 }}>
            {[item.data.venue_name, item.data.event_date].filter(Boolean).join(" · ") || "Event"}
          </Text>
        </View>
      </Pressable>
    )
  }

  const isEmpty = hasSearched && !isSearching && results.length === 0

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search people or events..."
          placeholderTextColor="#64748b"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            borderWidth: 1,
            borderColor: "#334155",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: "#fff",
            backgroundColor: "#0f172a",
            fontSize: 16
          }}
        />
      </View>

      {!query.trim() && !hasSearched ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: "#475569", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
            Find people by name or username, and events by title.
          </Text>
        </View>
      ) : isSearching ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      ) : isEmpty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Text style={{ color: "#475569", fontSize: 15, textAlign: "center", lineHeight: 22 }}>
            No results for "{query.trim()}". Try a different search term.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={getItemKey}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  )
}
