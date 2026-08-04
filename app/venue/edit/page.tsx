"use client"
/**
 * /venue/edit — Expanded venue profile editor
 *
 * This page EXTENDS the existing edit experience by adding:
 *  - VkCommandHeader (save/publish/copy link status bar)
 *  - "Venue Kit" tab panel with VkEditorTabs (all content sections)
 *  - "Appearance" tab panel with VkAppearancePanel (template + styling)
 *
 * The existing ProfileProvider + EditProfileContent are preserved
 * and rendered alongside the new VK tabs.
 */
import { Suspense, useState, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useVKSync } from "@/hooks/use-vk-sync"
import VkCommandHeader from "@/components/venue-kit/vk-command-header"
import VkEditorTabs from "@/components/venue-kit/vk-editor-tabs"
import VkAppearancePanel from "@/components/venue-kit/vk-appearance-panel"
import { ProfileProvider } from "@/context/venue/profile-context"
import EditProfileContent from "@/components/venue/edit-profile-content"
import dynamic from "next/dynamic"

// Lazy-load PDF so it doesn't block initial render
const VkPdfExport = dynamic(() => import("@/components/venue-kit/vk-pdf-export"), { ssr: false })

function VenueEditInner() {
  const { toast } = useToast()
  const [activeVkTab, setActiveVkTab] = useState("overview")
  const [activeRootTab, setActiveRootTab] = useState("profile")

  const {
    vkData,
    savedVkData,
    publicUrl,
    lastSavedAt,
    hasSavedVk,
    isSaving,
    isDirty,
    isPublished,
    saveError,
    updateVKData,
    saveVK,
    publishVK,
    unpublishVK,
  } = useVKSync()

  const handleSaveDraft = useCallback(async () => {
    await saveVK()
  }, [saveVK])

  const handlePublish = useCallback(async () => {
    await publishVK()
  }, [publishVK])

  const handleUnpublish = useCallback(async () => {
    await unpublishVK()
  }, [unpublishVK])

  const handleCopyUrl = useCallback(() => {
    if (!publicUrl) return
    const full = `${window.location.origin}${publicUrl}`
    void navigator.clipboard.writeText(full)
    toast({ title: "Link copied", description: full })
  }, [publicUrl, toast])

  const handleViewLive = useCallback(() => {
    if (!publicUrl) return
    window.open(publicUrl, "_blank", "noopener")
  }, [publicUrl])

  return (
    <div className="min-h-screen bg-[#060711]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-5">
        {/* VK Command Header — always visible */}
        {vkData && (
          <VkCommandHeader
            venueName={vkData.venueName}
            publicUrl={publicUrl}
            lastSavedAt={lastSavedAt}
            isDirty={isDirty}
            isPublished={isPublished}
            isSaving={isSaving}
            hasSavedVk={hasSavedVk}
            saveError={saveError}
            onSaveDraft={handleSaveDraft}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onViewLive={handleViewLive}
            onCopyUrl={handleCopyUrl}
            secondaryLinkHref="/venue/kit"
            secondaryLinkLabel="Preview & Publish Kit"
          />
        )}

        {/* Root tabs: Profile (existing) | Venue Kit | Appearance */}
        <Tabs value={activeRootTab} onValueChange={setActiveRootTab}>
          <TabsList className="flex h-auto flex-wrap gap-1 rounded-xl bg-white/5 p-1">
            <TabsTrigger
              value="profile"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="kit"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Venue Kit Content
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="rounded-lg px-4 py-2 text-sm data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              Appearance
            </TabsTrigger>
          </TabsList>

          {/* Existing profile editor */}
          <TabsContent value="profile" className="mt-6">
            <ProfileProvider>
              <EditProfileContent />
            </ProfileProvider>
          </TabsContent>

          {/* New VK content tabs */}
          <TabsContent value="kit" className="mt-6">
            {vkData ? (
              <VkEditorTabs
                vkData={vkData}
                updateVKData={updateVKData}
                activeTab={activeVkTab}
                onTabChange={setActiveVkTab}
              />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
            )}
          </TabsContent>

          {/* Appearance customization */}
          <TabsContent value="appearance" className="mt-6">
            {vkData ? (
              <VkAppearancePanel vkData={vkData} updateVKData={updateVKData} />
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default function VenueEditPage() {
  return <VenueEditInner />
}
