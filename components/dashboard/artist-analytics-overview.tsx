'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Music, 
  Calendar, 
  DollarSign, 
  Globe, 
  MapPin, 
  Play, 
  Heart, 
  Share, 
  Eye,
  Target,
  PieChart,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Star,
  Video,
  ImageIcon,
  FileText,
  ShoppingBag
} from 'lucide-react'
import type { AnalyticsData } from '@/lib/artist/artist-analytics-data'

interface ArtistAnalyticsOverviewProps {
  data: AnalyticsData
  timeRange?: '7d' | '30d' | '90d' | '1y'
}

const getGrowthIcon = (value: number) => {
  if (value > 0) return <ArrowUpRight className="h-4 w-4 text-green-400" />
  if (value < 0) return <ArrowDownRight className="h-4 w-4 text-red-400" />
  return <Minus className="h-4 w-4 text-slate-400" />
}

const getGrowthColor = (value: number) => {
  if (value > 0) return 'text-green-400'
  if (value < 0) return 'text-red-400'
  return 'text-slate-400'
}

export function ArtistAnalyticsOverview({ 
  data,
  timeRange = '30d'
}: ArtistAnalyticsOverviewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'audience' | 'content' | 'revenue' | 'platforms'>('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'audience', label: 'Audience', icon: <Users className="h-4 w-4" /> },
    { id: 'content', label: 'Content', icon: <Music className="h-4 w-4" /> },
    { id: 'revenue', label: 'Revenue', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'platforms', label: 'Platforms', icon: <Globe className="h-4 w-4" /> }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
        >
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">${data.overview.totalRevenue.toLocaleString()}</p>
          <div className="flex items-center space-x-1 mt-1">
            {data.overview.growthRate !== 0 ? (
              <>
                {getGrowthIcon(data.overview.growthRate)}
                <span className={`text-sm ${getGrowthColor(data.overview.growthRate)}`}>
                  {data.overview.growthRate}%
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-500">Period comparison not available</span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Total Fans</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.overview.totalFans.toLocaleString()}</p>
          <div className="flex items-center space-x-1 mt-1">
            {data.overview.growthRate !== 0 ? (
              <>
                {getGrowthIcon(data.overview.growthRate)}
                <span className={`text-sm ${getGrowthColor(data.overview.growthRate)}`}>
                  {data.overview.growthRate}%
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-500">—</span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Play className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-400">Total Streams</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.overview.totalStreams.toLocaleString()}</p>
          <div className="flex items-center space-x-1 mt-1">
            {data.overview.growthRate !== 0 ? (
              <>
                {getGrowthIcon(data.overview.growthRate)}
                <span className={`text-sm ${getGrowthColor(data.overview.growthRate)}`}>
                  {data.overview.growthRate}%
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-500">—</span>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
        >
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Engagement Rate</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.overview.engagementRate}%</p>
          <div className="flex items-center space-x-1 mt-1">
            {data.overview.growthRate !== 0 ? (
              <>
                {getGrowthIcon(data.overview.growthRate)}
                <span className={`text-sm ${getGrowthColor(data.overview.growthRate)}`}>
                  {data.overview.growthRate}%
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-500">—</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Monthly Listeners */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Monthly Listeners</h3>
            <p className="text-slate-400">{data.overview.monthlyListeners.toLocaleString()} listeners</p>
          </div>
          {data.overview.growthRate !== 0 ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              +{data.overview.growthRate}% this month
            </Badge>
          ) : (
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              No MoM trend yet
            </Badge>
          )}
        </div>
        <Progress
          value={data.overview.monthlyListeners > 0 ? Math.min(100, (data.overview.monthlyListeners / 60000) * 100) : 0}
          className="h-2"
        />
        <div className="flex justify-between text-sm text-slate-400 mt-2">
          <span>Goal (optional): 60,000</span>
          <span>
            {data.overview.monthlyListeners > 0
              ? `${Math.round(Math.min(100, (data.overview.monthlyListeners / 60000) * 100))}% of goal`
              : 'Connect analytics for listener trends'}
          </span>
        </div>
      </motion.div>
    </div>
  )

  const renderAudience = () => (
    <div className="space-y-6">
      {/* Audience Engagement */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Active Fans</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.audience.engagement.activeFans.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Super Fans</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.audience.engagement.superFans.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-400">Casual Listeners</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.audience.engagement.casualListeners.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">New Followers</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.audience.engagement.newFollowers.toLocaleString()}</p>
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Age Distribution</h3>
          <div className="space-y-3">
            {data.audience.demographics.ageGroups.length === 0 && (
              <p className="text-sm text-slate-500">No demographic breakdown yet. Connect social/streaming insights when available.</p>
            )}
            {data.audience.demographics.ageGroups.map((group) => (
              <div key={group.range} className="flex items-center justify-between">
                <span className="text-slate-300">{group.range}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${group.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400 w-8">{group.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Top Countries</h3>
          <div className="space-y-3">
            {data.audience.demographics.topCountries.length === 0 && (
              <p className="text-sm text-slate-500">No country data yet.</p>
            )}
            {data.audience.demographics.topCountries.map((country) => (
              <div key={country.country} className="flex items-center justify-between">
                <span className="text-slate-300">{country.country}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-400 w-8">{country.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => (
    <div className="space-y-6">
      {/* Content Performance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Music className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Tracks</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.content.performance.tracks.total}</p>
          <p className="text-sm text-slate-400">{data.content.performance.tracks.avgPlays.toLocaleString()} avg plays</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Video className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-400">Videos</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.content.performance.videos.total}</p>
          <p className="text-sm text-slate-400">{data.content.performance.videos.avgViews.toLocaleString()} avg views</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <ImageIcon className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Photos</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.content.performance.photos.total}</p>
          <p className="text-sm text-slate-400">{data.content.performance.photos.avgLikes.toLocaleString()} avg likes</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Blogs</span>
          </div>
          <p className="text-2xl font-bold text-white">{data.content.performance.blogs.total}</p>
          <p className="text-sm text-slate-400">{data.content.performance.blogs.avgReads.toLocaleString()} avg reads</p>
        </div>
      </div>

      {/* Content Trends */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Content Growth Trends</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data.content.trends.weeklyGrowth}%</p>
            <p className="text-sm text-slate-400">Weekly Growth</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{data.content.trends.monthlyGrowth}%</p>
            <p className="text-sm text-slate-400">Monthly Growth</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-white truncate">{data.content.trends.topPerformingContent}</p>
            <p className="text-sm text-slate-400">Top Performing</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderRevenue = () => (
    <div className="space-y-6">
      {/* Revenue Breakdown */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Live Shows</span>
          </div>
          <p className="text-xl font-bold text-white">${data.revenue.breakdown.liveShows.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <ShoppingBag className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-slate-400">Merchandise</span>
          </div>
          <p className="text-xl font-bold text-white">${data.revenue.breakdown.merchandise.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Play className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Streaming</span>
          </div>
          <p className="text-xl font-bold text-white">${data.revenue.breakdown.streaming.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-slate-400">Collaborations</span>
          </div>
          <p className="text-xl font-bold text-white">${data.revenue.breakdown.collaborations.toLocaleString()}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-slate-400">Sponsorships</span>
          </div>
          <p className="text-xl font-bold text-white">${data.revenue.breakdown.sponsorships.toLocaleString()}</p>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Revenue Projections</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">${data.revenue.projections.nextMonth.toLocaleString()}</p>
            <p className="text-sm text-slate-400">Next Month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">${data.revenue.projections.nextQuarter.toLocaleString()}</p>
            <p className="text-sm text-slate-400">Next Quarter</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">${data.revenue.projections.nextYear.toLocaleString()}</p>
            <p className="text-sm text-slate-400">Next Year</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderPlatforms = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(data.platforms).map(([platform, stats]) => (
          <div key={platform} className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white capitalize">{platform}</h3>
              <Badge className={getGrowthColor(stats.growth)}>
                {getGrowthIcon(stats.growth)}
                {stats.growth}%
              </Badge>
            </div>
            <div className="space-y-3">
              {platform === 'spotify' || platform === 'appleMusic' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Listeners</span>
                    <span className="text-white">{('listeners' in stats ? stats.listeners : 0)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Streams</span>
                    <span className="text-white">{('streams' in stats ? stats.streams : 0)?.toLocaleString()}</span>
                  </div>
                </>
              ) : platform === 'youtube' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subscribers</span>
                    <span className="text-white">{('subscribers' in stats ? stats.subscribers : 0)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Views</span>
                    <span className="text-white">{('views' in stats ? stats.views : 0)?.toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Followers</span>
                    <span className="text-white">{('followers' in stats ? stats.followers : 0)?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">
                      {platform === 'instagram' ? 'Engagement' : 'Views'}
                    </span>
                    <span className="text-white">
                      {platform === 'instagram' 
                        ? `${('engagement' in stats ? stats.engagement : 0)}%` 
                        : ('views' in stats ? stats.views : 0)?.toLocaleString()
                      }
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/50 border-slate-700/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-white">Analytics Overview</CardTitle>
              <CardDescription className="text-slate-400">
                Detailed performance metrics and insights
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-slate-800/50 border-slate-600 text-slate-300">
              Last {timeRange}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="border-blue-500/50 text-blue-400 hover:bg-blue-500/20 rounded-xl"
            >
              <Activity className="h-4 w-4 mr-1" />
              Full Analytics
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mt-4">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 rounded-xl ${
                activeTab === tab.id 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'audience' && renderAudience()}
        {activeTab === 'content' && renderContent()}
        {activeTab === 'revenue' && renderRevenue()}
        {activeTab === 'platforms' && renderPlatforms()}
      </CardContent>
    </Card>
  )
} 