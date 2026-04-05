"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Globe,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  DollarSign,
  Shield,
  Loader2,
  Save,
  X,
  User
} from "lucide-react"
import { useArtist } from "@/contexts/artist-context"
import { toast } from "sonner"
import { ProfileAchievementsSection } from "@/components/achievements/profile-achievements-section"
import { ArtistProfileIdentityCard } from "@/components/artist-profile/artist-profile-identity-card"
import { dashboardCreatePattern } from "@/components/dashboard/dashboard-create-pattern"
import { cn } from "@/lib/utils"
import { extractCreatorCapabilitiesV1, serializeCapabilityList } from "@/lib/creator/capability-system"

const musicGenres = [
  "Pop", "Rock", "Hip Hop", "Electronic", "Jazz", "Classical", "R&B", "Country",
  "Folk", "Blues", "Reggae", "Punk", "Metal", "Indie", "Alternative", "Funk",
  "Soul", "Gospel", "World", "Ambient", "House", "Techno", "Dubstep", "Other"
]

const creatorTypes = [
  "Musician",
  "Videographer",
  "Photographer",
  "Merch Creator",
  "Designer",
  "Producer",
  "Stylist / Wardrobe",
  "Visual Artist",
  "Creative Entrepreneur",
  "Other"
]

interface FormState {
  stage_name: string
  bio: string
  genres: string[]
  location: string
  website: string
  instagram: string
  twitter: string
  youtube: string
  spotify: string
  contact_email: string
  phone: string
  booking_rate: string
  availability: string
  creator_type: string
  service_offerings: string
  products_for_sale: string
  credentials: string
  work_highlights: string
  equipment: string
  music_style: string
  experience_years: string
  notable_performances: string
  record_label: string
  awards: string
  upcoming_releases: string
  collaboration_interest: boolean
  available_for_hire: boolean
  newsletter_signup: boolean
  privacy_settings: string
  preferred_contact: string
}

function buildFormFromProfile(
  profile: NonNullable<ReturnType<typeof useArtist>["profile"]>,
  publicProfile: ReturnType<typeof useArtist>["publicProfile"]
): FormState {
  const settings = profile.settings || {}
  const professional = settings.professional || {}
  const preferences = settings.preferences || {}
  const capabilities = extractCreatorCapabilitiesV1(settings)
  const genres = Array.isArray(profile.genres) ? profile.genres.filter(Boolean) : []

  return {
    stage_name: profile.artist_name || "",
    bio: profile.bio || "",
    genres: genres.length ? genres : [],
    location: publicProfile?.location ?? professional.location ?? "",
    website: profile.social_links?.website || publicProfile?.website || "",
    instagram: profile.social_links?.instagram || "",
    twitter: profile.social_links?.twitter || "",
    youtube: profile.social_links?.youtube || "",
    spotify: profile.social_links?.spotify || "",
    contact_email: professional.contact_email || "",
    phone: professional.phone || "",
    booking_rate: professional.booking_rate || "",
    availability: professional.availability || "",
    creator_type: capabilities.creatorType || professional.creator_type || professional.music_style || "",
    service_offerings: serializeCapabilityList(capabilities.serviceOfferings || professional.service_offerings || professional.equipment),
    products_for_sale: serializeCapabilityList(capabilities.productsForSale || professional.products_for_sale || professional.upcoming_releases),
    credentials: serializeCapabilityList(capabilities.credentials),
    work_highlights: serializeCapabilityList(capabilities.workHighlights || professional.notable_performances),
    equipment: professional.equipment || "",
    music_style: professional.music_style || "",
    experience_years: professional.experience_years || "",
    notable_performances: professional.notable_performances || "",
    record_label: professional.record_label || "",
    awards: professional.awards || "",
    upcoming_releases: professional.upcoming_releases || "",
    collaboration_interest: preferences.collaboration_interest || false,
    available_for_hire: preferences.available_for_hire || false,
    newsletter_signup: preferences.newsletter_signup || false,
    privacy_settings: preferences.privacy_settings || "public",
    preferred_contact: preferences.preferred_contact || "email"
  }
}

export default function ArtistProfilePage() {
  const {
    user,
    profile,
    publicProfile,
    displayName,
    avatarInitial,
    syncArtistName,
    updateDetailedProfile,
    refreshPublicProfile,
    isLoading
  } = useArtist()

  const [isSaving, setIsSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const emptyForm: FormState = {
    stage_name: "",
    bio: "",
    genres: [],
    location: "",
    website: "",
    instagram: "",
    twitter: "",
    youtube: "",
    spotify: "",
    contact_email: "",
    phone: "",
    booking_rate: "",
    availability: "",
    creator_type: "",
    service_offerings: "",
    products_for_sale: "",
    credentials: "",
    work_highlights: "",
    equipment: "",
    music_style: "",
    experience_years: "",
    notable_performances: "",
    record_label: "",
    awards: "",
    upcoming_releases: "",
    collaboration_interest: false,
    available_for_hire: false,
    newsletter_signup: false,
    privacy_settings: "public",
    preferred_contact: "email"
  }

  const [formData, setFormData] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (profile) {
      setFormData(buildFormFromProfile(profile, publicProfile))
    }
  }, [profile, publicProfile])

  const publicProfilePath = useMemo(() => {
    if (publicProfile?.username) return `/artist/${encodeURIComponent(publicProfile.username)}`
    if (profile?.artist_name) return `/artist/${encodeURIComponent(profile.artist_name)}`
    return "/artist"
  }, [publicProfile?.username, profile?.artist_name])

  const genreLine = useMemo(() => {
    if (formData.genres.length) return formData.genres.join(" • ")
    if (formData.creator_type) return formData.creator_type
    return "Add categories below"
  }, [formData.genres, formData.creator_type])

  const handleInputChange = (field: keyof FormState, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
    if (validationErrors.length > 0) setValidationErrors([])
  }

  const toggleGenre = (g: string) => {
    setFormData(prev => {
      const has = prev.genres.includes(g)
      const next = has
        ? prev.genres.filter(x => x !== g)
        : [...prev.genres, g].slice(0, 8)
      return { ...prev, genres: next }
    })
    setHasUnsavedChanges(true)
    if (validationErrors.length > 0) setValidationErrors([])
  }

  const handleSave = async () => {
    if (!user) {
      toast.error("Authentication required", { description: "Please log in to save your profile." })
      return
    }
    if (!profile) {
      toast.error("Profile not found", { description: "Your artist profile needs to be created first." })
      return
    }

    const clientErrors: string[] = []
    if (!formData.stage_name?.trim()) clientErrors.push("Artist name is required")
    if (clientErrors.length > 0) {
      setValidationErrors(clientErrors)
      toast.error("Please fix validation errors", { description: clientErrors[0] })
      return
    }

    setIsSaving(true)
    setValidationErrors([])
    setSaveProgress("Saving…")
    try {
      const result = await updateDetailedProfile({
        ...formData,
        genre: formData.genres[0] ?? "",
        genres: formData.genres
      })
      if (result.success) {
        setSaveProgress("Saved")
        toast.success("Profile updated", { description: "Your public profile and artist settings are in sync." })
        setHasUnsavedChanges(false)
        setTimeout(() => setSaveProgress(""), 2000)
      } else {
        setValidationErrors(result.errors || ["Unknown error"])
        toast.error("Could not save", { description: result.errors?.[0] })
        setSaveProgress("")
      }
    } catch {
      toast.error("Could not save profile")
      setSaveProgress("")
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (!hasUnsavedChanges) return
    const ok = window.confirm("Discard unsaved changes?")
    if (!ok) return
    if (profile) setFormData(buildFormFromProfile(profile, publicProfile))
    setHasUnsavedChanges(false)
    setValidationErrors([])
    setSaveProgress("")
  }

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd, credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Avatar upload failed")
        return
      }
      await refreshPublicProfile()
      toast.success("Profile photo updated")
    } catch {
      toast.error("Avatar upload failed")
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("type", "header")
      const res = await fetch("/api/upload-profile-image", { method: "POST", body: fd, credentials: "include" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        toast.error(data.error || "Banner upload failed")
        return
      }
      await refreshPublicProfile()
      toast.success("Banner updated")
    } catch {
      toast.error("Banner upload failed")
    } finally {
      setUploadingCover(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-purple-400" />
          <p className="text-lg">Loading your profile…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-28 text-white">
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h1 className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl">
              Artist profile
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Build your public creator brand, services, and monetization details.
            </p>
            {saveProgress ? (
              <p className="mt-2 text-sm text-emerald-400/90">{saveProgress}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!profile?.artist_name ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={dashboardCreatePattern.btnOutline}
                onClick={() => syncArtistName()}
              >
                <User className="mr-2 h-4 w-4" />
                Sync name
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasUnsavedChanges || isSaving}
              className={dashboardCreatePattern.btnOutline}
              onClick={handleCancel}
            >
              <X className="mr-2 h-4 w-4" />
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!hasUnsavedChanges || isSaving}
              className={dashboardCreatePattern.btnPrimary}
              onClick={handleSave}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>
      </header>

      {validationErrors.length > 0 ? (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {validationErrors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ArtistProfileIdentityCard
              avatarUrl={publicProfile?.avatar_url ?? null}
              coverImageUrl={publicProfile?.cover_image ?? null}
              displayName={displayName}
              avatarInitial={avatarInitial}
              genreLine={genreLine}
              username={publicProfile?.username ?? null}
              isVerified={profile?.verification_status === "verified"}
              hasUnsavedChanges={hasUnsavedChanges}
              uploadingAvatar={uploadingAvatar}
              uploadingCover={uploadingCover}
              onAvatarFile={handleAvatarUpload}
              onCoverFile={handleCoverUpload}
              publicProfilePath={publicProfilePath}
            />
          </div>

          <div className="lg:col-span-2">
            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList
                className={cn(
                  "flex h-auto w-full flex-nowrap justify-start gap-1 overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-900/50 p-1 md:grid md:grid-cols-5"
                )}
              >
                <TabsTrigger
                  value="basic"
                  className={cn(dashboardCreatePattern.stepPill, "shrink-0 rounded-xl data-[state=active]:border-purple-500/50 data-[state=active]:bg-purple-500/15")}
                >
                  Basic
                </TabsTrigger>
                <TabsTrigger
                  value="social"
                  className={cn(dashboardCreatePattern.stepPill, "shrink-0 rounded-xl data-[state=active]:border-purple-500/50 data-[state=active]:bg-purple-500/15")}
                >
                  Social
                </TabsTrigger>
                <TabsTrigger
                  value="professional"
                  className={cn(dashboardCreatePattern.stepPill, "shrink-0 rounded-xl data-[state=active]:border-purple-500/50 data-[state=active]:bg-purple-500/15")}
                >
                  Professional
                </TabsTrigger>
                <TabsTrigger
                  value="achievements"
                  className={cn(dashboardCreatePattern.stepPill, "shrink-0 rounded-xl data-[state=active]:border-purple-500/50 data-[state=active]:bg-purple-500/15")}
                >
                  Achievements
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className={cn(dashboardCreatePattern.stepPill, "shrink-0 rounded-xl data-[state=active]:border-purple-500/50 data-[state=active]:bg-purple-500/15")}
                >
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card className={dashboardCreatePattern.shell}>
                  <CardHeader>
                    <CardTitle className="text-white">Basic information</CardTitle>
                    <CardDescription className="text-slate-400">
                      Name, categories, bio, and location shown on your public creator page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label htmlFor="stage_name" className="text-slate-300">
                          Artist name
                        </Label>
                        <Input
                          id="stage_name"
                          value={formData.stage_name}
                          onChange={e => handleInputChange("stage_name", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                          placeholder="Stage name"
                        />
                      </div>
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label className="text-slate-300">Website</Label>
                        <Input
                          value={formData.website}
                          onChange={e => handleInputChange("website", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                          placeholder="https://…"
                        />
                      </div>
                    </div>

                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label className="text-slate-300">Categories & styles (up to 8)</Label>
                      <p className={dashboardCreatePattern.subtleText}>Pick genres, disciplines, or styles to help people discover your work.</p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {musicGenres.map(g => {
                          const active = formData.genres.includes(g)
                          return (
                            <button
                              key={g}
                              type="button"
                              disabled={isSaving}
                              onClick={() => toggleGenre(g)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                active
                                  ? "border-purple-400/50 bg-purple-500/20 text-white"
                                  : "border-slate-600/80 bg-slate-900/60 text-slate-400 hover:border-slate-500"
                              )}
                            >
                              {g}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={formData.bio}
                        onChange={e => handleInputChange("bio", e.target.value)}
                        disabled={isSaving}
                        rows={5}
                        className={cn(dashboardCreatePattern.input, "min-h-[120px] resize-y")}
                        placeholder="Tell your story…"
                      />
                    </div>

                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={e => handleInputChange("location", e.target.value)}
                        disabled={isSaving}
                        className={dashboardCreatePattern.input}
                        placeholder="City, Country"
                      />
                      <p className={dashboardCreatePattern.subtleText}>Synced to your public profile header.</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="social" className="space-y-6">
                <Card className={dashboardCreatePattern.shell}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Globe className="h-5 w-5 text-purple-400" />
                      Social links
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Use @handles or full URLs for Instagram and X.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    {(
                      [
                        ["instagram", "Instagram"] as const,
                        ["twitter", "X (Twitter)"] as const,
                        ["youtube", "YouTube"] as const,
                        ["spotify", "Spotify"] as const
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className={dashboardCreatePattern.fieldGroup}>
                        <Label className="text-slate-300">{label}</Label>
                        <Input
                          value={formData[key]}
                          onChange={e => handleInputChange(key, e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                          placeholder={key === "instagram" || key === "twitter" ? "@handle or URL" : "URL"}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="professional" className="space-y-6">
                <Card className={dashboardCreatePattern.shell}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Briefcase className="h-5 w-5 text-purple-400" />
                      Professional &amp; monetization
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Used for jobs, booking requests, sales, and industry outreach.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Primary creator type</Label>
                      <Select
                        value={formData.creator_type || "__none"}
                        onValueChange={v => handleInputChange("creator_type", v === "__none" ? "" : v)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                          <SelectValue placeholder="Select your primary creator type" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900 text-white">
                          <SelectItem value="__none">Not specified</SelectItem>
                          {creatorTypes.map(type => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label className="flex items-center gap-2 text-slate-300">
                          <Mail className="h-4 w-4" /> Contact email
                        </Label>
                        <Input
                          value={formData.contact_email}
                          onChange={e => handleInputChange("contact_email", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                        />
                      </div>
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label className="flex items-center gap-2 text-slate-300">
                          <Phone className="h-4 w-4" /> Phone
                        </Label>
                        <Input
                          value={formData.phone}
                          onChange={e => handleInputChange("phone", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label className="flex items-center gap-2 text-slate-300">
                          <DollarSign className="h-4 w-4" /> Booking rate
                        </Label>
                        <Input
                          value={formData.booking_rate}
                          onChange={e => handleInputChange("booking_rate", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                        />
                      </div>
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label className="flex items-center gap-2 text-slate-300">
                          <Calendar className="h-4 w-4" /> Years experience
                        </Label>
                        <Input
                          value={formData.experience_years}
                          onChange={e => handleInputChange("experience_years", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label>Availability</Label>
                        <Input
                          value={formData.availability}
                          onChange={e => handleInputChange("availability", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                          placeholder="e.g. Weekends, touring summers"
                        />
                      </div>
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label>Discipline focus (extra detail)</Label>
                        <Input
                          value={formData.music_style}
                          onChange={e => handleInputChange("music_style", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                          placeholder="Film, portraits, product design, custom merch, etc."
                        />
                      </div>
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Service offerings</Label>
                      <Textarea
                        value={formData.service_offerings}
                        onChange={e => handleInputChange("service_offerings", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                        placeholder="e.g. Music videos, event photography, cover art, wardrobe styling, logo design"
                      />
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Products for sale</Label>
                      <Textarea
                        value={formData.products_for_sale}
                        onChange={e => handleInputChange("products_for_sale", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                        placeholder="e.g. Prints, presets, packs, merch, templates, digital downloads"
                      />
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Credentials &amp; certifications</Label>
                      <Textarea
                        value={formData.credentials}
                        onChange={e => handleInputChange("credentials", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                        placeholder="e.g. OSHA 30, Pro Tools Certified, First Aid/CPR, AWS CCP"
                      />
                      <p className={dashboardCreatePattern.subtleText}>Use commas or new lines to add multiple credentials.</p>
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Past work highlights</Label>
                      <Textarea
                        value={formData.work_highlights}
                        onChange={e => handleInputChange("work_highlights", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                        placeholder="e.g. Tour visuals for X, Editorial shoot for Y, Opened for Z, Campaign for Brand A"
                      />
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Equipment &amp; production setup</Label>
                      <Textarea
                        value={formData.equipment}
                        onChange={e => handleInputChange("equipment", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                      />
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Notable projects &amp; clients</Label>
                      <Textarea
                        value={formData.notable_performances}
                        onChange={e => handleInputChange("notable_performances", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label>Studio / label / brand</Label>
                        <Input
                          value={formData.record_label}
                          onChange={e => handleInputChange("record_label", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                        />
                      </div>
                      <div className={dashboardCreatePattern.fieldGroup}>
                        <Label>Awards</Label>
                        <Input
                          value={formData.awards}
                          onChange={e => handleInputChange("awards", e.target.value)}
                          disabled={isSaving}
                          className={dashboardCreatePattern.input}
                        />
                      </div>
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Upcoming drops &amp; launches</Label>
                      <Textarea
                        value={formData.upcoming_releases}
                        onChange={e => handleInputChange("upcoming_releases", e.target.value)}
                        disabled={isSaving}
                        rows={3}
                        className={cn(dashboardCreatePattern.input, "resize-y")}
                      />
                    </div>
                    <div className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-200">Open to collaborations</p>
                          <p className={dashboardCreatePattern.subtleText}>Shown to other artists.</p>
                        </div>
                        <Switch
                          checked={formData.collaboration_interest}
                          onCheckedChange={v => handleInputChange("collaboration_interest", v)}
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-200">Available for hire</p>
                          <p className={dashboardCreatePattern.subtleText}>Signals you accept bookings.</p>
                        </div>
                        <Switch
                          checked={formData.available_for_hire}
                          onCheckedChange={v => handleInputChange("available_for_hire", v)}
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-6">
                <ProfileAchievementsSection
                  userId={user?.id || ""}
                  isOwnProfile
                  className={cn(dashboardCreatePattern.shell, "border-slate-700/50 bg-slate-900/40 text-slate-100")}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card className={dashboardCreatePattern.shell}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Shield className="h-5 w-5 text-purple-400" />
                      Privacy &amp; preferences
                    </CardTitle>
                    <CardDescription className="text-slate-400">Control visibility and contact preferences.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Profile visibility</Label>
                      <Select
                        value={formData.privacy_settings}
                        onValueChange={v => handleInputChange("privacy_settings", v)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900 text-white">
                          <SelectItem value="public">Public — anyone can view</SelectItem>
                          <SelectItem value="verified">Verified users only</SelectItem>
                          <SelectItem value="private">Private — invite only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className={dashboardCreatePattern.fieldGroup}>
                      <Label>Preferred contact</Label>
                      <Select
                        value={formData.preferred_contact}
                        onValueChange={v => handleInputChange("preferred_contact", v)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className={dashboardCreatePattern.selectTrigger}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900 text-white">
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="platform">Through Tourify</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                      <div>
                        <p className="font-medium text-slate-200">Product newsletter</p>
                        <p className={dashboardCreatePattern.subtleText}>Updates about features and opportunities.</p>
                      </div>
                      <Switch
                        checked={formData.newsletter_signup}
                        onCheckedChange={v => handleInputChange("newsletter_signup", v)}
                        disabled={isSaving}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {hasUnsavedChanges ? (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-700/60 bg-slate-950/95 px-4 py-3 backdrop-blur md:py-4">
          <div className="mx-auto flex max-w-6xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-amber-200/90">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className={dashboardCreatePattern.btnOutline} onClick={handleCancel} disabled={isSaving}>
                Discard
              </Button>
              <Button type="button" className={dashboardCreatePattern.btnPrimary} onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
