"use client"

import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Trophy, 
  Award, 
  ThumbsUp, 
  Search, 
  Star,
  Target,
  Zap
} from "lucide-react"
import { AchievementCard } from "@/components/achievements/achievement-card"
import { BadgeCard } from "@/components/achievements/badge-card"
import { EndorsementCard } from "@/components/achievements/endorsement-card"
import { AchievementSeriesGroup } from "@/components/achievements/achievement-series-group"
import { groupAchievementsBySeries } from "@/lib/achievements/group-series"
import { achievementReads } from "@/lib/achievements/achievement-reads"
import { formatCategoryCount, nextRewardTier } from "@/lib/achievements/labels"
import { 
  Achievement, 
  UserAchievement, 
  Badge as BadgeType, 
  UserBadge, 
  Endorsement,
  UserSkill,
  AchievementStats,
  BadgeStats,
  EndorsementStats,
  ResumeAchievementsPayload
} from "@/types/achievements"

export function AchievementsPageClient() {
  const searchParams = useSearchParams()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("achievements")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterRarity, setFilterRarity] = useState<string>("all")

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (
      tab === 'achievements' ||
      tab === 'badges' ||
      tab === 'endorsements' ||
      tab === 'skills' ||
      tab === 'resume'
    ) {
      setActiveTab(tab)
    }
  }, [searchParams])

  // Data states
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [skills, setSkills] = useState<UserSkill[]>([])

  // Stats states
  const [achievementStats, setAchievementStats] = useState<AchievementStats | null>(null)
  const [badgeStats, setBadgeStats] = useState<BadgeStats | null>(null)
  const [endorsementStats, setEndorsementStats] = useState<EndorsementStats | null>(null)
  const [resumePayload, setResumePayload] = useState<ResumeAchievementsPayload | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const loadCurrentUser = useCallback(async () => {
    try {
      setLoading(true)
      
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        window.location.href = '/login'
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        return
      }

      setCurrentUser(profile)
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const loadAchievementData = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      
      const [achievementsResponse, badgesResponse, endorsementsResponse] = await Promise.all([
        achievementReads.getUserAchievements(userId),
        achievementReads.getUserBadges(userId),
        achievementReads.getUserEndorsements(userId)
      ])

      setAchievements(achievementsResponse.achievements)
      setUserAchievements(achievementsResponse.user_achievements)
      setBadges(badgesResponse.badges)
      setUserBadges(badgesResponse.user_badges)
      setEndorsements(endorsementsResponse.endorsements)
      setSkills(endorsementsResponse.skills)

      // Load stats
      const [achievementStatsData, badgeStatsData, endorsementStatsData] = await Promise.all([
        achievementReads.getAchievementStats(userId),
        achievementReads.getBadgeStats(userId),
        achievementReads.getEndorsementStats(userId)
      ])

      setAchievementStats(achievementStatsData)
      setBadgeStats(badgeStatsData)
      setEndorsementStats(endorsementStatsData)

      const resumeResponse = await fetch('/api/achievements/resume')
      if (resumeResponse.ok) {
        const payload = await resumeResponse.json()
        setResumePayload(payload as ResumeAchievementsPayload)
      }

    } catch (error) {
      console.error('Error loading achievement data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCurrentUser()
  }, [loadCurrentUser])

  useEffect(() => {
    if (currentUser?.id)
      void loadAchievementData(currentUser.id)
  }, [currentUser?.id, loadAchievementData])

  // Filter functions
  const filteredAchievements = achievements.filter(achievement => {
    const matchesSearch = achievement.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         achievement.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || achievement.category === filterCategory
    const matchesRarity = filterRarity === "all" || achievement.rarity === filterRarity
    
    return matchesSearch && matchesCategory && matchesRarity
  })

  const filteredBadges = badges.filter(badge => {
    const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         badge.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || badge.category === filterCategory
    const matchesRarity = filterRarity === "all" || badge.rarity === filterRarity
    
    return matchesSearch && matchesCategory && matchesRarity
  })

  const filteredEndorsements = endorsements.filter(endorsement => {
    const matchesSearch = endorsement.skill.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         endorsement.comment?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "all" || endorsement.category === filterCategory
    
    return matchesSearch && matchesCategory
  })

  const getUserAchievement = (achievementId: string) => {
    return userAchievements.find(ua => ua.achievement_id === achievementId)
  }

  const getUserBadge = (badgeId: string) => {
    return userBadges.find(ub => ub.badge_id === badgeId)
  }

  async function copyResumeBullets() {
    try {
      if (!resumePayload?.generated_bullets?.length) return
      const content = resumePayload.generated_bullets.map((bullet) => `• ${bullet}`).join('\n')
      await navigator.clipboard.writeText(content)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  async function copyResumeMarkdown() {
    try {
      const response = await fetch('/api/achievements/resume/export?format=markdown')
      if (!response.ok) throw new Error('Export failed')
      const markdown = await response.text()
      await navigator.clipboard.writeText(markdown)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  const userAchievementById = new Map(userAchievements.map(ua => [ua.achievement_id, ua]))
  const roadmapItems = achievements
    .filter(achievement => !userAchievementById.get(achievement.id)?.is_completed)
    .map(achievement => {
      const ua = userAchievementById.get(achievement.id)
      const current = ua?.current_value ?? 0
      const target = ua?.target_value ?? Number(achievement.target_value || achievement.requirements?.target || 1)
      const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
      return { achievement, current, target, progress }
    })
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 6)

  const completedByCategory = userAchievements
    .filter(ua => ua.is_completed && ua.achievement?.category)
    .reduce<Record<string, number>>((acc, ua) => {
      const category = ua.achievement?.category || 'other'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {})

  const walletPoints = resumePayload?.wallet.total_points || achievementStats?.total_points || 0
  const tierProgress = nextRewardTier(walletPoints)
  const seriesGroups = useMemo(
    () => groupAchievementsBySeries(filteredAchievements, userAchievements),
    [filteredAchievements, userAchievements]
  )
  const earnedBadges = filteredBadges.filter((badge) => !!getUserBadge(badge.id))
  const availableBadges = filteredBadges.filter((badge) => !getUserBadge(badge.id))
  const verifiedEndorsementCount = endorsements.filter((e) => e.is_verified).length
  const highlightId = searchParams.get('highlight')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading achievements...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900/20 to-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Achievements & Recognition</h1>
          <p className="text-white/70">
            Progress from real work, scarce badges, and endorsements from people who worked with you.
          </p>
        </div>

        {/* Hero strip: tier + next milestone */}
        <Card className="mb-6 border-white/15 bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-slate-900/80 backdrop-blur rounded-3xl">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-white/55 mb-1">Reward tier</p>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-base px-3 py-1">
                    {tierProgress.current.toUpperCase()}
                  </Badge>
                  <span className="text-2xl font-bold text-white">{walletPoints} pts</span>
                </div>
                {tierProgress.next ? (
                  <p className="mt-2 text-sm text-white/60">
                    {tierProgress.pointsToNext} pts to {tierProgress.next}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-emerald-300/80">Highest tier reached</p>
                )}
              </div>
              <div className="w-full md:max-w-sm">
                <div className="mb-2 flex justify-between text-xs text-white/50">
                  <span>Progress to next tier</span>
                  <span>{tierProgress.progress}%</span>
                </div>
                <Progress value={tierProgress.progress} className="h-2.5 bg-white/10" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/20">
                  <Trophy className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Total Points</p>
                  <p className="text-2xl font-bold text-white">{achievementStats?.total_points || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-sky-500/20">
                  <Award className="h-6 w-6 text-sky-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Achievements</p>
                  <p className="text-2xl font-bold text-white">{achievementStats?.completed_achievements || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Star className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Badges</p>
                  <p className="text-2xl font-bold text-white">{badgeStats?.total_badges || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/20">
                  <ThumbsUp className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Endorsements</p>
                  <p className="text-2xl font-bold text-white">{endorsementStats?.total_endorsements || 0}</p>
                  {verifiedEndorsementCount > 0 && (
                    <p className="text-xs text-emerald-300/80">{verifiedEndorsementCount} verified</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
            <Input
              placeholder="Search achievements, badges, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
            >
              <option value="all">All Categories</option>
              <option value="music">Music</option>
              <option value="performance">Performance</option>
              <option value="collaboration">Collaboration</option>
              <option value="business">Business</option>
              <option value="community">Community</option>
              <option value="technical">Technical</option>
              <option value="creative">Creative</option>
              <option value="leadership">Leadership</option>
            </select>
            
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg"
            >
              <option value="all">All Rarities</option>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 backdrop-blur border border-white/20 p-1">
            <TabsTrigger 
              value="achievements" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Achievements
            </TabsTrigger>
            <TabsTrigger 
              value="badges" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Award className="h-4 w-4 mr-2" />
              Badges
            </TabsTrigger>
            <TabsTrigger 
              value="endorsements" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Endorsements
            </TabsTrigger>
            <TabsTrigger 
              value="skills" 
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Target className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger
              value="resume"
              className="data-[state=active]:bg-white data-[state=active]:text-black text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Resume Builder
            </TabsTrigger>
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            {roadmapItems.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Next up</CardTitle>
                  <CardDescription className="text-white/60">Closest achievements to unlock</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roadmapItems.map(({ achievement, current, target, progress }) => (
                    <div
                      key={achievement.id}
                      className={`space-y-1 ${highlightId === achievement.id ? 'rounded-lg ring-2 ring-emerald-400/50 p-2' : ''}`}
                    >
                      <div className="flex items-center justify-between text-sm gap-3">
                        <span className="text-white/90 line-clamp-1" title={achievement.name}>
                          {achievement.name}
                        </span>
                        <span className="text-white/60 shrink-0">{current}/{target}</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-white/10" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {Object.keys(completedByCategory).length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Completed by category</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {Object.entries(completedByCategory).map(([category, count]) => (
                    <Badge key={category} variant="outline" className="border-white/25 text-white/80">
                      {formatCategoryCount(category, count)}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            {seriesGroups.filter((g) => g.items.length > 1).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Achievement series</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {seriesGroups
                    .filter((group) => group.items.length > 1)
                    .map((group) => (
                      <AchievementSeriesGroup
                        key={group.key}
                        title={group.title}
                        category={group.category}
                        items={group.items}
                      />
                    ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements
                .filter((a) => !a.group_key || seriesGroups.find((g) => g.key === a.group_key)?.items.length === 1)
                .map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  userAchievement={getUserAchievement(achievement.id)}
                  showProgress={true}
                  className={highlightId === achievement.id ? 'ring-2 ring-emerald-400/60' : undefined}
                />
              ))}
            </div>
            
            {filteredAchievements.length === 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardContent className="p-12 text-center">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No achievements found</h3>
                  <p className="text-white/60">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges" className="space-y-8">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">Earned</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {earnedBadges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    userBadge={getUserBadge(badge.id)}
                    showDetails={true}
                    className={highlightId === badge.id ? 'ring-2 ring-amber-400/60' : undefined}
                  />
                ))}
              </div>
              {earnedBadges.length === 0 && (
                <p className="text-sm text-white/55">No badges earned yet. Managers can award work badges after jobs and tours.</p>
              )}
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-white">Available</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableBadges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    silhouette
                    showDetails={true}
                  />
                ))}
              </div>
            </div>
            
            {filteredBadges.length === 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardContent className="p-12 text-center">
                  <Award className="h-16 w-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No badges found</h3>
                  <p className="text-white/60">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Endorsements Tab */}
          <TabsContent value="endorsements" className="space-y-6">
            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
              <CardContent className="p-4 text-sm text-white/70">
                {endorsements.length} received · {verifiedEndorsementCount} verified from shared work.
                Quality endorsements from managers and teammates strengthen hiring readiness.
              </CardContent>
            </Card>
            <div className="space-y-4">
              {filteredEndorsements.map((endorsement) => (
                <EndorsementCard
                  key={endorsement.id}
                  endorsement={endorsement}
                  showEndorser={true}
                  showActions={false}
                />
              ))}
            </div>
            
            {filteredEndorsements.length === 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardContent className="p-12 text-center">
                  <ThumbsUp className="h-16 w-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No endorsements yet</h3>
                  <p className="text-white/60">Endorsements from people you worked with will show up here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {skills.map((skill) => (
                <Card key={skill.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">{skill.skill_name}</h3>
                        {skill.category && (
                          <Badge variant="outline" className="text-xs border-white/30 text-white/70">
                            {skill.category.name}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{skill.endorsed_level}</div>
                        <div className="text-xs text-white/60">Level</div>
                      </div>
                    </div>
                    
                    {skill.description && (
                      <p className="text-white/70 text-sm mb-4">{skill.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Endorsements</span>
                        <span className="text-white">{skill.total_endorsements}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Self Assessment</span>
                        <span className="text-white">{skill.self_assessed_level || 'Not set'}</span>
                      </div>
                      {skill.years_experience && (
                        <div className="flex justify-between text-sm">
                          <span className="text-white/60">Experience</span>
                          <span className="text-white">{skill.years_experience} years</span>
                        </div>
                      )}
                    </div>
                    
                    {skill.is_primary_skill && (
                      <Badge className="mt-3 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                        Primary Skill
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {skills.length === 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardContent className="p-12 text-center">
                  <Target className="h-16 w-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-xl font-semibold text-white mb-2">No skills found</h3>
                  <p className="text-white/60">Add your skills to get started</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="resume" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Reward Wallet</CardTitle>
                  <CardDescription className="text-white/60">
                    Points and tier earned from verified work activity.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Tier</span>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                      {(resumePayload?.wallet.tier || 'bronze').toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Total Reward Points</span>
                    <span className="text-2xl font-bold text-white">{resumePayload?.wallet.total_points || 0}</span>
                  </div>
                  <p className="text-xs text-white/60">
                    Points increase as you apply, get approved, complete tasks, and maintain credential proof.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Resume Highlights</CardTitle>
                  <CardDescription className="text-white/60">
                    Featured accomplishments auto-generated from your work history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(resumePayload?.highlights || []).slice(0, 4).map((highlight) => (
                    <div key={highlight.id} className="rounded-lg border border-white/20 bg-white/5 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{highlight.title}</p>
                        <Badge variant="outline" className="border-white/25 text-white/80">
                          +{highlight.impact_score}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-white/70">{highlight.summary}</p>
                    </div>
                  ))}
                  {(resumePayload?.highlights?.length || 0) === 0 && (
                    <p className="text-sm text-white/60">
                      Keep working jobs and workflow tasks to unlock resume highlights.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-white">Generated Resume Bullets</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyResumeBullets}
                      className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                    >
                      Copy Bullets
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyResumeMarkdown}
                      className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                    >
                      Copy Markdown
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-white/60">
                  Copy-ready statements based on your platform activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(resumePayload?.generated_bullets || []).map((bullet, index) => (
                  <p key={`${index}-${bullet}`} className="text-sm text-white/85">
                    • {bullet}
                  </p>
                ))}
                {(resumePayload?.generated_bullets?.length || 0) === 0 && (
                  <p className="text-sm text-white/60">
                    Resume bullets will appear automatically once rewards and milestones are recorded.
                  </p>
                )}
                {copyState === 'copied' && (
                  <p className="text-xs text-emerald-300">Copied to clipboard.</p>
                )}
                {copyState === 'error' && (
                  <p className="text-xs text-rose-300">Unable to copy. Please try again.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 