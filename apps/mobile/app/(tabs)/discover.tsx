import { useCallback, useEffect, useMemo, useState } from "react"
import { ActivityIndicator, Alert, ImageBackground, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native"
import * as Location from "expo-location"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { getDiscoverFeed, DiscoverResponse } from "@/lib/api/discover"
import { followUser } from "@/lib/api/follow"
import { getHubFeed, HubResponse } from "@/lib/api/hub"
import { isQueuedOfflineError } from "@/lib/api/client"
import { useAccountMode } from "@/hooks/use-account-mode"

type DiscoverIntent = "grow" | "network" | "book" | "learn"
interface DiscoverFilters {
  intent: DiscoverIntent
  location?: string
  creatorType?: string
  service?: string
  availableForHire?: boolean
}

type DiscoverTopic = "music" | "events" | "jobs" | "updates" | "merch" | "people"
type PersonalizedItemKind = "music" | "events" | "jobs" | "updates" | "merch" | "people"

interface PersonalizedItem {
  id: string
  topic: DiscoverTopic
  kind: PersonalizedItemKind
  title: string
  description: string
  meta?: string
  score: number
  reasons: string[]
  profileId?: string
}

interface PersonalizationSignal {
  topic: DiscoverTopic
  message: string
  timestamp: number
  affinityDelta: number
  previousPreference?: boolean
  nextPreference?: boolean
}

const quickFilters = [
  { label: "Tonight", intent: "book", service: "tonight" },
  { label: "Budget", intent: "grow", service: "budget" },
  { label: "Outdoors", intent: "book", service: "outdoor" },
  { label: "Group-friendly", intent: "network", service: "group" }
] as const

const intentLabels: Record<DiscoverIntent, string> = {
  grow: "Grow your audience",
  network: "Find collaborators",
  book: "Lock in bookings",
  learn: "Learn from the scene"
}

const featuredDiscoverImage = require("../../assets/launch/splash-image-1242x2436-v1.png")
const discoverTopicPreferencesKey = "tourify-mobile:discover-topic-preferences:v1"
const discoverTopicAffinityKey = "tourify-mobile:discover-topic-affinity:v1"
const discoverTopicAffinityUpdatedAtKey = "tourify-mobile:discover-topic-affinity-updated-at:v1"
const discoverPersonalizationHistoryKey = "tourify-mobile:discover-personalization-history:v1"
const topicOrder: DiscoverTopic[] = ["music", "events", "jobs", "updates", "merch", "people"]
const defaultTopicPreferences: Record<DiscoverTopic, boolean> = {
  music: true,
  events: true,
  jobs: true,
  updates: true,
  merch: true,
  people: true
}
const intentTopicBoosts: Record<DiscoverIntent, DiscoverTopic[]> = {
  grow: ["music", "updates", "merch"],
  network: ["people", "events", "updates"],
  book: ["events", "jobs", "people"],
  learn: ["updates", "music", "people"]
}
const topicLabels: Record<DiscoverTopic, string> = {
  music: "New music",
  events: "Events",
  jobs: "Jobs",
  updates: "Updates",
  merch: "Merch drops",
  people: "People"
}
const defaultTopicAffinity: Record<DiscoverTopic, number> = {
  music: 0,
  events: 0,
  jobs: 0,
  updates: 0,
  merch: 0,
  people: 0
}
const personalizationHistoryLimit = 20

export default function DiscoverScreen() {
  const { isVenueMode } = useAccountMode()
  const [isLoading, setIsLoading] = useState(true)
  const [location, setLocation] = useState("")
  const [creatorType, setCreatorType] = useState("")
  const [service, setService] = useState("")
  const [availableForHireOnly, setAvailableForHireOnly] = useState(false)
  const [intent, setIntent] = useState<DiscoverIntent>("grow")
  const [payload, setPayload] = useState<DiscoverResponse | null>(null)
  const [hubPayload, setHubPayload] = useState<HubResponse | null>(null)
  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>({})
  const [peopleFilter, setPeopleFilter] = useState<"all" | "venue" | "artist">("all")
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null)
  const [topicPreferences, setTopicPreferences] = useState<Record<DiscoverTopic, boolean>>(defaultTopicPreferences)
  const [topicAffinity, setTopicAffinity] = useState<Record<DiscoverTopic, number>>(defaultTopicAffinity)
  const [isPreferencesReady, setIsPreferencesReady] = useState(false)
  const [personalizationHistory, setPersonalizationHistory] = useState<PersonalizationSignal[]>([])
  const lastPersonalizationSignal = personalizationHistory[0] || null
  async function handleFollow(profileId: string) {
    try {
      await followUser(profileId)
      setFollowedIds((current) => ({
        ...current,
        [profileId]: true
      }))
    } catch (error) {
      if (isQueuedOfflineError(error)) {
        setFollowedIds((current) => ({
          ...current,
          [profileId]: true
        }))
        Alert.alert("Queued", "No service right now. We will sync this follow when connection returns.")
        return
      }
      Alert.alert("Follow failed", error instanceof Error ? error.message : "Please try again")
    }
  }


  const loadDiscover = useCallback(async (filters: DiscoverFilters) => {
    setIsLoading(true)
    try {
      const [discoverResult, hubResult] = await Promise.allSettled([
        getDiscoverFeed({
          intent: filters.intent,
          location: filters.location ?? "",
          creatorType: filters.creatorType ?? "",
          service: filters.service ?? "",
          availableForHire: filters.availableForHire ?? false
        }),
        getHubFeed({
          location: filters.location ?? "",
          intent: filters.intent
        })
      ])
      if (discoverResult.status === "fulfilled") setPayload(discoverResult.value)
      if (hubResult.status === "fulfilled") setHubPayload(hubResult.value)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDiscover({
      intent,
      location,
      creatorType,
      service,
      availableForHire: availableForHireOnly
    })
  }, [intent, loadDiscover])

  useEffect(() => {
    let isMounted = true
    async function hydrateTopicPreferences() {
      try {
        const [storedPreferences, storedAffinity, storedAffinityUpdatedAt, storedHistory] = await Promise.all([
          AsyncStorage.getItem(discoverTopicPreferencesKey),
          AsyncStorage.getItem(discoverTopicAffinityKey),
          AsyncStorage.getItem(discoverTopicAffinityUpdatedAtKey),
          AsyncStorage.getItem(discoverPersonalizationHistoryKey)
        ])
        if (!isMounted) return
        if (storedPreferences) {
          const parsedPreferences = JSON.parse(storedPreferences) as Partial<Record<DiscoverTopic, boolean>>
          setTopicPreferences({
            ...defaultTopicPreferences,
            ...parsedPreferences
          })
        }
        if (storedAffinity || storedAffinityUpdatedAt) {
          const parsedAffinity = storedAffinity
            ? (JSON.parse(storedAffinity) as Partial<Record<DiscoverTopic, number>>)
            : {}
          const normalizedAffinity = {
            ...defaultTopicAffinity,
            ...parsedAffinity
          }
          const lastUpdatedAt = Number(storedAffinityUpdatedAt || Date.now())
          setTopicAffinity({
            ...decayTopicAffinity({
              affinity: normalizedAffinity,
              lastUpdatedAt,
              currentTimestamp: Date.now()
            })
          })
        }
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory) as PersonalizationSignal[]
          const normalizedHistory = Array.isArray(parsedHistory)
            ? parsedHistory
              .filter((item) =>
                item &&
                typeof item.topic === "string" &&
                typeof item.message === "string" &&
                typeof item.timestamp === "number" &&
                typeof item.affinityDelta === "number"
              )
              .slice(0, personalizationHistoryLimit)
            : []
          setPersonalizationHistory(normalizedHistory)
        }
      } catch {
        if (!isMounted) return
        setTopicPreferences(defaultTopicPreferences)
        setTopicAffinity(defaultTopicAffinity)
        setPersonalizationHistory([])
      } finally {
        if (isMounted) setIsPreferencesReady(true)
      }
    }
    void hydrateTopicPreferences()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isPreferencesReady) return
    void Promise.all([
      AsyncStorage.setItem(discoverTopicPreferencesKey, JSON.stringify(topicPreferences)),
      AsyncStorage.setItem(discoverTopicAffinityKey, JSON.stringify(topicAffinity)),
      AsyncStorage.setItem(discoverTopicAffinityUpdatedAtKey, String(Date.now())),
      AsyncStorage.setItem(
        discoverPersonalizationHistoryKey,
        JSON.stringify(personalizationHistory.slice(0, personalizationHistoryLimit))
      )
    ])
  }, [isPreferencesReady, topicPreferences, topicAffinity, personalizationHistory])

  const setTopicPreference = useCallback((topic: DiscoverTopic, shouldEnable: boolean) => {
    setTopicPreferences((current) => {
      const nextPreferences = {
        ...current,
        [topic]: shouldEnable
      }
      const nextActiveCount = topicOrder.filter((itemTopic) => nextPreferences[itemTopic]).length
      if (nextActiveCount === 0) {
        Alert.alert("Keep one category on", "Turn on at least one category so we can build your feed.")
        return current
      }
      return nextPreferences
    })
  }, [])

  const reinforceTopic = useCallback((params: {
    topic: DiscoverTopic
    amount: number
    message: string
    previousPreference?: boolean
    nextPreference?: boolean
  }) => {
    setTopicAffinity((current) => ({
      ...current,
      [params.topic]: clampAffinity(current[params.topic] + params.amount)
    }))
    setPersonalizationHistory((current) => {
      const nextSignal: PersonalizationSignal = {
        topic: params.topic,
        message: params.message,
        timestamp: Date.now(),
        affinityDelta: params.amount,
        previousPreference: params.previousPreference,
        nextPreference: params.nextPreference
      }
      return [nextSignal, ...current].slice(0, personalizationHistoryLimit)
    })
  }, [])

  const undoLastPersonalization = useCallback(() => {
    const currentSignal = personalizationHistory[0]
    if (!currentSignal) return
    setTopicAffinity((current) => ({
      ...current,
      [currentSignal.topic]: clampAffinity(
        current[currentSignal.topic] - currentSignal.affinityDelta
      )
    }))
    if (
      typeof currentSignal.previousPreference === "boolean" &&
      typeof currentSignal.nextPreference === "boolean" &&
      currentSignal.previousPreference !== currentSignal.nextPreference
    ) {
      setTopicPreference(currentSignal.topic, currentSignal.previousPreference)
    }
    setPersonalizationHistory((current) => current.slice(1))
  }, [personalizationHistory, setTopicPreference])

  const clearLearningMemory = useCallback(() => {
    setTopicAffinity(defaultTopicAffinity)
    setPersonalizationHistory([])
  }, [])

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
    await runDiscoverWithCurrentFilters({ location: resolved })
  }

  async function applyQuickFilter(nextFilter: (typeof quickFilters)[number]) {
    const doesNeedImmediateRefresh = intent === nextFilter.intent
    setIntent(nextFilter.intent)
    setService(nextFilter.service)
    setActiveQuickFilter(nextFilter.label)
    if (doesNeedImmediateRefresh)
      await runDiscoverWithCurrentFilters({
        intent: nextFilter.intent,
        service: nextFilter.service
      })
  }

  async function runDiscoverWithCurrentFilters(overrides: Partial<DiscoverFilters> = {}) {
    await loadDiscover({
      intent: overrides.intent ?? intent,
      location: overrides.location ?? location,
      creatorType: overrides.creatorType ?? creatorType,
      service: overrides.service ?? service,
      availableForHire: overrides.availableForHire ?? availableForHireOnly
    })
  }

  const filteredPeople = (payload?.sections.people || []).filter(
    (item) => peopleFilter === "all" || item.account_type === peopleFilter
  )
  const trendingItems = payload?.sections.trending || []
  const upcomingItems = payload?.sections.upcoming || []
  const hireMatches = payload?.sections.hire_matches || []
  const hubJobs = hubPayload?.sections?.jobs || []
  const hubUpdates = hubPayload?.sections?.pulse || []
  const hubEvents = hubPayload?.sections?.discover || []
  const allEvents = dedupeById([...upcomingItems, ...hubEvents])
  const musicItems = trendingItems.filter((item) => detectPostTopics(item.content).includes("music"))
  const merchItems = trendingItems.filter((item) => detectPostTopics(item.content).includes("merch"))
  const updatesFromTrending = trendingItems.filter((item) => detectPostTopics(item.content).includes("updates"))
  const updatesItems = [...hubUpdates.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    sourceName: item.sourceName,
    publishedAt: item.publishedAt
  })), ...updatesFromTrending.map((item) => ({
    id: `post-update-${item.id}`,
    title: "Scene update",
    summary: item.content,
    sourceName: "Tourify Feed",
    publishedAt: item.created_at
  }))]
  const personalizedFeed = useMemo(() => {
    return buildPersonalizedFeed({
      topicPreferences,
      topicAffinity,
      intent,
      location,
      service,
      availableForHireOnly,
      people: filteredPeople,
      hireMatches,
      events: allEvents,
      jobs: hubJobs,
      updates: updatesItems,
      musicItems,
      merchItems
    })
  }, [topicPreferences, topicAffinity, intent, location, service, availableForHireOnly, filteredPeople, hireMatches, allEvents, hubJobs, updatesItems, musicItems, merchItems])

  const activeTopicCount = topicOrder.filter((topic) => topicPreferences[topic]).length
  const topBoostedTopics = useMemo(() => {
    return topicOrder
      .map((topic) => ({ topic, score: topicAffinity[topic] || 0 }))
      .filter((item) => item.score > 0.25)
      .sort((left, right) => right.score - left.score)
      .slice(0, 2)
  }, [topicAffinity])
  const topSuppressedTopics = useMemo(() => {
    return topicOrder
      .map((topic) => ({ topic, score: topicAffinity[topic] || 0 }))
      .filter((item) => item.score < -0.25)
      .sort((left, right) => left.score - right.score)
      .slice(0, 2)
  }, [topicAffinity])
  const sectionCounts = {
    music: musicItems.length,
    events: allEvents.length,
    jobs: hubJobs.length,
    updates: updatesItems.length,
    merch: merchItems.length,
    people: filteredPeople.length
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        accessibilityState={{ busy: isLoading }}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 44 }}
      >
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>{isVenueMode ? "Venue Leads" : "Discover"}</Text>
        <ImageBackground
          source={featuredDiscoverImage}
          style={{
            borderWidth: 1,
            borderColor: "#334155",
            borderRadius: 16,
            overflow: "hidden"
          }}
          imageStyle={{ opacity: 0.38 }}
        >
          <View style={{ padding: 14, gap: 8, backgroundColor: "rgba(2, 6, 23, 0.72)" }}>
            <Text style={{ color: "#f8fafc", fontSize: 16, fontWeight: "700" }}>Featured story</Text>
            <Text style={{ color: "#cbd5e1", lineHeight: 20 }}>
              Discover high-fit opportunities near you. Start with one quick filter and refine from there.
            </Text>
            <Text style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 0.2 }}>{intentLabels[intent]}</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
              {quickFilters.map((item) => (
                <Pressable
                  key={item.label}
                  onPress={() => void applyQuickFilter(item)}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel={`Quick filter ${item.label}`}
                  accessibilityState={{ selected: activeQuickFilter === item.label, disabled: isLoading }}
                  style={[quickFilterStyle(activeQuickFilter === item.label), isLoading ? disabledStyle : null]}
                >
                  <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ImageBackground>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <StatsPill label="Music" value={sectionCounts.music} />
          <StatsPill label="Events" value={sectionCounts.events} />
          <StatsPill label="Jobs" value={sectionCounts.jobs} />
          <StatsPill label="Updates" value={sectionCounts.updates} />
          <StatsPill label="Merch" value={sectionCounts.merch} />
          <StatsPill label="People" value={sectionCounts.people} />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: "#e2e8f0", fontWeight: "700" }}>Tailor your feed</Text>
          <Text style={{ color: "#94a3b8", fontSize: 12 }}>
            Pick what you want to see most. We rank your feed using these preferences and your current filters.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {topicOrder.map((topic) => (
              <Pressable
                key={topic}
                onPress={() => setTopicPreference(topic, !topicPreferences[topic])}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${topicLabels[topic]} category`}
                accessibilityHint="Adjusts how much this category appears in your feed"
                accessibilityState={{ selected: topicPreferences[topic], disabled: isLoading }}
                style={[intentStyle(topicPreferences[topic]), isLoading ? disabledStyle : null]}
              >
                <Text style={pillTextStyle}>{topicLabels[topic]}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setTopicPreferences(defaultTopicPreferences)
                setTopicAffinity(defaultTopicAffinity)
                setPersonalizationHistory([])
              }}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Reset topic preferences"
              accessibilityHint="Restores default category preferences and personalization weights"
              accessibilityState={{ disabled: isLoading }}
              style={[pillStyle, isLoading ? disabledStyle : null]}
            >
              <Text style={pillTextStyle}>Reset topics</Text>
            </Pressable>
            <Pressable
              onPress={clearLearningMemory}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Clear personalization learning memory"
              accessibilityHint="Resets learned ranking memory and undo history while keeping your selected categories"
              accessibilityState={{ disabled: isLoading }}
              style={[pillStyle, isLoading ? disabledStyle : null]}
            >
              <Text style={pillTextStyle}>Clear learning memory</Text>
            </Pressable>
          </View>
          <Text style={{ color: "#64748b", fontSize: 12 }}>
            {activeTopicCount} of {topicOrder.length} categories active
          </Text>
          {topBoostedTopics.length ? (
            <Text style={{ color: "#22c55e", fontSize: 12 }}>
              Most boosted: {topBoostedTopics.map((item) => `${topicLabels[item.topic]} (+${item.score.toFixed(1)})`).join(" • ")}
            </Text>
          ) : null}
          {topSuppressedTopics.length ? (
            <Text style={{ color: "#f59e0b", fontSize: 12 }}>
              Most suppressed: {topSuppressedTopics.map((item) => `${topicLabels[item.topic]} (${item.score.toFixed(1)})`).join(" • ")}
            </Text>
          ) : null}
          {lastPersonalizationSignal ? (
            <View style={{ gap: 6 }}>
              <Text style={{ color: "#a5b4fc", fontSize: 12 }}>
                Personalization updated: {lastPersonalizationSignal.message} ({formatRelativeTime(lastPersonalizationSignal.timestamp)})
              </Text>
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                Undo available for {personalizationHistory.length} recent change{personalizationHistory.length === 1 ? "" : "s"}
              </Text>
              <Pressable
                onPress={undoLastPersonalization}
                disabled={isLoading}
                accessibilityRole="button"
                accessibilityLabel="Undo last personalization change"
                accessibilityHint="Reverts the most recent feed personalization adjustment"
                accessibilityState={{ disabled: isLoading }}
                style={[pillStyle, isLoading ? disabledStyle : null, { alignSelf: "flex-start" }]}
              >
                <Text style={pillTextStyle}>Undo latest change</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <TextInput
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={() => void runDiscoverWithCurrentFilters()}
          editable={!isLoading}
          accessibilityLabel="Filter results by location"
          placeholder="Filter by location"
          placeholderTextColor="#64748b"
          returnKeyType="search"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
        />
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => void runDiscoverWithCurrentFilters()}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Apply discover filters"
            accessibilityState={{ disabled: isLoading }}
            style={[pillStyle, isLoading ? disabledStyle : null]}
          >
            <Text style={pillTextStyle}>{isLoading ? "Applying..." : "Apply filters"}</Text>
          </Pressable>
          <Pressable
            onPress={handleUseLocation}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
            accessibilityState={{ disabled: isLoading }}
            style={[pillStyle, isLoading ? disabledStyle : null]}
          >
            <Text style={pillTextStyle}>Use current location</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setLocation("")
              setCreatorType("")
              setService("")
              setAvailableForHireOnly(false)
              setActiveQuickFilter(null)
              void runDiscoverWithCurrentFilters({
                location: "",
                creatorType: "",
                service: "",
                availableForHire: false
              })
            }}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Reset all discover filters"
            accessibilityState={{ disabled: isLoading }}
            style={[pillStyle, isLoading ? disabledStyle : null]}
          >
            <Text style={pillTextStyle}>Reset</Text>
          </Pressable>
        </View>
        <TextInput
          value={creatorType}
          onChangeText={setCreatorType}
          onSubmitEditing={() => void runDiscoverWithCurrentFilters()}
          editable={!isLoading}
          accessibilityLabel="Filter by creator type"
          placeholder="Creator type (photographer, designer...)"
          placeholderTextColor="#64748b"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
        />
        <TextInput
          value={service}
          onChangeText={(nextValue) => {
            setService(nextValue)
            setActiveQuickFilter(null)
          }}
          onSubmitEditing={() => void runDiscoverWithCurrentFilters()}
          editable={!isLoading}
          accessibilityLabel="Filter by service keyword"
          placeholder="Service keyword (video, merch, styling...)"
          placeholderTextColor="#64748b"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" }}
        />
        <Pressable
          onPress={() => setAvailableForHireOnly((current) => !current)}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityState={{ selected: availableForHireOnly, disabled: isLoading }}
          style={[intentStyle(availableForHireOnly), isLoading ? disabledStyle : null]}
        >
          <Text style={pillTextStyle}>{availableForHireOnly ? "Hire-ready only: ON" : "Hire-ready only: OFF"}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["grow", "network", "book", "learn"] as DiscoverIntent[]).map((nextIntent) => (
            <Pressable
              key={nextIntent}
              onPress={() => {
                setIntent(nextIntent)
                setActiveQuickFilter(null)
              }}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={`Set discover intent to ${nextIntent}`}
              accessibilityState={{ selected: intent === nextIntent, disabled: isLoading }}
              style={[intentStyle(intent === nextIntent), isLoading ? disabledStyle : null]}
            >
              <Text style={pillTextStyle}>{nextIntent}</Text>
            </Pressable>
          ))}
        </View>
        {isLoading ? (
          <Text accessibilityLiveRegion="polite" style={{ color: "#94a3b8", fontSize: 12 }}>
            Refreshing discover results...
          </Text>
        ) : null}

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#a855f7"
            accessibilityLabel="Loading discover results"
            accessibilityRole="progressbar"
          />
        ) : (
          <View style={{ gap: 12 }}>
            <Section title="For You">
              {personalizedFeed.length ? (
                personalizedFeed.map((item) => (
                  <PersonalizedCard
                    key={item.id}
                    item={item}
                    isFollowing={item.profileId ? Boolean(followedIds[item.profileId]) : false}
                    onFollow={
                      item.profileId && !followedIds[item.profileId]
                        ? async () => {
                          reinforceTopic({
                            topic: item.topic,
                            amount: 0.9,
                            message: `you followed a ${topicLabels[item.topic].toLowerCase()} item`
                          })
                          await handleFollow(item.profileId!)
                        }
                        : undefined
                    }
                    onHideTopic={() => {
                      reinforceTopic({
                        topic: item.topic,
                        amount: -1.2,
                        message: `you requested less ${topicLabels[item.topic].toLowerCase()}`,
                        previousPreference: topicPreferences[item.topic],
                        nextPreference: false
                      })
                      setTopicPreference(item.topic, false)
                    }}
                    onBoostTopic={() => {
                      reinforceTopic({
                        topic: item.topic,
                        amount: 0.8,
                        message: `you requested more ${topicLabels[item.topic].toLowerCase()}`,
                        previousPreference: topicPreferences[item.topic],
                        nextPreference: true
                      })
                      setTopicPreference(item.topic, true)
                    }}
                  />
                ))
              ) : (
                <EmptyState label="No personalized matches yet. Turn on more categories or reset filters to widen the feed." />
              )}
            </Section>
            <Section title="New Music">
              {musicItems.length ? (
                musicItems.map((item) => (
                  <Card key={`music-${item.id}`} label={item.content} />
                ))
              ) : (
                <EmptyState label="No new music signals right now. Keep updates enabled to catch release announcements." />
              )}
            </Section>
            <Section title="Merch Drops">
              {merchItems.length ? (
                merchItems.map((item) => (
                  <Card key={`merch-${item.id}`} label={item.content} />
                ))
              ) : (
                <EmptyState label="No merch drops detected yet. Try broadening location or service keywords." />
              )}
            </Section>
            <Section title="Updates">
              {updatesItems.length ? (
                updatesItems.map((item) => (
                  <Card key={`updates-${item.id}`} label={`${item.title} • ${item.summary}`} />
                ))
              ) : (
                <EmptyState label="No updates available right now." />
              )}
            </Section>
            <Section title="Jobs">
              {hubJobs.length ? (
                hubJobs.map((item) => (
                  <Card key={`job-${item.id}`} label={formatJobLabel(item)} />
                ))
              ) : (
                <EmptyState label="No jobs matched this moment. Try changing location or intent to Book." />
              )}
            </Section>
            <Section title="Trending">
              {trendingItems.length ? (
                trendingItems.map((item) => (
                  <Card key={item.id} label={item.content} />
                ))
              ) : (
                <EmptyState label="No trending items yet. Try a different quick filter." />
              )}
            </Section>
            <Section title="Upcoming Events">
              {allEvents.length ? (
                allEvents.map((item) => (
                  <Card key={item.id} label={`${item.title} • ${item.venue_name || "Venue TBD"}`} />
                ))
              ) : (
                <EmptyState label="No events matched. Use current location to improve results." />
              )}
            </Section>
            <Section title="People">
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Pressable
                  onPress={() => setPeopleFilter("all")}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Show all people"
                  accessibilityState={{ selected: peopleFilter === "all", disabled: isLoading }}
                  style={[intentStyle(peopleFilter === "all"), isLoading ? disabledStyle : null]}
                >
                  <Text style={pillTextStyle}>All</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPeopleFilter("venue")}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Show venues"
                  accessibilityState={{ selected: peopleFilter === "venue", disabled: isLoading }}
                  style={[intentStyle(peopleFilter === "venue"), isLoading ? disabledStyle : null]}
                >
                  <Text style={pillTextStyle}>Venues</Text>
                </Pressable>
                <Pressable
                  onPress={() => setPeopleFilter("artist")}
                  disabled={isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Show artists"
                  accessibilityState={{ selected: peopleFilter === "artist", disabled: isLoading }}
                  style={[intentStyle(peopleFilter === "artist"), isLoading ? disabledStyle : null]}
                >
                  <Text style={pillTextStyle}>Artists</Text>
                </Pressable>
              </View>
              {filteredPeople.length ? (
                filteredPeople.map((item) => (
                  <Card
                    key={item.id}
                    label={formatProfileLabel(item)}
                    actionLabel={followedIds[item.id] ? "Following" : "Follow"}
                    actionA11yLabel={formatFollowActionLabel({
                      displayName: item.display_name,
                      username: item.username,
                      isFollowing: Boolean(followedIds[item.id])
                    })}
                    onAction={followedIds[item.id] ? undefined : () => handleFollow(item.id)}
                  />
                ))
              ) : (
                <EmptyState label="No people found for this filter. Switch to All or reset filters." />
              )}
            </Section>
            <Section title="Hire Matches">
              {hireMatches.length ? (
                hireMatches.map((item) => (
                  <Card
                    key={`hire-${item.id}`}
                    label={formatProfileLabel(item)}
                    actionLabel={followedIds[item.id] ? "Following" : "Follow"}
                    actionA11yLabel={formatFollowActionLabel({
                      displayName: item.display_name,
                      username: item.username,
                      isFollowing: Boolean(followedIds[item.id])
                    })}
                    onAction={followedIds[item.id] ? undefined : () => handleFollow(item.id)}
                  />
                ))
              ) : (
                <EmptyState label="No hire-ready matches right now. Turn off Hire-ready only to broaden results." />
              )}
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
  onAction,
  actionA11yLabel
}: {
  label: string
  actionLabel?: string
  onAction?: () => void
  actionA11yLabel?: string
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 8 }}>
      <Text style={{ color: "#cbd5e1" }}>{label}</Text>
      {actionLabel ? (
        <Pressable
          onPress={onAction}
          disabled={!onAction}
          accessibilityRole="button"
          accessibilityLabel={actionA11yLabel || actionLabel}
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

function PersonalizedCard({
  item,
  isFollowing,
  onFollow,
  onHideTopic,
  onBoostTopic
}: {
  item: PersonalizedItem
  isFollowing: boolean
  onFollow?: () => void
  onHideTopic?: () => void
  onBoostTopic?: () => void
}) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 12, padding: 12, gap: 8, backgroundColor: "#0f172a" }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: "#f8fafc", fontWeight: "700" }}>{item.title}</Text>
        <View style={{ borderWidth: 1, borderColor: "#475569", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: "#cbd5e1", fontSize: 11 }}>{topicLabels[item.topic]}</Text>
        </View>
      </View>
      <Text style={{ color: "#cbd5e1" }}>{item.description}</Text>
      {item.meta ? <Text style={{ color: "#94a3b8", fontSize: 12 }}>{item.meta}</Text> : null}
      {item.reasons.length ? (
        <Text style={{ color: "#a5b4fc", fontSize: 12 }}>
          Why recommended: {item.reasons.slice(0, 2).join(" • ")}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {onFollow ? (
          <Pressable
            onPress={onFollow}
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? "Following" : "Follow creator"}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#334155",
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{ color: "#cbd5e1", fontWeight: "600" }}>{isFollowing ? "Following" : "Follow"}</Text>
          </Pressable>
        ) : null}
        {onHideTopic ? (
          <Pressable
            onPress={onHideTopic}
            accessibilityRole="button"
            accessibilityLabel={`Show less ${topicLabels[item.topic]}`}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#475569",
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{ color: "#94a3b8", fontWeight: "600" }}>Less like this</Text>
          </Pressable>
        ) : null}
        {onBoostTopic ? (
          <Pressable
            onPress={onBoostTopic}
            accessibilityRole="button"
            accessibilityLabel={`Show more ${topicLabels[item.topic]}`}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#7c3aed",
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignSelf: "flex-start"
            }}
          >
            <Text style={{ color: "#c4b5fd", fontWeight: "600" }}>More like this</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function StatsPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: "#0f172a" }}>
      <Text style={{ color: "#94a3b8", fontSize: 12 }}>{label}</Text>
      <Text style={{ color: "#f8fafc", fontWeight: "700", fontSize: 16 }}>{value}</Text>
    </View>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#334155", borderRadius: 10, padding: 10, backgroundColor: "#0f172a" }}>
      <Text style={{ color: "#94a3b8" }}>{label}</Text>
    </View>
  )
}

function quickFilterStyle(isActive: boolean) {
  return {
    borderWidth: 1,
    borderColor: isActive ? "#c084fc" : "#475569",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: isActive ? "#4c1d95" : "transparent"
  } as const
}

function formatProfileLabel(item: {
  display_name?: string | null
  username: string
  account_type?: string | null
  creator_type?: string | null
  available_for_hire?: boolean | null
}) {
  return [
    item.display_name,
    `@${item.username}`,
    item.account_type || "",
    item.creator_type || "",
    item.available_for_hire ? "Available for hire" : ""
  ]
    .filter(Boolean)
    .join(" • ")
}

function formatFollowActionLabel(params: { displayName?: string | null; username: string; isFollowing: boolean }) {
  const targetName = params.displayName || params.username
  if (params.isFollowing) return `Following ${targetName}`
  return `Follow ${targetName}`
}

function detectPostTopics(content: string): DiscoverTopic[] {
  const normalizedContent = content.toLowerCase()
  const detectedTopics: DiscoverTopic[] = []
  if (matchesKeywords(normalizedContent, ["new single", "new track", "new album", "listen now", "spotify", "apple music", "release"])) detectedTopics.push("music")
  if (matchesKeywords(normalizedContent, ["merch", "drop", "limited edition", "hoodie", "tee", "vinyl", "restock"])) detectedTopics.push("merch")
  if (!detectedTopics.length || matchesKeywords(normalizedContent, ["update", "announcement", "breaking", "news", "just in"])) detectedTopics.push("updates")
  return dedupeValues(detectedTopics)
}

function matchesKeywords(content: string, keywords: string[]) {
  return keywords.some((keyword) => content.includes(keyword))
}

function dedupeValues(values: DiscoverTopic[]) {
  return Array.from(new Set(values))
}

function clampAffinity(value: number) {
  if (value > 6) return 6
  if (value < -6) return -6
  return value
}

function formatRelativeTime(timestamp: number) {
  const elapsedMs = Date.now() - timestamp
  if (elapsedMs < 60 * 1000) return "just now"
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000))
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 24) return `${elapsedHours}h ago`
  const elapsedDays = Math.floor(elapsedHours / 24)
  return `${elapsedDays}d ago`
}

function decayTopicAffinity({
  affinity,
  lastUpdatedAt,
  currentTimestamp
}: {
  affinity: Record<DiscoverTopic, number>
  lastUpdatedAt: number
  currentTimestamp: number
}) {
  if (!Number.isFinite(lastUpdatedAt) || lastUpdatedAt <= 0) return affinity
  const elapsedMs = currentTimestamp - lastUpdatedAt
  if (elapsedMs <= 0) return affinity
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24)
  if (elapsedDays < 1) return affinity
  const dailyDecay = 0.92
  const decayFactor = Math.pow(dailyDecay, elapsedDays)
  const nextAffinity = {} as Record<DiscoverTopic, number>
  for (const topic of topicOrder)
    nextAffinity[topic] = clampAffinity(affinity[topic] * decayFactor)
  return nextAffinity
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>()
  for (const item of items)
    if (!map.has(item.id)) map.set(item.id, item)
  return Array.from(map.values())
}

function formatEventMeta(item: { event_date?: string | null; venue_name?: string | null }) {
  const metaParts = [item.event_date ? `Date: ${item.event_date}` : "", item.venue_name || "Venue TBD"].filter(Boolean)
  return metaParts.join(" • ")
}

function formatJobLabel(item: { title: string; city?: string | null; state?: string | null; payment_type?: string | null; payment_amount?: number | null }) {
  const locationLabel = [item.city, item.state].filter(Boolean).join(", ")
  const paymentLabel = item.payment_amount ? `${item.payment_type || "Pay"} ${item.payment_amount}` : item.payment_type || "Compensation listed in details"
  return [item.title, locationLabel, paymentLabel].filter(Boolean).join(" • ")
}

function scoreItem({
  topic,
  topicAffinity,
  intent,
  topicPreferences,
  availableForHireOnly,
  isHireReady,
  locationQuery,
  serviceQuery,
  searchableText
}: {
  topic: DiscoverTopic
  topicAffinity: Record<DiscoverTopic, number>
  intent: DiscoverIntent
  topicPreferences: Record<DiscoverTopic, boolean>
  availableForHireOnly: boolean
  isHireReady?: boolean
  locationQuery: string
  serviceQuery: string
  searchableText: string
}) {
  let score = topicPreferences[topic] ? 6 : 1
  score += topicAffinity[topic] || 0
  if (intentTopicBoosts[intent].includes(topic)) score += 3
  if (availableForHireOnly && isHireReady) score += 2
  if (availableForHireOnly && !isHireReady && topic === "people") score -= 3

  if (locationQuery && searchableText.toLowerCase().includes(locationQuery.toLowerCase())) score += 2
  if (serviceQuery && searchableText.toLowerCase().includes(serviceQuery.toLowerCase())) score += 2

  return score
}

function buildRecommendationReasons({
  topic,
  intent,
  topicPreferences,
  availableForHireOnly,
  isHireReady,
  locationQuery,
  serviceQuery,
  searchableText
}: {
  topic: DiscoverTopic
  intent: DiscoverIntent
  topicPreferences: Record<DiscoverTopic, boolean>
  availableForHireOnly: boolean
  isHireReady?: boolean
  locationQuery: string
  serviceQuery: string
  searchableText: string
}) {
  const reasons: string[] = []
  if (topicPreferences[topic]) reasons.push(`${topicLabels[topic]} is enabled`)
  if (intentTopicBoosts[intent].includes(topic)) reasons.push(`aligned to "${intent}" intent`)
  if (availableForHireOnly && topic === "people" && isHireReady) reasons.push("hire-ready match")
  if (locationQuery && searchableText.toLowerCase().includes(locationQuery.toLowerCase())) reasons.push("matches your location")
  if (serviceQuery && searchableText.toLowerCase().includes(serviceQuery.toLowerCase())) reasons.push("matches your service filter")
  if (!reasons.length) reasons.push("high relevance score")
  return reasons
}

function getRecencyBoost(value?: string | null) {
  if (!value) return 0
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return 0
  const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60)
  if (ageInHours <= 24) return 2
  if (ageInHours <= 72) return 1
  return 0
}

function diversifyFeed(items: PersonalizedItem[]) {
  const queue = [...items]
  const diversified: PersonalizedItem[] = []
  while (queue.length) {
    let pickedIndex = 0
    for (let index = 0; index < queue.length; index++) {
      const candidate = queue[index]
      const lastItem = diversified[diversified.length - 1]
      const secondLastItem = diversified[diversified.length - 2]
      const doesCreateTripleRun =
        lastItem?.topic === candidate.topic &&
        secondLastItem?.topic === candidate.topic
      if (!doesCreateTripleRun) {
        pickedIndex = index
        break
      }
    }
    diversified.push(queue[pickedIndex])
    queue.splice(pickedIndex, 1)
  }
  return diversified
}

function buildPersonalizedFeed({
  topicPreferences,
  topicAffinity,
  intent,
  location,
  service,
  availableForHireOnly,
  people,
  hireMatches,
  events,
  jobs,
  updates,
  musicItems,
  merchItems
}: {
  topicPreferences: Record<DiscoverTopic, boolean>
  topicAffinity: Record<DiscoverTopic, number>
  intent: DiscoverIntent
  location: string
  service: string
  availableForHireOnly: boolean
  people: Array<{
    id: string
    username: string
    display_name?: string | null
    account_type?: string | null
    creator_type?: string | null
    available_for_hire?: boolean | null
    location?: string | null
  }>
  hireMatches: Array<{
    id: string
    username: string
    display_name?: string | null
    account_type?: string | null
    creator_type?: string | null
    available_for_hire?: boolean | null
    location?: string | null
  }>
  events: Array<{
    id: string
    title: string
    event_date?: string | null
    venue_name?: string | null
    venue_city?: string | null
    venue_state?: string | null
  }>
  jobs: Array<{
    id: string
    title: string
    city?: string | null
    state?: string | null
    payment_type?: string | null
    payment_amount?: number | null
  }>
  updates: Array<{
    id: string
    title: string
    summary: string
    sourceName: string
    publishedAt: string
  }>
  musicItems: Array<{ id: string; content: string; created_at: string }>
  merchItems: Array<{ id: string; content: string; created_at: string }>
}) {
  const mergedPeople = dedupeById([...hireMatches, ...people])
  const feed: PersonalizedItem[] = []

  for (const item of musicItems) {
    const text = item.content
    const reasons = buildRecommendationReasons({
      topic: "music",
      intent,
      topicPreferences,
      availableForHireOnly,
      locationQuery: location,
      serviceQuery: service,
      searchableText: text
    })
    feed.push({
      id: `music-${item.id}`,
      topic: "music",
      kind: "music",
      title: "New music signal",
      description: text,
      meta: `From feed • ${item.created_at}`,
      score: scoreItem({
        topic: "music",
        topicAffinity,
        intent,
        topicPreferences,
        availableForHireOnly,
        locationQuery: location,
        serviceQuery: service,
        searchableText: text
      }) + getRecencyBoost(item.created_at),
      reasons
    })
  }

  for (const item of merchItems) {
    const text = item.content
    const reasons = buildRecommendationReasons({
      topic: "merch",
      intent,
      topicPreferences,
      availableForHireOnly,
      locationQuery: location,
      serviceQuery: service,
      searchableText: text
    })
    feed.push({
      id: `merch-${item.id}`,
      topic: "merch",
      kind: "merch",
      title: "Merch drop alert",
      description: text,
      meta: `From feed • ${item.created_at}`,
      score: scoreItem({
        topic: "merch",
        topicAffinity,
        intent,
        topicPreferences,
        availableForHireOnly,
        locationQuery: location,
        serviceQuery: service,
        searchableText: text
      }) + getRecencyBoost(item.created_at),
      reasons
    })
  }

  for (const item of events) {
    const searchableText = [item.title, item.venue_name, item.venue_city, item.venue_state].filter(Boolean).join(" ")
    const reasons = buildRecommendationReasons({
      topic: "events",
      intent,
      topicPreferences,
      availableForHireOnly,
      locationQuery: location,
      serviceQuery: service,
      searchableText
    })
    feed.push({
      id: `event-${item.id}`,
      topic: "events",
      kind: "events",
      title: item.title,
      description: item.venue_name || "Venue TBD",
      meta: formatEventMeta(item),
      score: scoreItem({
        topic: "events",
        topicAffinity,
        intent,
        topicPreferences,
        availableForHireOnly,
        locationQuery: location,
        serviceQuery: service,
        searchableText
      }) + getRecencyBoost(item.event_date),
      reasons
    })
  }

  for (const item of jobs) {
    const locationLabel = [item.city, item.state].filter(Boolean).join(", ")
    const searchableText = [item.title, locationLabel, item.payment_type || ""].join(" ")
    const reasons = buildRecommendationReasons({
      topic: "jobs",
      intent,
      topicPreferences,
      availableForHireOnly,
      locationQuery: location,
      serviceQuery: service,
      searchableText
    })
    feed.push({
      id: `job-${item.id}`,
      topic: "jobs",
      kind: "jobs",
      title: item.title,
      description: locationLabel || "Remote / location TBA",
      meta: item.payment_amount ? `${item.payment_type || "Pay"} ${item.payment_amount}` : item.payment_type || "Compensation listed in details",
      score: scoreItem({
        topic: "jobs",
        topicAffinity,
        intent,
        topicPreferences,
        availableForHireOnly,
        locationQuery: location,
        serviceQuery: service,
        searchableText
      }),
      reasons
    })
  }

  for (const item of updates) {
    const searchableText = [item.title, item.summary, item.sourceName].join(" ")
    const reasons = buildRecommendationReasons({
      topic: "updates",
      intent,
      topicPreferences,
      availableForHireOnly,
      locationQuery: location,
      serviceQuery: service,
      searchableText
    })
    feed.push({
      id: `update-${item.id}`,
      topic: "updates",
      kind: "updates",
      title: item.title,
      description: item.summary,
      meta: `${item.sourceName} • ${item.publishedAt}`,
      score: scoreItem({
        topic: "updates",
        topicAffinity,
        intent,
        topicPreferences,
        availableForHireOnly,
        locationQuery: location,
        serviceQuery: service,
        searchableText
      }) + getRecencyBoost(item.publishedAt),
      reasons
    })
  }

  for (const item of mergedPeople) {
    const searchableText = [item.display_name, item.username, item.account_type, item.creator_type, item.location].filter(Boolean).join(" ")
    const reasons = buildRecommendationReasons({
      topic: "people",
      intent,
      topicPreferences,
      availableForHireOnly,
      isHireReady: Boolean(item.available_for_hire),
      locationQuery: location,
      serviceQuery: service,
      searchableText
    })
    feed.push({
      id: `people-${item.id}`,
      topic: "people",
      kind: "people",
      title: item.display_name || `@${item.username}`,
      description: formatProfileLabel(item),
      meta: item.available_for_hire ? "Available for hire" : "Open profile",
      profileId: item.id,
      score: scoreItem({
        topic: "people",
        topicAffinity,
        intent,
        topicPreferences,
        availableForHireOnly,
        isHireReady: Boolean(item.available_for_hire),
        locationQuery: location,
        serviceQuery: service,
        searchableText
      }),
      reasons
    })
  }

  const rankedFeed = feed
    .filter((item) => topicPreferences[item.topic])
    .sort((left, right) => right.score - left.score)
    .slice(0, 40)

  return diversifyFeed(rankedFeed).slice(0, 28)
}

const disabledStyle = { opacity: 0.55 } as const
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
