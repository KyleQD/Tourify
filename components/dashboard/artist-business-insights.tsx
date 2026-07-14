"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  Music,
  Video,
  Share2,
  ArrowRight,
  Lightbulb,
  Target,
  BarChart3,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/utils"

interface BusinessInsight {
  id: string
  title: string
  description: string
  type: 'revenue' | 'growth' | 'opportunity' | 'recommendation' | 'alert'
  priority: 'high' | 'medium' | 'low'
  trend: 'up' | 'down' | 'stable'
  value?: string
  change?: string
  actionUrl?: string
  actionText?: string
}

interface BusinessInsightsProps {
  insights: BusinessInsight[]
  isLoading?: boolean
  onViewAll?: () => void
}

export function ArtistBusinessInsights({ 
  insights, 
  isLoading = false, 
  onViewAll 
}: BusinessInsightsProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'revenue' | 'growth' | 'opportunity' | 'recommendation' | 'alert'>('all')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'revenue': return <DollarSign className="h-4 w-4 text-emerald-400" />
      case 'growth': return <TrendingUp className="h-4 w-4 text-blue-400" />
      case 'opportunity': return <Target className="h-4 w-4 text-purple-400" />
      case 'recommendation': return <Lightbulb className="h-4 w-4 text-yellow-400" />
      case 'alert': return <Zap className="h-4 w-4 text-red-400" />
      default: return <BarChart3 className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'revenue': return 'bg-emerald-500/10 border-emerald-500/20'
      case 'growth': return 'bg-blue-500/10 border-blue-500/20'
      case 'opportunity': return 'bg-purple-500/10 border-purple-500/20'
      case 'recommendation': return 'bg-yellow-500/10 border-yellow-500/20'
      case 'alert': return 'bg-red-500/10 border-red-500/20'
      default: return 'bg-gray-500/10 border-gray-500/20'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />
      default: return <BarChart3 className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredInsights = selectedType === 'all' 
    ? insights 
    : insights.filter(insight => insight.type === selectedType)

  const sortedInsights = filteredInsights.sort((a, b) => {
    // Sort by priority first (high > medium > low)
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    
    // Then sort by type (alert > opportunity > recommendation > growth > revenue)
    const typeOrder = { alert: 5, opportunity: 4, recommendation: 3, growth: 2, revenue: 1 }
    return typeOrder[b.type] - typeOrder[a.type]
  })

  const highPriorityCount = insights.filter(insight => insight.priority === 'high').length
  const opportunitiesCount = insights.filter(insight => insight.type === 'opportunity').length
  const positiveTrendsCount = insights.filter(insight => insight.trend === 'up').length

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              Business Insights
            </CardTitle>
            <CardDescription className="text-gray-400">
              Key metrics and recommendations
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-slate-700 text-gray-300 hover:text-white"
            onClick={onViewAll}
            asChild
          >
            <Link href="/artist/business">
              <ArrowRight className="h-4 w-4 mr-2" />
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{insights.length}</div>
            <div className="text-sm text-gray-400">Total Insights</div>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{opportunitiesCount}</div>
            <div className="text-sm text-gray-400">Opportunities</div>
          </div>
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{positiveTrendsCount}</div>
            <div className="text-sm text-gray-400">Positive Trends</div>
          </div>
        </div>

        {/* Type Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {[
            { key: 'all', label: 'All', count: insights.length },
            { key: 'revenue', label: 'Revenue', count: insights.filter(i => i.type === 'revenue').length },
            { key: 'growth', label: 'Growth', count: insights.filter(i => i.type === 'growth').length },
            { key: 'opportunity', label: 'Opportunities', count: insights.filter(i => i.type === 'opportunity').length },
            { key: 'recommendation', label: 'Tips', count: insights.filter(i => i.type === 'recommendation').length },
            { key: 'alert', label: 'Alerts', count: insights.filter(i => i.type === 'alert').length }
          ].map((type) => (
            <Button
              key={type.key}
              variant={selectedType === type.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type.key as any)}
              className={cn(
                selectedType === type.key 
                  ? "bg-yellow-600 hover:bg-yellow-700" 
                  : "border-slate-700 text-gray-300 hover:text-white"
              )}
            >
              {type.label}
              <Badge variant="secondary" className="ml-2 bg-slate-700/50 text-white">
                {type.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {sortedInsights.length > 0 ? (
            sortedInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-300 hover:border-opacity-50",
                  getTypeColor(insight.type)
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-800/50 rounded-lg">
                      {getTypeIcon(insight.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{insight.title}</h4>
                      {insight.value && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-lg font-bold text-white">{insight.value}</span>
                          {insight.change && (
                            <div className="flex items-center gap-1">
                              {getTrendIcon(insight.trend)}
                              <span className={cn(
                                "text-sm font-medium",
                                insight.trend === 'up' ? "text-green-400" : 
                                insight.trend === 'down' ? "text-red-400" : "text-gray-400"
                              )}>
                                {insight.change}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getPriorityColor(insight.priority)}>
                    {insight.priority}
                  </Badge>
                </div>
                
                <p className="text-gray-300 text-sm mb-3">{insight.description}</p>
                
                {insight.actionUrl && insight.actionText && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-slate-600 text-slate-300 hover:bg-slate-700/50"
                    asChild
                  >
                    <Link href={insight.actionUrl}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {insight.actionText}
                    </Link>
                  </Button>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <Sparkles className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No insights available at the moment.</p>
              <Button 
                className="bg-purple-600 hover:bg-purple-700"
                asChild
              >
                <Link href="/artist/business">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-6">
          <Button 
            size="sm" 
            className="bg-yellow-600 hover:bg-yellow-700 flex-1"
            asChild
          >
            <Link href="/artist/business">
              <BarChart3 className="h-4 w-4 mr-2" />
              Full Analytics
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="border-slate-700 text-gray-300 hover:text-white"
            asChild
          >
            <Link href="/artist/business">
              <Lightbulb className="h-4 w-4 mr-2" />
              Business Hub
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 