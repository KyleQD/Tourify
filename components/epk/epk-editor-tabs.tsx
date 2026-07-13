"use client"

import React, { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Upload,
  FileText,
  TrendingUp,
  Star,
  Camera,
  Layout,
} from "lucide-react"
import type { EPKData } from "@/lib/services/epk.service"
import MusicSection from "@/components/epk/music-section"
import SocialSection from "@/components/epk/social-section"
import ShowsSection from "@/components/epk/shows-section"
import ContactSection from "@/components/epk/contact-section"
import { EpkTemplateSelector } from "@/components/epk/epk-template-selector"
import { epkSurface, epkInput } from "@/components/epk/epk-ui-styles"
import { supabase } from "@/lib/supabase"

interface EpkEditorTabsProps {
  epkData: EPKData
  updateEPKData: (updates: Partial<EPKData>) => void
  activeTab: string
  onTabChange: (tab: string) => void
  syncWithProfile: () => void | Promise<void>
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "cover" | "photos") => void
  uploadingMedia: boolean
  fileInputRef: RefObject<HTMLInputElement>
  onOpenBuilder: () => void
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

export function EpkEditorTabs({
  epkData,
  updateEPKData,
  activeTab,
  onTabChange,
  syncWithProfile,
  onFileUpload,
  uploadingMedia,
  fileInputRef,
  onOpenBuilder,
}: EpkEditorTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
      <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-2xl border border-gray-800/80 bg-[#13151c] p-1">
        <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Overview
        </TabsTrigger>
        <TabsTrigger value="music" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Music
        </TabsTrigger>
        <TabsTrigger value="shows" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Shows
        </TabsTrigger>
        <TabsTrigger value="social" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Social
        </TabsTrigger>
        <TabsTrigger value="contact" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Contact
        </TabsTrigger>
        <TabsTrigger value="media" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Media
        </TabsTrigger>
        <TabsTrigger value="press" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Press
        </TabsTrigger>
        <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">
          Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
          <div className="space-y-4">
            <Card className={`${epkSurface} border-white/10`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                  <Star className="h-4 w-4 shrink-0 text-purple-400" />
                  Hero Section
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <div className="relative">
                  <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 to-blue-900 sm:h-40">
                    {epkData.coverUrl ? (
                      <img src={epkData.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                    ) : (
                      <div className="text-center text-white">
                        <Camera className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm opacity-75">Add cover image</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                    >
                      <Upload className="h-6 w-6 text-white" />
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFileUpload(e, "cover")}
                  />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative shrink-0">
                    <Avatar className="h-20 w-20 rounded-2xl border-2 border-purple-500/80 sm:h-[72px] sm:w-[72px]">
                      <AvatarImage src={epkData.avatarUrl} className="rounded-2xl object-cover" />
                      <AvatarFallback className="rounded-2xl">
                        {epkData.artistName[0] || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.createElement("input")
                        input.type = "file"
                        input.accept = "image/*"
                        input.onchange = (event) =>
                          onFileUpload(event as unknown as React.ChangeEvent<HTMLInputElement>, "avatar")
                        input.click()
                      }}
                      className="absolute -bottom-1 -right-1 rounded-full bg-purple-600 p-1.5 shadow-lg transition hover:bg-purple-700"
                    >
                      <Camera className="h-3 w-3 text-white" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      placeholder="Artist Name"
                      value={epkData.artistName}
                      onChange={(e) => updateEPKData({ artistName: e.target.value })}
                      className={`${epkInput} text-lg font-semibold`}
                    />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Genre"
                        value={epkData.genre}
                        onChange={(e) => updateEPKData({ genre: e.target.value })}
                        className={epkInput}
                      />
                      <Input
                        placeholder="Location"
                        value={epkData.location}
                        onChange={(e) => updateEPKData({ location: e.target.value })}
                        className={epkInput}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`${epkSurface} border-white/10`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
                  <FileText className="h-4 w-4 shrink-0 text-purple-400" />
                  Artist Biography
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Tell your story in a compelling way that captures your artistic journey
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Textarea
                  placeholder="Write your artist biography here... Share your musical journey, influences, achievements, and what makes your sound unique."
                  value={epkData.bio}
                  onChange={(e) => updateEPKData({ bio: e.target.value })}
                  className={`min-h-[160px] resize-none text-sm sm:min-h-[180px] ${epkInput}`}
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
                  <span>{epkData.bio.length} characters</span>
                  <span>Tip: Aim for 150-300 words</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <StatsOverview
              stats={epkData.stats}
              epkData={epkData}
              onImportFromProfile={syncWithProfile}
            />
            <EpkTemplateSelector
              selectedTemplate={epkData.template}
              onTemplateChange={(template) => updateEPKData({ template })}
              epkData={epkData}
            />
          </div>
        </div>
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

      <TabsContent value="social">
        <SocialSection
          socialLinks={epkData.social}
          onSocialLinksChange={(social) => updateEPKData({ social })}
        />
        <div className="mt-4 flex items-center gap-2">
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

      <TabsContent value="media">
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">Press Photos</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Upload high quality media for your one-page EPK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0">
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
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {epkData.photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-xl border border-gray-800/60 bg-[#23263a]"
                >
                  <img src={photo.url} alt="EPK photo" className="h-28 w-full object-cover" />
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

      <TabsContent value="press">
        <Card className={`${epkSurface} border-white/10`}>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold text-white">Press Highlights</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Feature quotes/articles that provide social proof.
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
                        pressItem.id === item.id
                          ? { ...pressItem, title: event.target.value }
                          : pressItem
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
                        pressItem.id === item.id
                          ? { ...pressItem, outlet: event.target.value }
                          : pressItem
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
                        pressItem.id === item.id
                          ? { ...pressItem, url: event.target.value }
                          : pressItem
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
                        pressItem.id === item.id
                          ? { ...pressItem, date: event.target.value }
                          : pressItem
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

      <TabsContent value="contact">
        <ContactSection
          contact={epkData.contact}
          onContactChange={(contact) => updateEPKData({ contact })}
        />
      </TabsContent>

      <TabsContent value="settings">
        <div className="space-y-6">
          <Card className={`${epkSurface} border-white/10`}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-white">EPK URL and SEO</CardTitle>
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

          <Card className={`${epkSurface} border-white/10`}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-white">Audience Presets</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
              {(["booker", "festival", "press"] as const).map((preset) => (
                <Button
                  key={preset}
                  variant={epkData.layout.preset === preset ? "default" : "outline"}
                  className={
                    epkData.layout.preset === preset
                      ? "rounded-xl bg-purple-600 text-white hover:bg-purple-700"
                      : "rounded-xl border-gray-700/80 text-white hover:bg-white/5"
                  }
                  onClick={() => {
                    const orderByPreset: Record<string, string[]> = {
                      booker: [
                        "hero",
                        "one-liner",
                        "music",
                        "shows",
                        "stats",
                        "press",
                        "contact",
                        "booking",
                        "social",
                        "media",
                      ],
                      festival: [
                        "hero",
                        "one-liner",
                        "shows",
                        "music",
                        "stats",
                        "media",
                        "press",
                        "contact",
                        "booking",
                        "social",
                      ],
                      press: [
                        "hero",
                        "one-liner",
                        "press",
                        "bio",
                        "music",
                        "stats",
                        "media",
                        "shows",
                        "contact",
                        "social",
                      ],
                    }
                    updateEPKData({
                      layout: {
                        ...epkData.layout,
                        preset,
                        sectionOrder: orderByPreset[preset],
                      },
                    })
                  }}
                >
                  {preset}
                </Button>
              ))}
            </CardContent>
          </Card>

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

          <Card className={`${epkSurface} border-white/10`}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-white">Typography</CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Font applied to your live EPK and preview
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Label className="text-xs text-gray-300">Font family</Label>
              <Select
                value={epkData.epkFont}
                onValueChange={(value) =>
                  updateEPKData({ epkFont: value as EPKData["epkFont"] })
                }
              >
                <SelectTrigger className={`${epkInput} mt-1`}>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sans">Sans — clean UI (Inter)</SelectItem>
                  <SelectItem value="serif">Serif — editorial (Playfair)</SelectItem>
                  <SelectItem value="display">Display — poster (Bebas)</SelectItem>
                  <SelectItem value="geometric">Geometric — modern (Space Grotesk)</SelectItem>
                  <SelectItem value="mono">Mono — technical (JetBrains)</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className={`${epkSurface} border-white/10`}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-white">One-Page Section Layout</CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Drag sections in the Builder to reorder. Toggle visibility below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {epkData.layout.sectionOrder.map((section) => (
                <div
                  key={section}
                  className="flex items-center gap-2 rounded-xl border border-gray-800/50 bg-[#1a1d28]/80 p-2.5"
                >
                  <div className="min-w-28 text-sm capitalize text-white">{section}</div>
                  <Switch
                    checked={Boolean(epkData.layout.sectionVisibility[section])}
                    onCheckedChange={(checked) =>
                      updateEPKData({
                        layout: {
                          ...epkData.layout,
                          sectionVisibility: {
                            ...epkData.layout.sectionVisibility,
                            [section]: checked,
                          },
                        },
                      })
                    }
                  />
                </div>
              ))}
              <Button
                onClick={onOpenBuilder}
                variant="outline"
                className="mt-2 w-full rounded-xl border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                <Layout className="mr-2 h-4 w-4" />
                Open Builder to reorder
              </Button>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  )
}
