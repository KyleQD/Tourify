import { useCallback, useEffect, useState } from "react"
import { Pressable, SafeAreaView, Text, View } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useAccountMode } from "@/hooks/use-account-mode"
import { useUnreadNotifications } from "@/hooks/use-unread-notifications"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { QuickPostComposer } from "@/components/dashboard/quick-post-composer"
import { FeaturedStoryCarousel } from "@/components/dashboard/featured-story-carousel"
import { WriteArticleCTA } from "@/components/dashboard/write-article-cta"
import { FeedPostList } from "@/components/dashboard/feed-post-list"
import { DiscoverPanel } from "@/components/dashboard/discover-panel"
import { YourStuffPanel } from "@/components/dashboard/your-stuff-panel"

type SubTab = "feed" | "discover" | "your-stuff"

const SUBTAB_STORAGE_KEY = "tourify.feed-subtab"

const subTabs: Array<{ value: SubTab; label: string }> = [
  { value: "feed", label: "Feed" },
  { value: "discover", label: "Discover" },
  { value: "your-stuff", label: "Your Stuff" },
]

export default function FeedScreen() {
  const { isVenueMode } = useAccountMode()
  const { unreadCount } = useUnreadNotifications("feed-subtab")
  const [subTab, setSubTab] = useState<SubTab>("feed")
  const [refreshSignal, setRefreshSignal] = useState(0)

  useEffect(() => {
    AsyncStorage.getItem(SUBTAB_STORAGE_KEY).then((stored) => {
      if (stored === "feed" || stored === "discover" || stored === "your-stuff") setSubTab(stored)
    })
  }, [])

  const handleSelectTab = useCallback((value: SubTab) => {
    setSubTab(value)
    void AsyncStorage.setItem(SUBTAB_STORAGE_KEY, value)
  }, [])

  const handlePosted = useCallback(() => {
    setRefreshSignal((prev) => prev + 1)
    setSubTab("feed")
  }, [])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#020617" }}>
      <DashboardHeader />
      <QuickPostComposer onPosted={handlePosted} />

      <View
        style={{
          flexDirection: "row",
          marginHorizontal: 16,
          marginBottom: 8,
          backgroundColor: "#0f172a",
          borderRadius: 999,
          padding: 4,
        }}
      >
        {subTabs.map((tab) => {
          const isActive = subTab === tab.value
          const showBadge = tab.value === "your-stuff" && unreadCount > 0
          return (
            <Pressable
              key={tab.value}
              onPress={() => handleSelectTab(tab.value)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: isActive ? "#7c3aed" : "transparent",
              }}
            >
              <Text style={{ color: isActive ? "#fff" : "#94a3b8", fontWeight: "600", fontSize: 13 }}>
                {tab.label}
              </Text>
              {showBadge ? (
                <View
                  style={{
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    paddingHorizontal: 5,
                    backgroundColor: "#f43f5e",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </View>

      <View style={{ flex: 1 }}>
        {subTab === "feed" ? (
          <FeedPostList
            type="following"
            refreshSignal={refreshSignal}
            emptyLabel="Follow creators to fill your feed, or explore Discover."
            ListHeaderComponent={
              <View>
                {!isVenueMode ? <FeaturedStoryCarousel /> : null}
                <WriteArticleCTA />
              </View>
            }
          />
        ) : null}
        {subTab === "discover" ? <DiscoverPanel /> : null}
        {subTab === "your-stuff" ? <YourStuffPanel refreshSignal={refreshSignal} /> : null}
      </View>
    </SafeAreaView>
  )
}
