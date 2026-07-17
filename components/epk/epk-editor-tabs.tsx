"use client"

import Image from "next/image"
import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  CheckCircle2,
  CircleAlert,
  Eye,
  FileText,
  Globe,
  Layout,
  Link as LinkIcon,
  LockKeyhole,
  Plus,
  Rocket,
  Save,
  Share2,
  Star,
  TrendingUp,
  Upload,
} from "lucide-react"
import type { EPKData } from "@/lib/services/epk.service"
import ContactSection from "@/components/epk/contact-section"
import MusicSection from "@/components/epk/music-section"
import ShowsSection from "@/components/epk/shows-section"
import SocialSection from "@/components/epk/social-section"
import { epkInput, epkSurface } from "@/components/epk/epk-ui-styles"
import { supabase } from "@/lib/supabase"

export interface EpkMediaUploadProgress {
  active: boolean
  completed: number
  total: number
  currentFile: string | null
  currentPercent: number
  errors: string[]
}

interface EpkEditorTabsProps {
  epkData: EPKData
  updateEPKData: (updates: Partial<EPKData>) => void
  activeTab: string
  onTabChange: (tab: string) => void
  syncWithProfile: () => void | Promise<void>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "photos") => void
  uploadingMedia: boolean
  mediaUploadProgress: EpkMediaUploadProgress
  onOpenBuilder: () => void
  publicUrl: string | null
  lastSavedAt: string | null
  isDirty: boolean
  isPublished: boolean
  isSaving: boolean
  saveError: string | null
  onSaveDraft: () => void
  onPublish: () => void
  onUnpublish: () => void
  onCopyUrl: () => void
  onViewLive: () => void
}

function formatSavedAt(value: string | null) {
  if (!value) return "Not saved yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Saved recently"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function contentChecks(epkData: EPKData, publicUrl: string | null) {
  return [
    {
      id: "hero",
      label: "Hero identity",
      tab: "overview",
      ready: Boolean(epkData.artistName && epkData.genre && epkData.location),
      detail: "Artist name, genre, and location",
    },
    {
      id: "pitch",
      label: "One-line pitch",
      tab: "overview",
      ready: Boolean(epkData.bookingAssets.oneLiner),
      detail: "Short booker-ready positioning",
    },
    {
      id: "bio",
      label: "Biography",
      tab: "bio",
      ready: epkData.bio.trim().length >= 120,
      detail: `${epkData.bio.trim().length} characters`,
    },
    {
      id: "music",
      label: "Music",
      tab: "music",
      ready: epkData.music.length >= 3,
      detail: `${epkData.music.length} track${epkData.music.length === 1 ? "" : "s"}`,
    },
    {
      id: "media",
      label: "Media",
      tab: "media",
      ready: epkData.photos.length >= 4,
      detail: `${epkData.photos.length} press photo${epkData.photos.length === 1 ? "" : "s"}`,
    },
    {
      id: "contact",
      label: "Booking contact",
      tab: "contact",
      ready: Boolean(epkData.contact.bookingEmail || epkData.contact.email),
      detail: epkData.contact.bookingEmail || epkData.contact.email || "Missing booking email",
    },
    {
      id: "press",
      label: "Press proof",
      tab: "press",
      ready: epkData.press.length > 0,
      detail: `${epkData.press.length} item${epkData.press.length === 1 ? "" : "s"}`,
    },
    {
      id: "url",
      label: "URL and SEO",
      tab: "publish",
      ready: Boolean(publicUrl && epkData.seoTitle),
      detail: publicUrl || "Save draft to create URL",
    },
  ]
}

function StatsOverview({
  stats,
  epkData,
  onImportFromProfile,
}: {
  stats: EPKData["stats"]
  epkData: EPKData
  onImportFromProfile: () => void | Promise<void>
}) {
  const totalSocialFollowers = epkData.social.reduce(
    (total, link) => total + (link.followers || 0),
    0
  )
  const totalShows = epkData.upcomingShows.length
  const totalStreams = epkData.music.reduce((total, track) => total + track.streams, 0)

  return (
    <Card className={`${epkSurface} border-white/10`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <TrendingUp className="h-4 w-4 shrink-0 text-purple-400" />
          Performance Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5 text-center">
            <div className="text-lg font-bold tabular-nums text-white">
              {stats.monthlyListeners > 0 ? `${stats.monthlyListeners.toLocaleString()}K` : "0"}
            </div>
            <div className="text-[11px] leading-tight text-gray-400">Monthly Listeners</div>
          </div>
          <div className="rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5 text-center">
            <div className="text-lg font-bold tabular-nums text-white">
              {totalSocialFollowers > 0 ? totalSocialFollowers.toLocaleString() : "0"}
            </div>
            <div className="text-[11px] leading-tight text-gray-400">Social Followers</div>
          </div>
          <div className="rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5 text-center">
            <div className="text-lg font-bold tabular-nums text-white">
              {totalStreams > 0 ? `${Math.round(totalStreams / 1000)}K` : "0"}
            </div>
            <div className="text-[11px] leading-tight text-gray-400">Total Streams</div>
          </div>
          <div className="rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5 text-center">
            <div className="text-lg font-bold tabular-nums text-white">{totalShows}</div>
            <div className="text-[11px] leading-tight text-gray-400">Total Shows</div>
          </div>
        </div>
        <Button
          size="sm"
          type="button"
          variant="outline"
          className="mt-3 w-full rounded-xl border-gray-700/80 bg-transparent text-xs text-white hover:bg-white/5"
          onClick={() => void onImportFromProfile()}
        >
          Import from Profile
        </Button>
      </CardContent>
    </Card>
  )
}

function ContentChecklist({
  epkData,
  publicUrl,
  onJumpToTab,
}: {
  epkData: EPKData
  publicUrl: string | null
  onJumpToTab: (tab: string) => void
}) {
  const checks = contentChecks(epkData, publicUrl)
  const completeCount = checks.filter((check) => check.ready).length

  return (
    <Card className={`${epkSurface} border-white/10`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-sm font-semibold tracking-tight text-white">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-400" />
            Content Checklist
          </span>
          <Badge className="rounded-full bg-purple-600 text-white">
            {completeCount}/{checks.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        {checks.map((check) => (
          <button
            key={check.id}
            type="button"
            onClick={() => onJumpToTab(check.tab)}
            className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition hover:border-purple-400/40 hover:bg-purple-500/10"
          >
            {check.ready ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">{check.label}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-400">{check.detail}</span>
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

function DesignHandledInBuilder({
  epkData,
  onOpenBuilder,
}: {
  epkData: EPKData
  onOpenBuilder: () => void
}) {
  return (
    <Card className={`${epkSurface} border-white/10`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <Layout className="h-4 w-4 shrink-0 text-purple-400" />
          Design Handled In Builder
        </CardTitle>
        <CardDescription className="text-xs text-gray-400">
          Templates, colors, typography, layout, effects, and section order are edited in Builder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Template</div>
            <div className="mt-1 text-sm font-semibold capitalize text-white">{epkData.template || "Modern"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Font</div>
            <div className="mt-1 text-sm font-semibold capitalize text-white">{epkData.epkFont || "sans"}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Sections</div>
            <div className="mt-1 text-sm font-semibold text-white">{epkData.layout.sectionOrder.length}</div>
          </div>
        </div>
        <Button
          type="button"
          onClick={onOpenBuilder}
          className="w-full rounded-xl bg-purple-600 text-white hover:bg-purple-700"
        >
          <Layout className="mr-2 h-4 w-4" />
          Open Builder
        </Button>
      </CardContent>
    </Card>
  )
}

function PublishPanel({
  epkData,
  updateEPKData,
  publicUrl,
  lastSavedAt,
  isDirty,
  isPublished,
  isSaving,
  saveError,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onCopyUrl,
  onViewLive,
  onJumpToTab,
}: {
  epkData: EPKData
  updateEPKData: (updates: Partial<EPKData>) => void
  publicUrl: string | null
  lastSavedAt: string | null
  isDirty: boolean
  isPublished: boolean
  isSaving: boolean
  saveError: string | null
  onSaveDraft: () => void
  onPublish: () => void
  onUnpublish: () => void
  onCopyUrl: () => void
  onViewLive: () => void
  onJumpToTab: (tab: string) => void
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
      <div className="space-y-4">
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <Globe className="h-4 w-4 shrink-0 text-purple-400" />
              Publish Status
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Draft saves update the private EPK. Publish makes the saved version public.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`rounded-full ${isPublished ? "bg-emerald-400 text-black" : "bg-purple-600 text-white"}`}>
                {isPublished ? "Live" : "Draft"}
              </Badge>
              {isDirty && (
                <Badge variant="outline" className="rounded-full border-amber-400/40 text-amber-200">
                  Editing unsaved changes
                </Badge>
              )}
              <span className="text-xs text-slate-400">Last saved: {formatSavedAt(lastSavedAt)}</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <Label className="text-xs uppercase tracking-[0.18em] text-slate-500">Canonical URL</Label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/35 px-3 py-2 font-mono text-sm text-purple-100">
                  <span className="block truncate">{publicUrl || "Save a draft to generate URL"}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCopyUrl}
                  disabled={!publicUrl}
                  className="rounded-xl border-gray-700/80 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                variant="outline"
                className="rounded-xl border-gray-700/80 text-white hover:bg-white/5 disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </Button>
              {isPublished ? (
                <Button
                  type="button"
                  onClick={onUnpublish}
                  disabled={isSaving}
                  variant="outline"
                  className="rounded-xl border-gray-700/80 text-white hover:bg-white/5 disabled:opacity-50"
                >
                  <LockKeyhole className="mr-2 h-4 w-4" />
                  Unpublish
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onPublish}
                  disabled={isSaving}
                  className="rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  <Rocket className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              )}
              <Button
                type="button"
                onClick={onViewLive}
                disabled={!publicUrl || !isPublished}
                variant="outline"
                className="rounded-xl border-gray-700/80 text-white hover:bg-white/5 disabled:opacity-50"
              >
                <Eye className="mr-2 h-4 w-4" />
                View Live
              </Button>
            </div>

            {saveError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {saveError}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">URL And SEO</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Public slug</Label>
              <Input
                value={epkData.epkSlug}
                onChange={(event) =>
                  updateEPKData({
                    epkSlug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, "")
                      .trim()
                      .replace(/\s+/g, "-"),
                    epkSlugUpdateMode: "manual",
                  })
                }
                className={epkInput}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Custom domain</Label>
              <Input
                value={epkData.customDomain}
                onChange={(event) => updateEPKData({ customDomain: event.target.value })}
                className={epkInput}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-300">SEO title</Label>
              <Input
                value={epkData.seoTitle}
                onChange={(event) => updateEPKData({ seoTitle: event.target.value })}
                className={epkInput}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-300">SEO description</Label>
              <Textarea
                value={epkData.seoDescription}
                onChange={(event) => updateEPKData({ seoDescription: event.target.value })}
                className={`min-h-[96px] resize-none ${epkInput}`}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">Booking Assets</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Links and summary used by bookers, venues, and festivals.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-gray-300">One-line pitch</Label>
              <Input
                value={epkData.bookingAssets.oneLiner}
                onChange={(event) =>
                  updateEPKData({
                    bookingAssets: { ...epkData.bookingAssets, oneLiner: event.target.value },
                  })
                }
                className={epkInput}
                placeholder="One sentence summary for bookers and press"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Tech rider URL</Label>
              <Input
                value={epkData.bookingAssets.techRiderUrl}
                onChange={(event) =>
                  updateEPKData({
                    bookingAssets: { ...epkData.bookingAssets, techRiderUrl: event.target.value },
                  })
                }
                className={epkInput}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Stage plot URL</Label>
              <Input
                value={epkData.bookingAssets.stagePlotUrl}
                onChange={(event) =>
                  updateEPKData({
                    bookingAssets: { ...epkData.bookingAssets, stagePlotUrl: event.target.value },
                  })
                }
                className={epkInput}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <ContentChecklist
          epkData={epkData}
          publicUrl={publicUrl}
          onJumpToTab={onJumpToTab}
        />
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">EPK Quality</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="mb-2 text-sm text-white">Score: {epkData.quality.score}%</div>
            <div className="space-y-1 text-sm text-gray-300">
              {epkData.quality.missing.length === 0 ? (
                <p>All core checklist items are complete.</p>
              ) : (
                epkData.quality.missing.map((item) => <p key={item}>Missing: {item}</p>)
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function EpkEditorTabs({
  epkData,
  updateEPKData,
  activeTab,
  onTabChange,
  syncWithProfile,
  onFileUpload,
  uploadingMedia,
  mediaUploadProgress,
  onOpenBuilder,
  publicUrl,
  lastSavedAt,
  isDirty,
  isPublished,
  isSaving,
  saveError,
  onSaveDraft,
  onPublish,
  onUnpublish,
  onCopyUrl,
  onViewLive,
}: EpkEditorTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
      <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-2xl border border-gray-800/80 bg-[#13151c] p-1">
        {[
          ["overview", "Overview"],
          ["bio", "Bio"],
          ["music", "Music"],
          ["shows", "Shows"],
          ["press", "Press"],
          ["media", "Media"],
          ["social", "Social"],
          ["contact", "Contact"],
          ["publish", "Publish"],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
          <div className="space-y-4">
            <Card className={`${epkSurface} border-white/10`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                  <Star className="h-4 w-4 shrink-0 text-purple-400" />
                  EPK Essentials
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Text and context used by the EPK. Profile photos and profile cover design are managed in Settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-gray-300">Artist / EPK display name</Label>
                  <Input
                    placeholder="Artist Name"
                    value={epkData.artistName}
                    onChange={(e) => updateEPKData({ artistName: e.target.value })}
                    className={`${epkInput} text-lg font-semibold`}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Primary genre</Label>
                  <Input
                    placeholder="Genre"
                    value={epkData.genre}
                    onChange={(e) => updateEPKData({ genre: e.target.value })}
                    className={epkInput}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-300">Market / location</Label>
                  <Input
                    placeholder="Location"
                    value={epkData.location}
                    onChange={(e) => updateEPKData({ location: e.target.value })}
                    className={epkInput}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={`${epkSurface} border-white/10`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                  <LinkIcon className="h-4 w-4 shrink-0 text-purple-400" />
                  One-Line Pitch
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  A short summary for bookers, festivals, press, and media contacts.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Input
                  value={epkData.bookingAssets.oneLiner}
                  onChange={(event) =>
                    updateEPKData({
                      bookingAssets: { ...epkData.bookingAssets, oneLiner: event.target.value },
                    })
                  }
                  className={epkInput}
                  placeholder="One sentence summary for bookers and press"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <ContentChecklist
              epkData={epkData}
              publicUrl={publicUrl}
              onJumpToTab={onTabChange}
            />
            <StatsOverview
              stats={epkData.stats}
              epkData={epkData}
              onImportFromProfile={syncWithProfile}
            />
            <DesignHandledInBuilder epkData={epkData} onOpenBuilder={onOpenBuilder} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="bio">
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
              <FileText className="h-4 w-4 shrink-0 text-purple-400" />
              Artist Biography
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Tell the story used by press, bookers, and public EPK readers.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Textarea
              placeholder="Write your artist biography here..."
              value={epkData.bio}
              onChange={(e) => updateEPKData({ bio: e.target.value })}
              className={`min-h-[320px] resize-none text-sm ${epkInput}`}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
              <span>{epkData.bio.length} characters</span>
              <span>Aim for 150-300 words</span>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="music">
        <MusicSection
          tracks={epkData.music}
          onTracksChange={(tracks) => updateEPKData({ music: tracks })}
        />
      </TabsContent>

      <TabsContent value="shows">
        <ShowsSection
          shows={epkData.upcomingShows}
          onShowsChange={(shows) => updateEPKData({ upcomingShows: shows })}
        />
      </TabsContent>

      <TabsContent value="press">
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">Press Highlights</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Feature quotes and articles that provide social proof.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() =>
                updateEPKData({
                  press: [
                    ...epkData.press,
                    { id: `${Date.now()}`, title: "", url: "", date: "", outlet: "", excerpt: "" },
                  ],
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Press Item
            </Button>
            {epkData.press.map((item) => (
              <div
                key={item.id}
                className="grid gap-2 rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 p-3 md:grid-cols-2"
              >
                <Input
                  value={item.title}
                  onChange={(event) =>
                    updateEPKData({
                      press: epkData.press.map((pressItem) =>
                        pressItem.id === item.id ? { ...pressItem, title: event.target.value } : pressItem
                      ),
                    })
                  }
                  placeholder="Headline"
                  className={epkInput}
                />
                <Input
                  value={item.outlet}
                  onChange={(event) =>
                    updateEPKData({
                      press: epkData.press.map((pressItem) =>
                        pressItem.id === item.id ? { ...pressItem, outlet: event.target.value } : pressItem
                      ),
                    })
                  }
                  placeholder="Outlet"
                  className={epkInput}
                />
                <Input
                  value={item.url}
                  onChange={(event) =>
                    updateEPKData({
                      press: epkData.press.map((pressItem) =>
                        pressItem.id === item.id ? { ...pressItem, url: event.target.value } : pressItem
                      ),
                    })
                  }
                  placeholder="Article URL"
                  className={epkInput}
                />
                <Input
                  type="date"
                  value={item.date}
                  onChange={(event) =>
                    updateEPKData({
                      press: epkData.press.map((pressItem) =>
                        pressItem.id === item.id ? { ...pressItem, date: event.target.value } : pressItem
                      ),
                    })
                  }
                  className={epkInput}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="media">
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">Press Photography</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Upload high-quality images for the Press Photography section of the EPK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/25 p-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {epkData.photos.length} press photo{epkData.photos.length === 1 ? "" : "s"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Uploaded images appear immediately in the EPK Press Photography section.
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
                onClick={() => {
                  const input = document.createElement("input")
                  input.type = "file"
                  input.accept = "image/*"
                  input.multiple = true
                  input.onchange = (event) =>
                    onFileUpload(event as unknown as React.ChangeEvent<HTMLInputElement>, "photos")
                  input.click()
                }}
                disabled={uploadingMedia}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingMedia ? "Uploading..." : "Upload Photos"}
              </Button>
            </div>

            {(mediaUploadProgress.active || mediaUploadProgress.errors.length > 0) && (
              <div className="rounded-2xl border border-purple-500/25 bg-purple-500/10 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-purple-100">
                    {mediaUploadProgress.active
                      ? mediaUploadProgress.currentFile
                        ? `Uploading ${mediaUploadProgress.currentFile}`
                        : "Preparing upload"
                      : "Upload complete"}
                  </span>
                  <span className="text-purple-200/80">
                    {mediaUploadProgress.completed}/{mediaUploadProgress.total} complete
                  </span>
                </div>
                <Progress
                  value={
                    mediaUploadProgress.total > 0
                      ? Math.min(
                          100,
                          Math.round(
                            ((mediaUploadProgress.completed +
                              mediaUploadProgress.currentPercent / 100) /
                              mediaUploadProgress.total) *
                              100,
                          ),
                        )
                      : 0
                  }
                  className="h-2 bg-black/40"
                />
                {mediaUploadProgress.errors.length > 0 && (
                  <div className="mt-3 space-y-1 text-xs text-red-200">
                    {mediaUploadProgress.errors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {epkData.photos.length === 0 && !uploadingMedia ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                <Upload className="mx-auto mb-3 h-8 w-8 text-slate-500" />
                <h3 className="text-sm font-semibold text-white">No press photography yet</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Upload photos here to populate the Press Photography section.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {epkData.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-xl border border-gray-800/60 bg-[#23263a]"
                >
                  <div className="relative h-28 w-full">
                    <Image
                      src={photo.url}
                      alt="EPK photo"
                      fill
                      unoptimized
                      sizes="(min-width: 768px) 25vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                  <Input
                    value={photo.caption}
                    placeholder="Caption"
                    className="rounded-xl rounded-t-none border-0 border-t border-gray-800/80 bg-[#13151c] text-xs text-white"
                    onChange={(event) =>
                      updateEPKData({
                        photos: epkData.photos.map((item) =>
                          item.id === photo.id ? { ...item, caption: event.target.value } : item
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="social">
        <SocialSection
          socialLinks={epkData.social}
          onSocialLinksChange={(social) => updateEPKData({ social })}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
            onClick={async () => {
              const session = await supabase.auth.getSession()
              await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-analytics`, {
                method: "POST",
                headers: { authorization: `Bearer ${session.data.session?.access_token}` },
              })
            }}
          >
            Refresh Analytics
          </Button>
          <p className="text-xs text-gray-500">
            Updates followers and reach from connected platforms
          </p>
        </div>
      </TabsContent>

      <TabsContent value="contact">
        <ContactSection
          contact={epkData.contact}
          onContactChange={(contact) => updateEPKData({ contact })}
        />
      </TabsContent>

      <TabsContent value="publish">
        <PublishPanel
          epkData={epkData}
          updateEPKData={updateEPKData}
          publicUrl={publicUrl}
          lastSavedAt={lastSavedAt}
          isDirty={isDirty}
          isPublished={isPublished}
          isSaving={isSaving}
          saveError={saveError}
          onSaveDraft={onSaveDraft}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          onCopyUrl={onCopyUrl}
          onViewLive={onViewLive}
          onJumpToTab={onTabChange}
        />
      </TabsContent>
    </Tabs>
  )
}
