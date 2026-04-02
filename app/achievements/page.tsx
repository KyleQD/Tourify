"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
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
  Filter,
  TrendingUp,
  Star,
  Target,
  Users,
  Zap
} from "lucide-react"
import { AchievementCard } from "@/components/achievements/achievement-card"
import { BadgeCard } from "@/components/achievements/badge-card"
import { EndorsementCard } from "@/components/achievements/endorsement-card"
import { achievementService } from "@/lib/services/achievement.service"
import { 
  Achievement, 
  UserAchievement, 
  Badge as BadgeType, 
  UserBadge, 
  Endorsement,
  UserSkill,
  AchievementStats,
  BadgeStats,
  EndorsementStats
} from "@/types/achievements"

export default function AchievementsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("achievements")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterRarity, setFilterRarity] = useState<string>("all")

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

  const supabase = createClientComponentClient()

  useEffect(() => {
    loadCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadAchievementData()
    }
  }, [currentUser])

  const loadCurrentUser = async () => {
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
  }

  const loadAchievementData = async () => {
    try {
      setLoading(true)
      
      const [achievementsResponse, badgesResponse, endorsementsResponse] = await Promise.all([
        achievementService.getUserAchievements(currentUser.id),
        achievementService.getUserBadges(currentUser.id),
        achievementService.getUserEndorsements(currentUser.id)
      ])

      setAchievements(achievementsResponse.achievements)
      setUserAchievements(achievementsResponse.user_achievements)
      setBadges(badgesResponse.badges)
      setUserBadges(badgesResponse.user_badges)
      setEndorsements(endorsementsResponse.endorsements)
      setSkills(endorsementsResponse.skills)

      // Load stats
      const [achievementStatsData, badgeStatsData, endorsementStatsData] = await Promise.all([
        achievementService.getAchievementStats(currentUser.id),
        achievementService.getBadgeStats(currentUser.id),
        achievementService.getEndorsementStats(currentUser.id)
      ])

      setAchievementStats(achievementStatsData)
      setBadgeStats(badgeStatsData)
      setEndorsementStats(endorsementStatsData)

    } catch (error) {
      console.error('Error loading achievement data:', error)
    } finally {
      setLoading(false)
    }
  }

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
          <p className="text-white/70">Track your accomplishments and showcase your expertise</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <Trophy className="h-6 w-6 text-green-400" />
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
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Award className="h-6 w-6 text-blue-400" />
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
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <Star className="h-6 w-6 text-purple-400" />
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
          </TabsList>

          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            {roadmapItems.length > 0 && (
              <Card className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-white">Roadmap</CardTitle>
                  <CardDescription className="text-white/60">Closest achievements to unlock next</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roadmapItems.map(({ achievement, current, target, progress }) => (
                    <div key={achievement.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/90">{achievement.name}</span>
                        <span className="text-white/60">{current}/{target}</span>
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
                  <CardTitle className="text-white">Completed by Category</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {Object.entries(completedByCategory).map(([category, count]) => (
                    <Badge key={category} variant="outline" className="border-white/25 text-white/80">
                      {category}: {count}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAchievements.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  userAchievement={getUserAchievement(achievement.id)}
                  showProgress={true}
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
          <TabsContent value="badges" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  userBadge={getUserBadge(badge.id)}
                  showDetails={true}
                />
              ))}
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
                  <h3 className="text-xl font-semibold text-white mb-2">No endorsements found</h3>
                  <p className="text-white/60">Try adjusting your search or filters</p>
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
        </Tabs>
      </div>
    </div>
  )
} 