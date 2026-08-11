"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Share2 } from "lucide-react"
import { toast } from "sonner"
import { AdminPageHeader } from "@/app/admin/dashboard/components/admin-page-header"
import { useActingContext } from "@/hooks/use-acting-context"
import { ContentOverviewPanel } from "./content-overview-panel"
import { PlatformConnectionsPanel } from "./platform-connections-panel"
import { OrgPostsPanel } from "./org-posts-panel"
import { ContentAnalyticsPanel } from "./content-analytics-panel"
import { ContentModerationPanel } from "./content-moderation-panel"
import type {
  ContentHubAnalytics,
  ContentHubOverview,
  ContentHubTab,
  IntegrationsResponse,
  OrgPostItem,
} from "./content-hub-types"

function buildInit(actingHeaders: Record<string, string>, input?: RequestInit): RequestInit {
  return {
    credentials: "include",
    cache: "no-store",
    ...input,
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...actingHeaders,
      ...(input?.headers || {}),
    },
  }
}

const VALID_TABS: ContentHubTab[] = ["overview", "platforms", "posts", "analytics", "moderation"]

export function ContentHubShell() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { actingHeaders, isActingReady, actingContextKey, actingAccount } = useActingContext()

  const tabParam = searchParams.get("tab") as ContentHubTab | null
  const activeTab: ContentHubTab =
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "overview"

  const [overview, setOverview] = useState<ContentHubOverview | null>(null)
  const [integrations, setIntegrations] = useState<IntegrationsResponse | null>(null)
  const [posts, setPosts] = useState<OrgPostItem[]>([])
  const [analytics, setAnalytics] = useState<ContentHubAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [loadedKey, setLoadedKey] = useState("")

  const setTab = useCallback(
    (tab: ContentHubTab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tab", tab)
      if (actingAccount?.profile_id && !params.get("account")) {
        params.set("account", actingAccount.profile_id)
      }
      router.replace(`/admin/dashboard/content?${params.toString()}`, { scroll: false })
    },
    [actingAccount?.profile_id, router, searchParams],
  )

  const loadAll = useCallback(async () => {
    if (!isActingReady) return
    setIsLoading(true)
    try {
      const init = buildInit(actingHeaders)
      const [overviewRes, integrationsRes, postsRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/content-hub/overview", init),
        fetch("/api/admin/content-hub/integrations", init),
        fetch("/api/admin/content-hub/posts", init),
        fetch("/api/admin/content-hub/analytics", init),
      ])

      if (overviewRes.ok) {
        const payload = await overviewRes.json()
        setOverview(payload.overview || null)
      } else {
        const payload = await overviewRes.json().catch(() => ({}))
        throw new Error(payload.error || "Failed to load overview")
      }

      if (integrationsRes.ok) {
        setIntegrations(await integrationsRes.json())
      }

      if (postsRes.ok) {
        const payload = await postsRes.json()
        setPosts(payload.items || [])
      }

      if (analyticsRes.ok) {
        setAnalytics(await analyticsRes.json())
      }

      setLoadedKey(actingContextKey)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load Content Hub")
    } finally {
      setIsLoading(false)
    }
  }, [actingContextKey, actingHeaders, isActingReady])

  useEffect(() => {
    if (!isActingReady) return
    if (loadedKey === actingContextKey && overview) return
    void loadAll()
  }, [actingContextKey, isActingReady, loadAll, loadedKey, overview])

  useEffect(() => {
    const connected = searchParams.get("connected")
    const oauthError = searchParams.get("oauth_error")
    if (connected === "1") {
      toast.success("Platform connected")
      const params = new URLSearchParams(searchParams.toString())
      params.delete("connected")
      router.replace(`/admin/dashboard/content?${params.toString()}`, { scroll: false })
      void loadAll()
    }
    if (oauthError) {
      toast.error(decodeURIComponent(oauthError))
      const params = new URLSearchParams(searchParams.toString())
      params.delete("oauth_error")
      router.replace(`/admin/dashboard/content?${params.toString()}`, { scroll: false })
    }
  }, [loadAll, router, searchParams])

  async function handleSync() {
    setIsSyncing(true)
    try {
      const res = await fetch(
        "/api/admin/content-hub/integrations/sync",
        buildInit(actingHeaders, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }),
      )
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Sync failed")
      toast.success("Analytics sync complete")
      await loadAll()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Hub"
        subtitle="Connect promotion platforms and track engagement for this organization"
        icon={Share2}
        actions={
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              <Link href="/admin/dashboard/feed">Open feed</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => void loadAll()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {!isActingReady ? (
        <div className="rounded-sm border border-slate-700/50 bg-slate-900/60 p-8 text-center text-sm text-slate-400">
          Select an organization account to open the Content Hub.
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setTab(value as ContentHubTab)}>
          <TabsList className="bg-slate-800/60 border border-slate-700/30 rounded-sm p-1 h-auto flex-wrap">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="platforms"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm"
            >
              Platforms
            </TabsTrigger>
            <TabsTrigger
              value="posts"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm"
            >
              Org Posts
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm"
            >
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="moderation"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white rounded-sm text-sm"
            >
              Moderation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <ContentOverviewPanel
              overview={overview}
              isLoading={isLoading}
              onGoPlatforms={() => setTab("platforms")}
              onSync={() => void handleSync()}
              isSyncing={isSyncing}
            />
          </TabsContent>

          <TabsContent value="platforms" className="mt-4">
            <PlatformConnectionsPanel
              data={integrations}
              isLoading={isLoading}
              actingHeaders={actingHeaders}
              onReload={loadAll}
            />
          </TabsContent>

          <TabsContent value="posts" className="mt-4">
            <OrgPostsPanel posts={posts} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <ContentAnalyticsPanel analytics={analytics} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="moderation" className="mt-4">
            <ContentModerationPanel
              posts={posts}
              isLoading={isLoading}
              actingHeaders={actingHeaders}
              onReload={loadAll}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
