"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Trophy, 
  Award, 
  ThumbsUp, 
  Star,
  TrendingUp,
  Target,
  Users,
  Zap,
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
import { achievementService } from "@/lib/services/achievement.service"
import { 
  Achievement, 
  UserAchievement, 
  Badge as BadgeType, 
  UserBadge, 
  Endorsement,
  UserSkill
} from "@/types/achievements"

interface ProfileAchievementsSectionProps {
  userId: string
  isOwnProfile?: boolean
  className?: string
}

export function ProfileAchievementsSection({ 
  userId, 
  isOwnProfile = false,
  className 
}: ProfileAchievementsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("achievements")
  
  // Data states
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [skills, setSkills] = useState<UserSkill[]>([])

  // Stats states
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
      setUserBadges(prev => prev.map(ub =>
        ub.id === userBadgeId ? { ...ub, metadata: { ...ub.metadata, is_visible: newVisible } } : ub
      ))
      toast({ title: newVisible ? "Badge visible" : "Badge hidden", description: newVisible ? "This badge is now shown on your profile." : "This badge is now hidden from your profile." })
    } catch (error) {
      toast({ title: "Update failed", variant: "destructive" })
    }
  }

  useEffect(() => {
    loadAchievementData()
  }, [userId])

  const loadAchievementData = async () => {
    setLoading(true)
    setLoadNotice(null)

    const [achRes, badgeRes, endRes] = await Promise.allSettled([
      achievementService.getUserAchievements(userId),
      achievementService.getUserBadges(userId),
      achievementService.getUserEndorsements(userId)
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
      notices.push("Badges could not be loaded.")
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

  const getUserAchievement = (achievementId: string) => {
    return userAchievements.find(ua => ua.achievement_id === achievementId)
  }

  const getUserBadge = (badgeId: string) => {
    return userBadges.find(ub => ub.badge_id === badgeId)
  }

  const completedAchievementsList = userAchievements.filter(ua => ua.is_completed)
  const activeBadges = userBadges.filter(ub => {
    if (!ub.is_active) return false
    if (!isOwnProfile && ub.metadata?.is_visible === false) return false
    return true
  })
  const userAchievementById = new Map(userAchievements.map(ua => [ua.achievement_id, ua]))
  const upcomingAchievements = achievements
    .filter(achievement => !userAchievementById.get(achievement.id)?.is_completed)
    .map(achievement => {
      const progress = userAchievementById.get(achievement.id)
      const current = progress?.current_value ?? 0
      const target = progress?.target_value ?? Number(achievement.target_value || achievement.requirements?.target || 1)
      const percent = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return { achievement, current, target, percent }
    })
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3)

  const categoryCounts = completedAchievementsList.reduce<Record<string, number>>((acc, ua) => {
    const category = ua.achievement?.category || 'other'
    acc[category] = (acc[category] || 0) + 1
    return acc
  }, {})

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">Loading achievements...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        {loadNotice ? (
          <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            {loadNotice}
          </p>
        ) : null}
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Achievements & Recognition
          </CardTitle>
          {isOwnProfile && (
            <Button variant="outline" size="sm" asChild>
              <a href="/achievements">
                <ExternalLink className="h-4 w-4 mr-2" />
                View All
              </a>
            </Button>
          )}
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalPoints}</div>
            <div className="text-sm text-gray-600">Total Points</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{completedAchievements}</div>
            <div className="text-sm text-gray-600">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalBadges}</div>
            <div className="text-sm text-gray-600">Badges</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totalEndorsements}</div>
            <div className="text-sm text-gray-600">Endorsements</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {upcomingAchievements.length ? (
          <div className="mb-6 rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-100">Next milestones</h4>
            <div className="space-y-3">
              {upcomingAchievements.map(({ achievement, current, target, percent }) => (
                <div key={achievement.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-slate-200">{achievement.name}</span>
                    <span className="shrink-0 text-slate-400">{current}/{target}</span>
                  </div>
                  <Progress value={percent} className="h-1.5 bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {Object.keys(categoryCounts).length ? (
          <div className="mb-6 flex flex-wrap gap-2">
            {Object.entries(categoryCounts).map(([category, count]) => (
              <Badge key={category} variant="outline" className="border-slate-600 text-slate-200">
                {category}: {count}
              </Badge>
            ))}
          </div>
        ) : null}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="endorsements" className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              Endorsements
            </TabsTrigger>
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-4">
            {completedAchievementsList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedAchievementsList.slice(0, 4).map((userAchievement) => {
                  const achievement = achievements.find(a => a.id === userAchievement.achievement_id)
                  if (!achievement) return null
                  
                  return (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      userAchievement={userAchievement}
                      showProgress={false}
                      className="h-auto"
                    />
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No achievements yet</p>
                {isOwnProfile && (
                  <p className="text-sm mt-2">Complete activities to earn achievements!</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-4">
            {activeBadges.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeBadges.slice(0, isOwnProfile ? 8 : 4).map((userBadge) => {
                  const badge = badges.find(b => b.id === userBadge.badge_id)
                  if (!badge) return null
                  const isVisible = userBadge.metadata?.is_visible !== false
                  
                  return (
                    <div key={badge.id} className="relative">
                      <BadgeCard
                        badge={badge}
                        userBadge={userBadge}
                        showDetails={false}
                        className="h-auto"
                      />
                      {isOwnProfile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "absolute top-2 left-2 h-7 w-7 p-0 rounded-full",
                            isVisible ? "text-green-400 hover:text-green-300" : "text-slate-500 hover:text-slate-400"
                          )}
                          onClick={(e) => { e.stopPropagation(); handleToggleBadgeVisibility(userBadge.id, isVisible) }}
                          title={isVisible ? "Visible on profile (click to hide)" : "Hidden from profile (click to show)"}
                        >
                          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {isOwnProfile && !isVisible && (
                        <div className="absolute inset-0 bg-slate-900/40 rounded-lg pointer-events-none" />
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No badges yet</p>
                {isOwnProfile && (
                  <p className="text-sm mt-2">Earn badges by demonstrating expertise!</p>
                )}
              </div>
            )}
            {isOwnProfile && userBadges.filter(ub => ub.is_active && ub.metadata?.is_visible === false).length > 0 && (
              <p className="text-xs text-slate-500 text-center">
                <EyeOff className="h-3 w-3 inline mr-1" />
                {userBadges.filter(ub => ub.is_active && ub.metadata?.is_visible === false).length} badge{userBadges.filter(ub => ub.is_active && ub.metadata?.is_visible === false).length !== 1 ? 's' : ''} hidden from your public profile
              </p>
            )}
          </TabsContent>

          {/* Endorsements Tab */}
          <TabsContent value="endorsements" className="space-y-4">
            {endorsements.length > 0 ? (
              <div className="space-y-3">
                {endorsements.slice(0, 3).map((endorsement) => (
                  <EndorsementCard
                    key={endorsement.id}
                    endorsement={endorsement}
                    showEndorser={true}
                    showActions={false}
                    className="h-auto"
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ThumbsUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No endorsements yet</p>
                {isOwnProfile && (
                  <p className="text-sm mt-2">Get endorsed by other users for your skills!</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Skills Summary */}
        {skills.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Top Skills
            </h4>
            <div className="flex flex-wrap gap-2">
              {skills
                .sort((a, b) => b.endorsed_level - a.endorsed_level)
                .slice(0, 5)
                .map((skill) => (
                  <Badge key={skill.id} variant="outline" className="flex items-center gap-1">
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