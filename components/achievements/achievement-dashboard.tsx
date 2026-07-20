"use client"

/**
 * @deprecated Prefer `/achievements` (`app/achievements/achievements-page-client.tsx`).
 * Kept for reference; not mounted in the app shell.
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Trophy, 
  Award, 
  ThumbsUp, 
  Star, 
  Target, 
  TrendingUp, 
  Users, 
  Zap,
  Crown,
  Medal,
  Badge as BadgeIcon,
  CheckCircle,
  Clock,
  Calendar,
  Heart,
  MessageSquare,
  Music,
  Mic,
  Building2,
  Headphones,
  User
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AchievementCard } from './achievement-card'
import { BadgeCard } from './badge-card'
import { EndorsementCard } from './endorsement-card'
import { achievementReads } from '@/lib/achievements/achievement-reads'
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
} from '@/types/achievements'

interface AchievementDashboardProps {
  userId: string
  className?: string
}

const categoryIcons = {
  music: Music,
  performance: Mic,
  collaboration: Users,
  business: Building2,
  community: Heart,
  technical: Zap,
  creative: Star,
  leadership: Crown,
  innovation: TrendingUp,
  milestone: Target
}

const rarityColors = {
  common: '#10b981',
  uncommon: '#f59e0b',
  rare: '#8b5cf6',
  epic: '#ef4444',
  legendary: '#fbbf24'
}

export function AchievementDashboard({ userId, className }: AchievementDashboardProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [endorsements, setEndorsements] = useState<Endorsement[]>([])
  const [skills, setSkills] = useState<UserSkill[]>([])
  const [stats, setStats] = useState<{
    achievement: AchievementStats
    badge: BadgeStats
    endorsement: EndorsementStats
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadAchievementData()
  }, [userId])

  const loadAchievementData = async () => {
    try {
      setIsLoading(true)
      
      // Load achievements
      const achievementData = await achievementReads.getUserAchievements(userId)
      setAchievements(achievementData.achievements)
      setUserAchievements(achievementData.user_achievements)

      // Load badges
      const badgeData = await achievementReads.getUserBadges(userId)
      setBadges(badgeData.badges)
      setUserBadges(badgeData.user_badges)

      // Load endorsements
      const endorsementData = await achievementReads.getUserEndorsements(userId)
      setEndorsements(endorsementData.endorsements)
      setSkills(endorsementData.skills)

      // Load stats
      const achievementStats = await achievementReads.getAchievementStats(userId)
      const badgeStats = await achievementReads.getBadgeStats(userId)
      const endorsementStats = await achievementReads.getEndorsementStats(userId)

      setStats({
        achievement: achievementStats,
        badge: badgeStats,
        endorsement: endorsementStats
      })
    } catch (error) {
      console.error('Error loading achievement data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getCompletedAchievements = () => {
    return userAchievements.filter(ua => ua.is_completed)
  }

  const getInProgressAchievements = () => {
    return userAchievements.filter(ua => !ua.is_completed && ua.progress_percentage > 0)
  }

  const getAvailableAchievements = () => {
    const userAchievementIds = userAchievements.map(ua => ua.achievement_id)
    return achievements.filter(a => !userAchievementIds.includes(a.id))
  }

  const getCategoryStats = () => {
    const completed = getCompletedAchievements()
    const categoryCounts: Record<string, number> = {}
    
    completed.forEach(ua => {
      const achievement = achievements.find(a => a.id === ua.achievement_id)
      if (achievement) {
        categoryCounts[achievement.category] = (categoryCounts[achievement.category] || 0) + 1
      }
    })

    return categoryCounts
  }

  const getRarityStats = () => {
    const completed = getCompletedAchievements()
    const rarityCounts: Record<string, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    }
    
    completed.forEach(ua => {
      const achievement = achievements.find(a => a.id === ua.achievement_id)
      if (achievement) {
        rarityCounts[achievement.rarity] = (rarityCounts[achievement.rarity] || 0) + 1
      }
    })

    return rarityCounts
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Trophy className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.achievement.total_points || 0}
                </p>
                <p className="text-sm text-gray-400">Total Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Award className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.achievement.completed_achievements || 0}
                </p>
                <p className="text-sm text-gray-400">Achievements</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <BadgeIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.badge.total_badges || 0}
                </p>
                <p className="text-sm text-gray-400">Badges</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <ThumbsUp className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {stats?.endorsement.total_endorsements || 0}
                </p>
                <p className="text-sm text-gray-400">Endorsements</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="endorsements">Endorsements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Progress Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Category Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(getCategoryStats()).map(([category, count]) => {
                  const totalInCategory = achievements.filter(a => a.category === category).length
                  const percentage = totalInCategory > 0 ? (count / totalInCategory) * 100 : 0
                  const IconComponent = categoryIcons[category as keyof typeof categoryIcons] || Star
                  
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium capitalize">{category}</span>
                        </div>
                        <span className="text-sm text-gray-400">{count}/{totalInCategory}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Rarity Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>Rarity Breakdown</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(getRarityStats()).map(([rarity, count]) => (
                    <div key={rarity} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: rarityColors[rarity as keyof typeof rarityColors] }}
                        />
                        <span className="text-sm font-medium capitalize">{rarity}</span>
                      </div>
                      <span className="text-sm text-gray-400">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Your latest accomplishments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCompletedAchievements()
                  .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
                  .slice(0, 6)
                  .map(userAchievement => {
                    const achievement = achievements.find(a => a.id === userAchievement.achievement_id)
                    if (!achievement) return null
                    
                    return (
                      <AchievementCard
                        key={userAchievement.id}
                        achievement={achievement}
                        userAchievement={userAchievement}
                        showProgress={false}
                      />
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {/* Achievement Filters */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="cursor-pointer">All</Badge>
            {Object.keys(categoryIcons).map(category => (
              <Badge key={category} variant="outline" className="cursor-pointer capitalize">
                {category}
              </Badge>
            ))}
          </div>

          {/* Completed Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span>Completed ({getCompletedAchievements().length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCompletedAchievements().map(userAchievement => {
                  const achievement = achievements.find(a => a.id === userAchievement.achievement_id)
                  if (!achievement) return null
                  
                  return (
                    <AchievementCard
                      key={userAchievement.id}
                      achievement={achievement}
                      userAchievement={userAchievement}
                      showProgress={false}
                    />
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* In Progress Achievements */}
          {getInProgressAchievements().length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <span>In Progress ({getInProgressAchievements().length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getInProgressAchievements().map(userAchievement => {
                    const achievement = achievements.find(a => a.id === userAchievement.achievement_id)
                    if (!achievement) return null
                    
                    return (
                      <AchievementCard
                        key={userAchievement.id}
                        achievement={achievement}
                        userAchievement={userAchievement}
                        showProgress={true}
                      />
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-gray-400" />
                <span>Available ({getAvailableAchievements().length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAvailableAchievements().map(achievement => (
                  <AchievementCard
                    key={achievement.id}
                    achievement={achievement}
                    showProgress={false}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userBadges.map(userBadge => {
              const badge = badges.find(b => b.id === userBadge.badge_id)
              if (!badge) return null
              
              return (
                <BadgeCard
                  key={userBadge.id}
                  badge={badge}
                  userBadge={userBadge}
                  showDetails={true}
                />
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="endorsements" className="space-y-6">
          {/* Skills Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Skills</CardTitle>
              <CardDescription>Skills and endorsements from the community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {skills.map(skill => (
                  <div key={skill.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Star className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">{skill.skill_name}</h4>
                        <p className="text-sm text-gray-400">
                          {skill.total_endorsements} endorsements
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-400">
                        {skill.endorsed_level.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-400">Average Level</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Endorsements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Endorsements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {endorsements.slice(0, 10).map(endorsement => (
                  <EndorsementCard
                    key={endorsement.id}
                    endorsement={endorsement}
                    showEndorser={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 