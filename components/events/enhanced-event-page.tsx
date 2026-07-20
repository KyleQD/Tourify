"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { EventAttendanceTab } from "@/components/events/public/event-attendance-tab"
import { EventDetailsTab } from "@/components/events/public/event-details-tab"
import { EventHero } from "@/components/events/public/event-hero"
import { EventMediaTab } from "@/components/events/public/event-media-tab"
import { EventOverviewTab } from "@/components/events/public/event-overview-tab"
import { EventPostsTab } from "@/components/events/public/event-posts-tab"
import { EventTabsBar } from "@/components/events/public/event-tabs-bar"
import { EventSkinProvider, useEventSkin } from "@/components/events/public/event-skin-context"
import type { EventData, EventPost } from "@/components/events/public/types"
import { paShell } from "@/components/public-artist/public-artist-ui"
import { useAuth } from "@/contexts/auth-context"
import { useEventAttendance } from "@/hooks/use-event-attendance"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import {
  getVisibleEventPageTabs,
  normalizeEventPageLayout,
} from "@/lib/events/event-page-layout"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const EventShareMenu = dynamic(
  () =>
    import("@/components/events/event-share-menu").then((mod) => ({
      default: mod.EventShareMenu,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/60" />
      </div>
    ),
  }
)

interface EnhancedEventPageProps {
  eventId: string
  event?: EventData
  onEventUpdated?: (event: EventData) => void
}

interface ProfileSnippet {
  id: string
  username: string
  full_name: string
  avatar_url?: string
  is_verified: boolean
}

async function fetchProfilesByIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  const map = new Map<string, ProfileSnippet>()
  if (uniqueIds.length === 0) return map

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_verified")
    .in("id", uniqueIds)

  if (error) {
    console.error("Error fetching profiles for event posts:", error)
    return map
  }

  for (const profile of data || []) map.set(profile.id, profile as ProfileSnippet)
  return map
}

function fallbackProfileFromAuthUser(authUser: {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}): ProfileSnippet {
  const meta = authUser.user_metadata || {}
  return {
    id: authUser.id,
    username: (typeof meta.username === "string" && meta.username) || authUser.email?.split("@")[0] || "user",
    full_name: (typeof meta.full_name === "string" && meta.full_name) || "User",
    avatar_url: typeof meta.avatar_url === "string" ? meta.avatar_url : undefined,
    is_verified: false,
  }
}

export function EnhancedEventPage({ eventId, event: initialEvent }: EnhancedEventPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [event, setEvent] = useState<EventData | null>(initialEvent || null)
  const [posts, setPosts] = useState<EventPost[]>([])
  const [isLoading, setIsLoading] = useState(!initialEvent)
  const [activeTab, setActiveTab] = useState("overview")
  const [newPostContent, setNewPostContent] = useState("")
  const [newPostType, setNewPostType] = useState<"text" | "image" | "video">("text")
  const [newPostVisibility, setNewPostVisibility] = useState<"public" | "attendees">("public")
  const [canPost, setCanPost] = useState(false)
  const [isEventCreator, setIsEventCreator] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [isPostingUpdate, setIsPostingUpdate] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [newMediaUrls, setNewMediaUrls] = useState<string[]>([])

  const { attendance, isUpdatingAttendance, loadAttendanceData, updateAttendance } = useEventAttendance({
    eventId,
    userId: user?.id,
  })

  const loadEventPosts = useCallback(async () => {
    if (!eventId) return

    try {
      const { data: postsData, error } = await supabase
        .from("event_posts")
        .select("*")
        .eq("event_id", eventId)
        .eq("event_table", "events")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) throw error

      const profileMap = await fetchProfilesByIds((postsData || []).map((post) => post.user_id))
      const normalizedPosts: EventPost[] = (postsData || []).map((post) => ({
        id: post.id,
        content: post.content,
        type: post.type,
        media_urls: post.media_urls,
        is_announcement: post.is_announcement,
        is_pinned: post.is_pinned,
        visibility: post.visibility,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at,
        user: profileMap.get(post.user_id) || {
          id: post.user_id,
          username: "user",
          full_name: "User",
          is_verified: false,
        },
      }))

      setPosts(normalizedPosts)
    } catch (error) {
      console.error("Error loading posts:", error)
    }
  }, [eventId])

  const loadEventData = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()

      if (eventError) throw eventError
      setEvent({
        ...eventData,
        title: eventData.name,
        type: eventData.event_type,
        venue_address: eventData.address,
        venue_city: eventData.city,
        venue_state: eventData.state,
        venue_country: eventData.country,
        user_id: eventData.artist_id,
      })
      await loadAttendanceData()
      await loadEventPosts()
    } catch (error) {
      console.error("Error loading event data:", error)
      toast.error("Failed to load event data")
    } finally {
      setIsLoading(false)
    }
  }, [eventId, loadAttendanceData, loadEventPosts])

  useEffect(() => {
    if (eventId && !initialEvent) void loadEventData()
  }, [eventId, initialEvent, loadEventData])

  useEffect(() => {
    if (!eventId || !initialEvent) return
    void loadAttendanceData()
    void loadEventPosts()
  }, [eventId, initialEvent, loadAttendanceData, loadEventPosts, user?.id])

  useEffect(() => {
    if (event && user) {
      setIsEventCreator(event.user_id === user.id)
      setCanPost(event.user_id === user.id || attendance?.user_status === "attending")
    } else {
      setIsEventCreator(false)
      setCanPost(false)
    }
  }, [event, user, attendance])

  const pageLayout = useMemo(() => normalizeEventPageLayout(event?.pageLayout), [event?.pageLayout])
  const visibleTabs = useMemo(() => getVisibleEventPageTabs(pageLayout), [pageLayout])

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab === activeTab)) {
      setActiveTab(visibleTabs[0] || "overview")
    }
  }, [activeTab, visibleTabs])

  async function handleCreatePost() {
    if (!user || !eventId || !newPostContent.trim()) return

    try {
      setIsPostingUpdate(true)
      const { data: newPost, error } = await supabase
        .from("event_posts")
        .insert({
          event_id: eventId,
          event_table: "events",
          user_id: user.id,
          author_id: user.id,
          content: newPostContent,
          type: newPostType,
          media_urls: newMediaUrls.length > 0 ? newMediaUrls : null,
          visibility: newPostVisibility,
          is_announcement: isEventCreator,
          is_pinned: false,
          likes_count: 0,
          comments_count: 0,
        })
        .select("*")
        .single()

      if (error) throw error

      const profileMap = await fetchProfilesByIds([user.id])
      const author = profileMap.get(user.id) || fallbackProfileFromAuthUser(user)
      setPosts((prev) => [
        {
          id: newPost.id,
          content: newPost.content,
          type: newPost.type,
          media_urls: newPost.media_urls,
          is_announcement: newPost.is_announcement,
          is_pinned: newPost.is_pinned,
          visibility: newPost.visibility,
          likes_count: newPost.likes_count,
          comments_count: newPost.comments_count,
          created_at: newPost.created_at,
          user: author,
        },
        ...prev,
      ])
      setNewPostContent("")
      setNewMediaUrls([])
      toast.success("Post created successfully!")
    } catch (error) {
      console.error("Error creating post:", error)
      toast.error("Failed to create post")
    } finally {
      setIsPostingUpdate(false)
    }
  }

  async function handleMediaUpload(files: FileList) {
    if (!user) return

    try {
      setUploadingMedia(true)
      const uploadedUrls: string[] = []

      for (const file of Array.from(files)) {
        const fileExt = file.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `event-media/${fileName}`
        const { error: uploadError } = await supabase.storage.from("event-media").upload(filePath, file)
        if (uploadError) throw uploadError
        const {
          data: { publicUrl },
        } = supabase.storage.from("event-media").getPublicUrl(filePath)
        uploadedUrls.push(publicUrl)
      }

      setNewMediaUrls((prev) => [...prev, ...uploadedUrls])
      toast.success("Media uploaded successfully!")
    } catch (error) {
      console.error("Error uploading media:", error)
      toast.error("Failed to upload media")
    } finally {
      setUploadingMedia(false)
    }
  }

  async function handleShare(platform: "twitter" | "facebook" | "copy") {
    if (!event) return
    const url = `${window.location.origin}/events/${event.slug || event.id}`
    const text = `Check out ${event.title} on ${formatSafeDate(event.event_date)}!`

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        )
        break
      case "facebook":
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
        break
      case "copy":
        await navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard!")
        break
    }
    setShowShareMenu(false)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black">
        <div className="flex flex-col items-center gap-3 text-white/70">
          <Loader2 className="h-8 w-8 animate-spin text-purple-300" />
          <p className="text-sm">Loading event…</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-slate-950 to-black px-4">
        <div className="max-w-md rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-xl shadow-black/30 backdrop-blur-sm">
          <h2 className="mb-2 text-2xl font-bold text-white">Event Not Found</h2>
          <p className="mb-6 text-white/55">
            The event you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Button
            onClick={() => router.back()}
            className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <EventSkinProvider template={event.pageTemplate}>
      <EventPageShell
        event={event}
        pageLayout={pageLayout}
        visibleTabs={visibleTabs}
        attendance={attendance}
        user={user}
        isUpdatingAttendance={isUpdatingAttendance}
        updateAttendance={updateAttendance}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEventCreator={isEventCreator}
        posts={posts}
        canPost={canPost}
        newPostContent={newPostContent}
        newPostType={newPostType}
        newPostVisibility={newPostVisibility}
        newMediaUrls={newMediaUrls}
        isPostingUpdate={isPostingUpdate}
        uploadingMedia={uploadingMedia}
        setNewPostContent={setNewPostContent}
        setNewPostType={setNewPostType}
        setNewPostVisibility={setNewPostVisibility}
        setNewMediaUrls={setNewMediaUrls}
        handleMediaUpload={handleMediaUpload}
        handleCreatePost={handleCreatePost}
        showShareMenu={showShareMenu}
        setShowShareMenu={setShowShareMenu}
        handleShare={handleShare}
      />
    </EventSkinProvider>
  )
}

function EventPageShell({
  event,
  pageLayout,
  visibleTabs,
  attendance,
  user,
  isUpdatingAttendance,
  updateAttendance,
  activeTab,
  setActiveTab,
  isEventCreator,
  posts,
  canPost,
  newPostContent,
  newPostType,
  newPostVisibility,
  newMediaUrls,
  isPostingUpdate,
  uploadingMedia,
  setNewPostContent,
  setNewPostType,
  setNewPostVisibility,
  setNewMediaUrls,
  handleMediaUpload,
  handleCreatePost,
  showShareMenu,
  setShowShareMenu,
  handleShare,
}: {
  event: EventData
  pageLayout: ReturnType<typeof normalizeEventPageLayout>
  visibleTabs: ReturnType<typeof getVisibleEventPageTabs>
  attendance: ReturnType<typeof useEventAttendance>["attendance"]
  user: ReturnType<typeof useAuth>["user"]
  isUpdatingAttendance: boolean
  updateAttendance: ReturnType<typeof useEventAttendance>["updateAttendance"]
  activeTab: string
  setActiveTab: (value: string) => void
  isEventCreator: boolean
  posts: EventPost[]
  canPost: boolean
  newPostContent: string
  newPostType: "text" | "image" | "video"
  newPostVisibility: "public" | "attendees"
  newMediaUrls: string[]
  isPostingUpdate: boolean
  uploadingMedia: boolean
  setNewPostContent: (value: string) => void
  setNewPostType: (value: "text" | "image" | "video") => void
  setNewPostVisibility: (value: "public" | "attendees") => void
  setNewMediaUrls: Dispatch<SetStateAction<string[]>>
  handleMediaUpload: (files: FileList) => Promise<void>
  handleCreatePost: () => Promise<void>
  showShareMenu: boolean
  setShowShareMenu: (value: boolean) => void
  handleShare: (platform: "twitter" | "facebook" | "copy") => Promise<void>
}) {
  const { tokens } = useEventSkin()

  return (
    <div className={cn(tokens.page, "pb-16")}>
      {pageLayout.section_visibility.hero ? (
        <div className="pt-6">
          <EventHero
            event={event}
            attendance={attendance}
            isSignedIn={Boolean(user)}
            isUpdatingAttendance={isUpdatingAttendance}
            onAttendanceUpdate={updateAttendance}
            onShare={() => setShowShareMenu(true)}
          />
        </div>
      ) : null}

      <div className={cn(paShell, "py-8")}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <EventTabsBar tabs={visibleTabs} />

          {visibleTabs.includes("overview") ? (
          <TabsContent value="overview" className="space-y-6">
            <EventOverviewTab
              event={event}
              attendance={attendance}
              isSignedIn={Boolean(user)}
              isUpdatingAttendance={isUpdatingAttendance}
              isEventCreator={isEventCreator}
              onAttendanceUpdate={updateAttendance}
              onShare={() => setShowShareMenu(true)}
            />
          </TabsContent>
          ) : null}

          {visibleTabs.includes("posts") ? (
          <TabsContent value="posts" className="space-y-6">
            <EventPostsTab
              posts={posts}
              canPost={canPost}
              userAvatarUrl={
                typeof user?.user_metadata?.avatar_url === "string"
                  ? user.user_metadata.avatar_url
                  : undefined
              }
              userInitial={
                (typeof user?.user_metadata?.full_name === "string"
                  ? user.user_metadata.full_name.charAt(0)
                  : undefined) || user?.email?.charAt(0)
              }
              newPostContent={newPostContent}
              newPostType={newPostType}
              newPostVisibility={newPostVisibility}
              newMediaUrls={newMediaUrls}
              isPostingUpdate={isPostingUpdate}
              uploadingMedia={uploadingMedia}
              onContentChange={setNewPostContent}
              onTypeChange={setNewPostType}
              onVisibilityChange={setNewPostVisibility}
              onRemoveMedia={(index) => setNewMediaUrls((prev) => prev.filter((_, i) => i !== index))}
              onMediaUpload={handleMediaUpload}
              onCreatePost={() => void handleCreatePost()}
            />
          </TabsContent>
          ) : null}

          {visibleTabs.includes("attendance") ? (
          <TabsContent value="attendance" className="space-y-6">
            <EventAttendanceTab attendance={attendance} />
          </TabsContent>
          ) : null}

          {visibleTabs.includes("details") ? (
          <TabsContent value="details" className="space-y-6">
            <EventDetailsTab event={event} />
          </TabsContent>
          ) : null}

          {visibleTabs.includes("media") ? (
          <TabsContent value="media" className="space-y-6">
            <EventMediaTab event={event} />
          </TabsContent>
          ) : null}
        </Tabs>
      </div>

      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md"
            onClick={() => setShowShareMenu(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className={cn(tokens.card, "max-h-[85vh] w-full max-w-md overflow-hidden shadow-2xl")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />
              <div className="max-h-[calc(85vh-4px)] overflow-y-auto p-6">
                <EventShareMenu
                  eventId={event.id}
                  eventTitle={event.title}
                  eventSlug={event.slug}
                  isSignedIn={Boolean(user)}
                  onClose={() => setShowShareMenu(false)}
                  onExternalShare={(platform) => void handleShare(platform)}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
