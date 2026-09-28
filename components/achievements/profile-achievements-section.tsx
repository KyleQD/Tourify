"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Trophy,
  Award,
  ThumbsUp,
  Star,
  Target,
  ExternalLink,
  EyeOff,
  Eye,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { AchievementCard } from "./achievement-card"
import { BadgeCard } from "./badge-card"
import { EndorsementCard } from "./endorsement-card"
import { EndorsementModal } from "./endorsement-modal"
import { achievementReads } from "@/lib/achievements/achievement-reads"
import { formatCategoryCount, humanizeRarity } from "@/lib/achievements/labels"
import {
  Achievement,
  UserAchievement,
  Badge as BadgeType,
  UserBadge,
  Endorsement,
  UserSkill,
} from "@/types/achievements"

interface ProfileAchievementsSectionProps {
  userId: string
  /** Used for public recognition API when variant is public */
  username?: string
  isOwnProfile?: boolean
  /** Public profile surface: no owner dashboard links, toggles, or coaching copy */
  variant?: "default" | "public"
  className?: string
}

export function ProfileAchievementsSection({
  userId,
  username,
  isOwnProfile = false,
  variant = "default",
  className,
}: ProfileAchievementsSectionProps) {
  const isPublicSurface = variant === "public"
  const showOwnerControls = isOwnProfile && !isPublicSurface

  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("achievements")
  const [sheetOpen, setSheetOpen] = useState(false)

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [skills, setSkills] = useState<UserSkill[]>([])

  const [totalPoints, setTotalPoints] = useState(0)
  const [completedAchievements, setCompletedAchievements] = useState(0)
  const [totalBadges, setTotalBadges] = useState(0)
  const [totalEndorsements, setTotalEndorsements] = useState(0)
  const [loadNotice, setLoadNotice] = useState<string | null>(null)
  const { toast } = useToast()

  const handleToggleBadgeVisibility = async (userBadgeId: string, currentlyVisible: boolean) => {
    const newVisible = !currentlyVisible
    try {
      const res = await fetch("/api/badges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ user_badge_id: userBadgeId, is_visible: newVisible }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setUserBadges((prev) =>
        prev.map((ub) =>
          ub.id === userBadgeId
            ? { ...ub, metadata: { ...ub.metadata, is_visible: newVisible } }
            : ub
        )
      )
      toast({
        title: newVisible ? "Badge visible" : "Badge hidden",
        description: newVisible
          ? "This badge is now shown on your profile."
          : "This badge is now hidden from your profile.",
      })
    } catch {
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  useEffect(() => {
    loadAchievementData()
  }, [userId, username, isPublicSurface])

  const loadAchievementData = async () => {
    setLoading(true)
    setLoadNotice(null)

    if (isPublicSurface && username) {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(username)}/recognition`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setAchievements(data.achievements || [])
          setUserAchievements(data.user_achievements || [])
          setTotalPoints(data.total_points || 0)
          setCompletedAchievements(data.completed_count || 0)
          setBadges(data.badges || [])
          setUserBadges(data.user_badges || [])
          setTotalBadges(data.total_badges || 0)
          setEndorsements(data.endorsements || [])
          setTotalEndorsements(data.total_endorsements || 0)
          setSkills([])
          setLoading(false)
          return
        }
      } catch (error) {
        console.warn("[profile-achievements] public recognition API failed", error)
      }
    }

    const [achRes, badgeRes, endRes] = await Promise.allSettled([
      achievementReads.getUserAchievements(userId),
      achievementReads.getUserBadges(userId),
      achievementReads.getUserEndorsements(userId),
    ])

    const notices: string[] = []

    if (achRes.status === "fulfilled") {
      setAchievements(achRes.value.achievements)
      setUserAchievements(achRes.value.user_achievements)
      setTotalPoints(achRes.value.total_points)
      setCompletedAchievements(achRes.value.completed_count)
    } else {
      notices.push("Achievements could not be loaded.")
    }

    if (badgeRes.status === "fulfilled") {
      setBadges(badgeRes.value.badges)
      setUserBadges(badgeRes.value.user_badges)
      setTotalBadges(badgeRes.value.total_badges)
    } else {
      console.warn("[profile-achievements] Badges could not be loaded", badgeRes.reason)
      setBadges([])
      setUserBadges([])
      setTotalBadges(0)
      if (!isPublicSurface) notices.push("Badges could not be loaded.")
    }

    if (endRes.status === "fulfilled") {
      setEndorsements(endRes.value.endorsements)
      setSkills(endRes.value.skills)
      setTotalEndorsements(endRes.value.total_endorsements)
    } else {
      notices.push("Endorsements could not be loaded.")
    }

    if (notices.length) setLoadNotice(notices.join(" "))
    setLoading(false)
  }

  const completedAchievementsList = userAchievements.filter((ua) => ua.is_completed)
  const activeBadges = userBadges.filter((ub) => {
    if (!ub.is_active) return false
    if ((!isOwnProfile || isPublicSurface) && ub.metadata?.is_visible === false) return false
    return true
  })
  const userAchievementById = new Map(userAchievements.map((ua) => [ua.achievement_id, ua]))
  const upcomingAchievements = achievements
    .filter((achievement) => !userAchievementById.get(achievement.id)?.is_completed)
    .map((achievement) => {
      const progress = userAchievementById.get(achievement.id)
      const current = progress?.current_value ?? 0
      const target =
        progress?.target_value ??
        Number(achievement.target_value || achievement.requirements?.target || 1)
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return { achievement, current, target, percent }
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3)

  const categoryCounts = completedAchievementsList.reduce<Record<string, number>>((acc, ua) => {
    const category = ua.achievement?.category || "other"
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  const rarityRank: Record<string, number> = {
    legendary: 5,
    epic: 4,
    rare: 3,
    uncommon: 2,
    common: 1,
  }

  const featuredAchievements = [...completedAchievementsList]
    .sort((a, b) => {
      const rarityDiff =
        (rarityRank[b.achievement?.rarity || "common"] || 0) -
        (rarityRank[a.achievement?.rarity || "common"] || 0)
      if (rarityDiff !== 0) return rarityDiff
      return new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    })
    .slice(0, 3)

  const featuredBadges = [...activeBadges]
    .sort((a, b) => {
      const badgeA = badges.find((badge) => badge.id === a.badge_id)
      const badgeB = badges.find((badge) => badge.id === b.badge_id)
      return (
        (rarityRank[badgeB?.rarity || "common"] || 0) -
        (rarityRank[badgeA?.rarity || "common"] || 0)
      )
    })
    .slice(0, 3)

  const verifiedEndorsements = endorsements.filter((e) => e.is_verified).length
  const previewLimit = isPublicSurface ? 3 : 4
  const gridClass = isPublicSurface
    ? "grid grid-cols-1 gap-3"
    : "grid grid-cols-1 md:grid-cols-2 gap-4"

  function renderAchievementList(limit?: number) {
    const list =
      typeof limit === "number"
        ? completedAchievementsList.slice(0, limit)
        : completedAchievementsList

    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-white/50">
          <Trophy className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No achievements yet</p>
          {showOwnerControls && (
            <p className="text-sm mt-2">Complete activities to earn achievements!</p>
          )}
        </div>
      )
    }

    return (
      <div className={gridClass}>
        {list.map((userAchievement) => {
          const achievement =
            achievements.find((a) => a.id === userAchievement.achievement_id) ||
            userAchievement.achievement
          if (!achievement) return null

          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              userAchievement={userAchievement}
              showProgress={false}
              compact={isPublicSurface}
              className="h-auto"
            />
          )
        })}
      </div>
    )
  }

  function renderBadgeList(limit?: number) {
    const list =
      typeof limit === "number" ? activeBadges.slice(0, limit) : activeBadges

    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-white/50">
          <Award className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No badges yet</p>
          {showOwnerControls && (
            <p className="text-sm mt-2">Earn badges by demonstrating expertise!</p>
          )}
        </div>
      )
    }

    return (
      <div className={gridClass}>
        {list.map((userBadge) => {
          const badge = badges.find((b) => b.id === userBadge.badge_id)
          if (!badge) return null
          const isVisible = userBadge.metadata?.is_visible !== false

          return (
            <div key={badge.id} className="relative min-w-0">
              <BadgeCard
                badge={badge}
                userBadge={userBadge}
                showDetails={false}
                className={cn("h-auto", isPublicSurface && "hover:scale-100")}
              />
              {showOwnerControls && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "absolute top-2 left-2 h-7 w-7 p-0 rounded-full",
                    isVisible
                      ? "text-green-400 hover:text-green-300"
                      : "text-slate-500 hover:text-slate-400"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleBadgeVisibility(userBadge.id, isVisible)
                  }}
                  title={
                    isVisible
                      ? "Visible on profile (click to hide)"
                      : "Hidden from profile (click to show)"
                  }
                >
                  {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              )}
              {showOwnerControls && !isVisible && (
                <div className="absolute inset-0 bg-slate-900/40 rounded-lg pointer-events-none" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  function renderEndorsementList(limit?: number) {
    const list =
      typeof limit === "number" ? endorsements.slice(0, limit) : endorsements

    if (list.length === 0) {
      return (
        <div className="text-center py-8 text-white/50">
          <ThumbsUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No endorsements yet</p>
          {showOwnerControls && (
            <p className="text-sm mt-2">Get endorsed by other users for your skills!</p>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {list.map((endorsement) => (
          <EndorsementCard
            key={endorsement.id}
            endorsement={endorsement}
            showEndorser={true}
            showActions={false}
            className="h-auto"
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={cn(className, "border-white/10 bg-white/10 backdrop-blur")}>
        <CardContent className="p-6">
          <div className="text-center text-white/60">Loading achievements...</div>
        </CardContent>
      </Card>
    )
  }

  const hasMoreToShow =
    completedAchievementsList.length > previewLimit ||
    activeBadges.length > previewLimit ||
    endorsements.length > 3

  return (
    <Card className={cn(className, "border-white/10 bg-white/10 backdrop-blur text-white")}>
      <CardHeader className="space-y-4">
        {loadNotice && !isPublicSurface ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {loadNotice}
          </p>
        ) : null}

        <div className="flex items-start justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
            <span className="leading-tight">Achievements & Recognition</span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {!isOwnProfile && (
              <EndorsementModal
                endorseeId={userId}
                endorseeName="this creator"
                trigger={
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Endorse
                  </Button>
                }
                onEndorsementCreated={loadAchievementData}
              />
            )}
            {showOwnerControls && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <a href="/achievements">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All
                </a>
              </Button>
            )}
            {isPublicSurface && hasMoreToShow && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    View all
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-lg overflow-y-auto border-white/10 bg-slate-950 text-white"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white">Achievements & Recognition</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-8">
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-white/80">Achievements</h3>
                      {renderAchievementList()}
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-white/80">Badges</h3>
                      {renderBadgeList()}
                    </section>
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-white/80">Endorsements</h3>
                      {renderEndorsementList()}
                    </section>
                  </div>
                </SheetContent>
              </Sheet>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="min-w-0 rounded-xl bg-black/20 px-2 py-3 text-center">
            <div className="truncate text-xl font-bold text-emerald-400 sm:text-2xl">
              {totalPoints}
            </div>
            <div className="text-xs text-white/50 sm:text-sm">Total</div>
          </div>
          <div className="min-w-0 rounded-xl bg-black/20 px-2 py-3 text-center">
            <div className="truncate text-xl font-bold text-sky-400 sm:text-2xl">
              {completedAchievements}
            </div>
            <div className="text-xs text-white/50 sm:text-sm">Achievements</div>
          </div>
          <div className="min-w-0 rounded-xl bg-black/20 px-2 py-3 text-center">
            <div className="truncate text-xl font-bold text-amber-400 sm:text-2xl">
              {totalBadges}
            </div>
            <div className="text-xs text-white/50 sm:text-sm">Badges</div>
          </div>
          <div className="min-w-0 rounded-xl bg-black/20 px-2 py-3 text-center">
            <div className="truncate text-xl font-bold text-orange-400 sm:text-2xl">
              {totalEndorsements}
            </div>
            <div className="text-xs text-white/50 sm:text-sm">Endorsements</div>
          </div>
        </div>

        {totalEndorsements > 0 && (
          <p className="text-xs text-white/50">
            {totalEndorsements} endorsements · {verifiedEndorsements} verified
          </p>
        )}
      </CardHeader>

      <CardContent>
        {(featuredAchievements.length > 0 || featuredBadges.length > 0) && (
          <div className="mb-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <h4 className="mb-3 text-sm font-semibold text-white/90">Featured</h4>
            <div className="flex flex-wrap gap-2">
              {featuredBadges.map((userBadge) => {
                const badge = badges.find((b) => b.id === userBadge.badge_id)
                if (!badge) return null
                return (
                  <Badge
                    key={userBadge.id}
                    variant="outline"
                    className="max-w-full gap-1 border-white/20 bg-white/5 text-white"
                  >
                    <Award className="h-3 w-3 shrink-0" />
                    <span className="truncate">{badge.name}</span>
                    <span className="shrink-0 text-white/50">· {humanizeRarity(badge.rarity)}</span>
                  </Badge>
                )
              })}
              {featuredAchievements.map((ua) => {
                const achievement =
                  achievements.find((a) => a.id === ua.achievement_id) || ua.achievement
                if (!achievement) return null
                return (
                  <Badge
                    key={ua.id}
                    variant="secondary"
                    className="max-w-full gap-1 bg-white/10 text-white"
                  >
                    <Trophy className="h-3 w-3 shrink-0" />
                    <span className="truncate">{achievement.name}</span>
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {!isPublicSurface && upcomingAchievements.length > 0 ? (
          <div className="mb-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <h4 className="mb-3 text-sm font-semibold text-white/90">Next milestones</h4>
            <div className="space-y-3">
              {upcomingAchievements.map(({ achievement, current, target, percent }) => (
                <div key={achievement.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-white/80">{achievement.name}</span>
                    <span className="shrink-0 text-white/50">
                      {current}/{target}
                    </span>
                  </div>
                  <Progress value={percent} className="h-1.5" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {Object.keys(categoryCounts).length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <Badge key={category} variant="outline" className="border-white/20 text-white/80">
                {formatCategoryCount(category, count)}
              </Badge>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-black/30">
            <TabsTrigger value="achievements" className="gap-1.5 text-xs sm:text-sm">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Achievements</span>
            </TabsTrigger>
            <TabsTrigger value="badges" className="gap-1.5 text-xs sm:text-sm">
              <Award className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="endorsements" className="gap-1.5 text-xs sm:text-sm">
              <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Endorsements</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-4">
            {renderAchievementList(previewLimit)}
          </TabsContent>

          <TabsContent value="badges" className="space-y-4">
            {renderBadgeList(isPublicSurface ? previewLimit : showOwnerControls ? 8 : 4)}
            {showOwnerControls &&
              userBadges.filter((ub) => ub.is_active && ub.metadata?.is_visible === false).length >
                0 && (
                <p className="text-xs text-white/50 text-center">
                  <EyeOff className="h-3 w-3 inline mr-1" />
                  {
                    userBadges.filter(
                      (ub) => ub.is_active && ub.metadata?.is_visible === false
                    ).length
                  }{" "}
                  badge
                  {userBadges.filter(
                    (ub) => ub.is_active && ub.metadata?.is_visible === false
                  ).length !== 1
                    ? "s"
                    : ""}{" "}
                  hidden from your public profile
                </p>
              )}
          </TabsContent>

          <TabsContent value="endorsements" className="space-y-4">
            {renderEndorsementList(3)}
          </TabsContent>
        </Tabs>

        {skills.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-white">
              <Target className="h-4 w-4" />
              Top Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {skills
                .sort((a, b) => b.endorsed_level - a.endorsed_level)
                .slice(0, 5)
                .map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="outline"
                    className="flex items-center gap-1 border-white/20 text-white/80"
                  >
                    {skill.skill_name}
                    <Star className="h-3 w-3 text-yellow-500" />
                    {skill.endorsed_level}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
