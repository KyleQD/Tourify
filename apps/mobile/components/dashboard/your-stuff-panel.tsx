import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
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
import { useSession } from "@/hooks/use-session"
import { useMultiAccount } from "@/providers/multi-account-provider"
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications"
import {
  getNotifications,
  isNotificationUnread,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/api/notifications"
import { getFeedPosts, type FeedPost } from "@/lib/api/feed"
import { getAggregatedNeeds, type AggregatedNeeds } from "@/lib/your-stuff/aggregate-needs"

function SectionHeader({
  title,
  icon,
  action,
}: {
  title: string
  icon: keyof typeof Ionicons.glyphMap
  action?: React.ReactNode
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
      {action}
    </View>
  )
}

function Card({ children, onPress, urgent }: { children: React.ReactNode; onPress?: () => void; urgent?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        borderWidth: 1,
        borderColor: urgent ? "#f59e0b" : "#1e293b",
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        gap: 4,
        backgroundColor: urgent ? "rgba(245,158,11,0.08)" : "transparent",
      }}
    >
      {children}
    </Pressable>
  )
}

function EmptyRow({ label }: { label: string }) {
  return <Text style={{ color: "#64748b", fontSize: 13, paddingVertical: 6 }}>{label}</Text>
}

function formatDateTime(value: string | null): string {
  if (!value) return "Date TBA"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date TBA"
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export function YourStuffPanel({ refreshSignal }: { refreshSignal?: number }) {
  const router = useRouter()
  const { user } = useSession()
  const { userAccounts, actingHeaders } = useMultiAccount()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [needs, setNeeds] = useState<AggregatedNeeds>({ shifts: [], venueBookings: [], jobApplications: [] })
  const [personalPosts, setPersonalPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const venueProfileIds = useMemo(
    () => userAccounts.filter((a) => a.account_type === "venue").map((a) => a.profile_id),
    [userAccounts]
  )

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }
      if (isRefresh) setIsRefreshing(true)
      else setIsLoading(true)

      try {
        const [notificationsResult, needsResult, postsResult] = await Promise.all([
          getNotifications().catch(() => []),
          getAggregatedNeeds({ userId: user.id, venueProfileIds }).catch(() => ({
            shifts: [],
            venueBookings: [],
            jobApplications: [],
          })),
          getFeedPosts({ type: "personal", headers: actingHeaders }).catch(() => []),
        ])
        setNotifications(notificationsResult)
        setNeeds(needsResult)
        setPersonalPosts(postsResult)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [user?.id, venueProfileIds, actingHeaders]
  )

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, venueProfileIds.join(","), refreshSignal])

  useRealtimeNotifications({ onChange: () => void load(true), channelKey: "your-stuff" })

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsAsRead()
      await load(true)
    } catch (error) {
      Alert.alert("Failed to update", error instanceof Error ? error.message : "Please try again")
    }
  }

  function openNotification(item: NotificationItem) {
    const actionUrl = item.action_url || (item.metadata?.onboarding_url as string | undefined)
    if (actionUrl) {
      const url = actionUrl.startsWith("http") ? actionUrl : `${env.apiBaseUrl}${actionUrl}`
      void WebBrowser.openBrowserAsync(url)
    }
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <ActivityIndicator size="large" color="#a855f7" />
      </View>
    )
  }

  const onboardingTasks = notifications.filter((n) => n.type === "hiring_onboarding_invite")
  const urgentNotifications = notifications.filter(
    (n) => isNotificationUnread(n) && ["hiring_application_approved", "hiring_onboarding_invite"].includes(n.type)
  )
  const invitedShifts = needs.shifts.filter((s) => s.isUrgent)
  const hasNeedsAttention =
    invitedShifts.length > 0 || urgentNotifications.length > 0 || needs.venueBookings.length > 0

  const unreadCount = notifications.filter(isNotificationUnread).length

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 48 }}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={() => load(true)} tintColor="#a855f7" />
      }
    >
      {hasNeedsAttention ? (
        <View>
          <SectionHeader title="Needs attention" icon="alert-circle-outline" />
          {invitedShifts.map((shift) => (
            <Card key={`shift-${shift.id}`} urgent>
              <Text style={{ color: "#fbbf24", fontSize: 12, fontWeight: "700" }}>SHIFT INVITE · Work</Text>
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>{shift.roleTitle}</Text>
              <Text style={{ color: "#94a3b8", fontSize: 12 }}>{formatDateTime(shift.startsAt)}</Text>
            </Card>
          ))}
          {needs.venueBookings.map((booking) => (
            <Card key={`booking-${booking.id}`} urgent>
              <Text style={{ color: "#fbbf24", fontSize: 12, fontWeight: "700" }}>BOOKING REQUEST · Venue</Text>
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>
                {booking.eventName || "New booking request"}
              </Text>
              <Text style={{ color: "#94a3b8", fontSize: 12 }}>{formatDateTime(booking.eventDate)}</Text>
            </Card>
          ))}
          {urgentNotifications.map((item) => (
            <Card key={`urgent-${item.id}`} urgent onPress={() => openNotification(item)}>
              <Text style={{ color: "#fbbf24", fontSize: 12, fontWeight: "700" }}>HIRING</Text>
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>{item.title}</Text>
              <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={2}>
                {item.content}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      <View>
        <SectionHeader
          title="Notifications"
          icon="notifications-outline"
          action={
            unreadCount > 0 ? (
              <Pressable onPress={handleMarkAllRead}>
                <Text style={{ color: "#a78bfa", fontSize: 13, fontWeight: "600" }}>Mark all read</Text>
              </Pressable>
            ) : null
          }
        />
        {notifications.length === 0 ? (
          <EmptyRow label="No notifications yet." />
        ) : (
          notifications.slice(0, 15).map((item) => (
            <Card key={item.id} onPress={() => openNotification(item)}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {isNotificationUnread(item) ? (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#7c3aed" }} />
                ) : null}
                <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600", flex: 1 }}>{item.title}</Text>
              </View>
              <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={2}>
                {item.content}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 11 }}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </Card>
          ))
        )}
      </View>

      <View>
        <SectionHeader title="Schedule" icon="calendar-outline" />
        {needs.shifts.length === 0 ? (
          <EmptyRow label="No upcoming shifts." />
        ) : (
          needs.shifts.map((shift) => (
            <Card key={`sched-${shift.id}`}>
              <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>{shift.roleTitle}</Text>
              {shift.department ? (
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>{shift.department}</Text>
              ) : null}
              <Text style={{ color: "#64748b", fontSize: 12 }}>
                {formatDateTime(shift.startsAt)} · {shift.status}
              </Text>
            </Card>
          ))
        )}
      </View>

      <View>
        <SectionHeader title="Tasks" icon="checkbox-outline" />
        {onboardingTasks.length === 0 && needs.jobApplications.length === 0 ? (
          <EmptyRow label="No pending tasks." />
        ) : (
          <>
            {onboardingTasks.map((task) => (
              <Card key={`task-${task.id}`} onPress={() => openNotification(task)}>
                <Text style={{ color: "#c084fc", fontSize: 12, fontWeight: "600" }}>ONBOARDING</Text>
                <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>{task.title}</Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }} numberOfLines={2}>
                  {task.content}
                </Text>
              </Card>
            ))}
            {needs.jobApplications.map((app) => (
              <Card
                key={`app-${app.id}`}
                onPress={() => WebBrowser.openBrowserAsync(`${env.apiBaseUrl}/jobs`)}
              >
                <Text style={{ color: "#c084fc", fontSize: 12, fontWeight: "600" }}>APPLICATION · {app.status}</Text>
                <Text style={{ color: "#f8fafc", fontSize: 14, fontWeight: "600" }}>
                  {app.job_posting?.title || "Job application"}
                </Text>
                {app.job_posting?.location ? (
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>{app.job_posting.location}</Text>
                ) : null}
              </Card>
            ))}
          </>
        )}
      </View>

      <View>
        <SectionHeader title="Your posts" icon="albums-outline" />
        {personalPosts.length === 0 ? (
          <EmptyRow label="You haven't posted yet." />
        ) : (
          personalPosts.slice(0, 10).map((post) => (
            <Card key={post.id}>
              <Text style={{ color: "#e2e8f0", fontSize: 14 }} numberOfLines={3}>
                {post.content || "Shared media"}
              </Text>
              <Text style={{ color: "#64748b", fontSize: 11 }}>
                {new Date(post.created_at).toLocaleDateString()} · {post.like_count} likes
              </Text>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  )
}
