'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  TrendingUp,
  Sparkles,
  Music2,
  Calendar,
  Video,
  MapPin,
  FileText,
  ArrowRight,
  Clock,
  Users,
  Star,
  Heart
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface Recommendation {
  id: string
  type: 'music' | 'event' | 'video' | 'tour' | 'news' | 'blog'
  title: string
  description: string
  reason: string
  relevance: number
  author?: {
    name: string
    username: string
    avatar_url?: string
    is_verified: boolean
  }
  metadata?: {
    genre?: string
    date?: string
    location?: string
    duration?: number
  }
}

interface ContentRecommendationsProps {
  className?: string
}

export function ContentRecommendations({ className }: ContentRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      loadRecommendations()
    }
  }, [user])

  const loadRecommendations = async () => {
    try {
      setLoading(true)

      // In a real implementation, this would call an API for personalized recommendations
      // For now, we'll use mock data
      const mockRecommendations: Recommendation[] = [
        {
          id: 'rec1',
          type: 'music',
          title: 'New Indie Rock Discovery',
          description: 'Based on your love for alternative music',
          reason: 'Similar to artists you follow',
          relevance: 0.95,
          author: {
            name: 'The Midnight Collective',
            username: 'midnightcollective',
            avatar_url: 'https://dummyimage.com/40x40/6366f1/ffffff?text=MC',
            is_verified: false
          },
          metadata: {
            genre: 'Indie Rock'
          }
        },
        {
          id: 'rec2',
          type: 'event',
          title: 'Local Music Festival',
          description: 'Happening near you this weekend',
          reason: 'Near your location',
          relevance: 0.88,
          metadata: {
            date: '2024-01-20',
            location: 'Downtown Music Hall'
          }
        },
        {
          id: 'rec3',
          type: 'video',
          title: 'Studio Session Behind the Scenes',
          description: 'Exclusive content from artists you follow',
          reason: 'From followed artists',
          relevance: 0.92,
          author: {
            name: 'Luna Echo',
            username: 'lunaecho',
            avatar_url: 'https://dummyimage.com/40x40/10b981/ffffff?text=LE',
            is_verified: true
          },
          metadata: {
            duration: 480
          }
        },
        {
          id: 'rec4',
          type: 'blog',
          title: 'Music Production Tips',
          description: 'Industry insights for independent artists',
          reason: 'Matches your interests',
          relevance: 0.85,
          author: {
            name: 'Music Industry Weekly',
            username: 'musicindustryweekly',
            avatar_url: 'https://dummyimage.com/40x40/ef4444/ffffff?text=MI',
            is_verified: true
          }
        }
      ]

      setRecommendations(mockRecommendations)
    } catch (error) {
      console.error('Error loading recommendations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music2 className="h-3 w-3 md:h-4 md:w-4" />
      case 'event': return <Calendar className="h-3 w-3 md:h-4 md:w-4" />
      case 'video': return <Video className="h-3 w-3 md:h-4 md:w-4" />
      case 'tour': return <MapPin className="h-3 w-3 md:h-4 md:w-4" />
      case 'news': return <FileText className="h-3 w-3 md:h-4 md:w-4" />
      case 'blog': return <FileText className="h-3 w-3 md:h-4 md:w-4" />
      default: return <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
    }
  }

  // Enhanced color coding system matching the main News component
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'music': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
      case 'event': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
      case 'video': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
      case 'tour': return 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white'
      case 'news': return 'bg-gradient-to-r from-red-500 to-pink-500 text-white'
      case 'blog': return 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
      default: return 'bg-gradient-to-r from-gray-500 to-slate-500 text-white'
    }
  }

  // Color coding for recommendation cards - subtle border colors
  const getRecommendationCardBorder = (type: string) => {
    switch (type) {
      case 'music': return 'hover:border-purple-500/30'
      case 'event': return 'hover:border-green-500/30'
      case 'video': return 'hover:border-blue-500/30'
      case 'tour': return 'hover:border-orange-500/30'
      case 'news': return 'hover:border-red-500/30'
      case 'blog': return 'hover:border-indigo-500/30'
      default: return 'hover:border-purple-500/30'
    }
  }

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 0.9) return 'text-green-400'
    if (relevance >= 0.7) return 'text-blue-400'
    return 'text-gray-400'
  }

  if (loading) {
    return (
      <Card className={`bg-slate-900/50 border-slate-700/50 backdrop-blur-sm shadow-xl ${className}`}>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-white flex items-center gap-2">
            <div className="h-4 w-4 md:h-5 md:w-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded animate-pulse"></div>
            <span className="bg-slate-800 h-5 w-24 md:w-32 rounded animate-pulse"></span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="h-3 md:h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-2 md:h-3 bg-slate-800 rounded w-1/2"></div>
                <div className="h-2 md:h-3 bg-slate-800 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 backdrop-blur-sm shadow-xl ${className}`}>
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="text-white flex items-center gap-2 text-sm md:text-base">
          <div className="h-4 w-4 md:h-5 md:w-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <Sparkles className="h-2 w-2 md:h-3 md:w-3 text-white" />
          </div>
          Recommended for You
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <div className={`flex items-start gap-2 md:gap-3 p-3 md:p-4 rounded-lg hover:bg-gradient-to-r hover:from-slate-800/50 hover:to-purple-900/20 transition-all duration-300 border border-transparent ${getRecommendationCardBorder(rec.type)}`}>
              <div className="flex-shrink-0">
                <Badge className={`${getTypeColor(rec.type)} shadow-lg text-xs`}>
                  {getTypeIcon(rec.type)}
                </Badge>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-white text-xs md:text-sm group-hover:text-purple-300 transition-colors line-clamp-1">
                    {rec.title}
                  </h4>
                  <div className={`text-xs font-medium ${getRelevanceColor(rec.relevance)} flex-shrink-0`}>
                    {Math.round(rec.relevance * 100)}% match
                  </div>
                </div>

                <p className="text-slate-400 text-xs mb-2 md:mb-3 line-clamp-2 leading-relaxed">
                  {rec.description}
                </p>

                <div className="flex items-center gap-2 md:gap-3 text-slate-500 text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    <span className="truncate max-w-20 md:max-w-24">{rec.reason}</span>
                  </div>

                  {rec.metadata?.genre && (
                    <div className="flex items-center gap-1">
                      <Music2 className="h-3 w-3" />
                      <span className="truncate max-w-16 md:max-w-20">{rec.metadata.genre}</span>
                    </div>
                  )}

                  {rec.metadata?.date && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="truncate max-w-16 md:max-w-20">{formatSafeDate(rec.metadata.date)}</span>
                    </div>
                  )}

                  {rec.metadata?.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-16 md:max-w-20">{rec.metadata.location}</span>
                    </div>
                  )}
                </div>

                {rec.author && (
                  <div className="flex items-center gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-700/30">
                    <Avatar className="h-5 w-5 md:h-6 md:w-6 ring-1 ring-purple-500/30 flex-shrink-0">
                      <AvatarImage src={rec.author.avatar_url} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                        {rec.author.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-slate-400 text-xs font-medium truncate flex-1">
                      {rec.author.name}
                    </span>
                    {rec.author.is_verified && (
                      <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-1 h-1 md:w-1.5 md:h-1.5 text-white" />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <ArrowRight className="h-3 w-3 md:h-4 md:w-4 text-slate-400 group-hover:text-purple-400 transition-colors flex-shrink-0" />
            </div>
          </motion.div>
        ))}

        <div className="pt-3 md:pt-4 border-t border-slate-700/30">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-slate-600/50 text-slate-300 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-300 text-xs md:text-sm"
            onClick={() => window.location.href = '/feed'}
          >
            <Sparkles className="h-3 w-3 md:h-4 md:w-4 mr-2" />
            View All Recommendations
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 