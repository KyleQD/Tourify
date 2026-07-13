"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { useRouter } from "next/navigation"
import {
  Music,
  Calendar,
  Users,
  Building,
  BarChart3,
  MessageSquare,
  Share2,
  Ticket,
  Upload,
  FileText,
  Settings,
  Star,
  Zap,
  Globe,
  Heart,
  TrendingUp,
  Sparkles,
  Plus,
  ArrowRight,
  CheckCircle,
  Clock,
  Target
} from "lucide-react"

interface Feature {
  id: string
  title: string
  description: string
  icon: any
  category: 'music' | 'events' | 'social' | 'business' | 'content' | 'analytics'
  href: string
  accountTypes: ('general' | 'artist' | 'venue' | 'admin')[]
  isPro?: boolean
  isNew?: boolean
  isUsed?: boolean
  progress?: number
}

interface FeatureCategory {
  id: string
  title: string
  description: string
  icon: any
  color: string
  features: Feature[]
}

export function PlatformFeaturesHub() {
  const { accounts, currentAccount } = useMultiAccount()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [userProgress, setUserProgress] = useState({
    featuresUsed: 0,
    totalFeatures: 0,
    onboardingComplete: false
  })

  // Define all platform features
  const allFeatures: Feature[] = [
    // Music Features
    {
      id: 'music-upload',
      title: 'Music Upload',
      description: 'Upload and manage your tracks',
      icon: Upload,
      category: 'music',
      href: '/artist/music/upload',
      accountTypes: ['artist'],
      isUsed: true,
      progress: 85
    },
    {
      id: 'music-library',
      title: 'Music Library',
      description: 'Browse and organize your music',
      icon: Music,
      category: 'music',
      href: '/artist/music/library',
      accountTypes: ['artist', 'general'],
      isUsed: false
    },
    {
      id: 'music-analytics',
      title: 'Music Analytics',
      description: 'Track performance and insights',
      icon: BarChart3,
      category: 'analytics',
      href: '/artist/music/analytics',
      accountTypes: ['artist'],
      isPro: true,
      isUsed: false
    },

    // Events Features
    {
      id: 'events',
      title: 'Events',
      description: 'Create and manage your events',
      icon: Calendar,
      category: 'events',
      href: '/events',
      accountTypes: ['general', 'artist', 'venue'],
      isUsed: true,
      progress: 60
    },
    {
      id: 'event-booking',
      title: 'Event Booking',
      description: 'Manage event bookings',
      icon: Ticket,
      category: 'events',
      href: '/bookings',
      accountTypes: ['artist', 'venue'],
      isUsed: false
    },
    {
      id: 'venues',
      title: 'Venues',
      description: 'Discover and manage venues',
      icon: Building,
      category: 'events',
      href: '/venues',
      accountTypes: ['general', 'artist', 'venue'],
      isUsed: false
    },

    // Social Features
    {
      id: 'network',
      title: 'Network',
      description: 'Connect with others',
      icon: Users,
      category: 'social',
      href: '/network',
      accountTypes: ['general', 'artist', 'venue'],
      isUsed: true,
      progress: 40
    },
    {
      id: 'messaging',
      title: 'Messaging',
      description: 'Chat with your network',
      icon: MessageSquare,
      category: 'social',
      href: '/messages',
      accountTypes: ['general', 'artist', 'venue'],
      isUsed: false
    },
    {
      id: 'social-feed',
      title: 'Social Feed',
      description: 'Share and discover content',
      icon: Share2,
      category: 'social',
      href: '/community',
      accountTypes: ['general', 'artist', 'venue'],
      isUsed: true,
      progress: 75
    },

    // Content Features
    {
      id: 'epk',
      title: 'EPK Builder',
      description: 'Create your electronic press kit',
      icon: FileText,
      category: 'content',
      href: '/artist/epk',
      accountTypes: ['artist'],
      isPro: true,
      isNew: true,
      isUsed: false
    },
    {
      id: 'content-upload',
      title: 'Content Upload',
      description: 'Upload photos, videos, and documents',
      icon: Upload,
      category: 'content',
      href: '/content',
      accountTypes: ['general', 'artist', 'venue'],
      isUsed: false
    },

    // Business Features
    {
      id: 'analytics-dashboard',
      title: 'Analytics Dashboard',
      description: 'Track your performance metrics',
      icon: BarChart3,
      category: 'analytics',
      href: '/analytics',
      accountTypes: ['artist', 'venue'],
      isUsed: false
    },
    {
      id: 'team-management',
      title: 'Team Management',
      description: 'Manage your team and collaborators',
      icon: Users,
      category: 'business',
      href: '/team',
      accountTypes: ['artist', 'venue'],
      isPro: true,
      isUsed: false
    }
  ]

  // Get features relevant to user's account types
  const getRelevantFeatures = () => {
    const userAccountTypes = accounts.map(acc => acc.account_type)
    return allFeatures.filter(feature => 
      feature.accountTypes.some(type => userAccountTypes.includes(type))
    )
  }

  // Group features by category
  const getFeatureCategories = (): FeatureCategory[] => {
    const relevantFeatures = getRelevantFeatures()
    
    const categories = [
      {
        id: 'music',
        title: 'Music',
        description: 'Create, upload, and manage your music',
        icon: Music,
        color: 'from-purple-500 to-pink-500',
        features: relevantFeatures.filter(f => f.category === 'music')
      },
      {
        id: 'events',
        title: 'Events',
        description: 'Organize and manage events',
        icon: Calendar,
        color: 'from-blue-500 to-cyan-500',
        features: relevantFeatures.filter(f => f.category === 'events')
      },
      {
        id: 'social',
        title: 'Social',
        description: 'Connect and engage with your community',
        icon: Users,
        color: 'from-green-500 to-emerald-500',
        features: relevantFeatures.filter(f => f.category === 'social')
      },
      {
        id: 'content',
        title: 'Content',
        description: 'Create and manage your content',
        icon: FileText,
        color: 'from-orange-500 to-red-500',
        features: relevantFeatures.filter(f => f.category === 'content')
      },
      {
        id: 'analytics',
        title: 'Analytics',
        description: 'Track performance and insights',
        icon: BarChart3,
        color: 'from-indigo-500 to-purple-500',
        features: relevantFeatures.filter(f => f.category === 'analytics')
      },
      {
        id: 'business',
        title: 'Business',
        description: 'Professional tools and features',
        icon: Building,
        color: 'from-amber-500 to-orange-500',
        features: relevantFeatures.filter(f => f.category === 'business')
      }
    ].filter(category => category.features.length > 0)

    return categories
  }

  useEffect(() => {
    const relevantFeatures = getRelevantFeatures()
    const usedFeatures = relevantFeatures.filter(f => f.isUsed).length
    
    setUserProgress({
      featuresUsed: usedFeatures,
      totalFeatures: relevantFeatures.length,
      onboardingComplete: usedFeatures >= 3
    })
  }, [accounts])

  const categories = getFeatureCategories()

  const handleFeatureClick = (feature: Feature) => {
    router.push(feature.href)
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-blue-500'
  }

  return (
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400" />
              Platform Features
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              Explore all the tools available to you
            </p>
          </div>
          <div className="text-right">
            <div className="text-white font-medium">
              {userProgress.featuresUsed}/{userProgress.totalFeatures}
            </div>
            <div className="text-gray-400 text-xs">Features Used</div>
          </div>
        </div>
        
        {/* Progress Overview */}
        <div className="mt-4 p-4 rounded-lg bg-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Platform Mastery</span>
            <span className="text-sm text-purple-300">
              {Math.round((userProgress.featuresUsed / userProgress.totalFeatures) * 100)}%
            </span>
          </div>
          <Progress 
            value={(userProgress.featuresUsed / userProgress.totalFeatures) * 100} 
            className="h-2 bg-white/10"
          />
          <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
            <span>Getting Started</span>
            <span>Expert</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Category Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {categories.map((category) => {
            const usedInCategory = category.features.filter(f => f.isUsed).length
            const totalInCategory = category.features.length
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(
                  selectedCategory === category.id ? null : category.id
                )}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-white/15 border-purple-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <category.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-medium text-white text-sm">{category.title}</h3>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{category.description}</p>
                <div className="flex items-center justify-center mt-2">
                  <div className="text-xs text-purple-300">
                    {usedInCategory}/{totalInCategory}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Category Features */}
        {selectedCategory && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">
                {categories.find(c => c.id === selectedCategory)?.title} Features
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCategory(null)}
                className="text-gray-400 hover:text-white"
              >
                Show All
              </Button>
            </div>
            
            <div className="grid gap-3">
              {categories
                .find(c => c.id === selectedCategory)
                ?.features.map((feature) => (
                  <div
                    key={feature.id}
                    onClick={() => handleFeatureClick(feature)}
                    className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <feature.icon className="h-5 w-5 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-white text-sm">{feature.title}</h4>
                            <p className="text-gray-400 text-xs mt-1">{feature.description}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            {feature.isNew && (
                              <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                New
                              </Badge>
                            )}
                            {feature.isPro && (
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                Pro
                              </Badge>
                            )}
                            {feature.isUsed && (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            )}
                          </div>
                        </div>
                        
                        {feature.progress !== undefined && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-400">Progress</span>
                              <span className="text-xs text-purple-300">{feature.progress}%</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${getProgressColor(feature.progress)}`}
                                style={{ width: `${feature.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {!selectedCategory && (
          <div className="space-y-4">
            <h3 className="font-medium text-white">Quick Start</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getRelevantFeatures()
                .filter(f => !f.isUsed)
                .slice(0, 4)
                .map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => handleFeatureClick(feature)}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                        <feature.icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm">{feature.title}</h4>
                        <p className="text-gray-400 text-xs">{feature.description}</p>
                      </div>
                      <Plus className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Next Goal</span>
            </div>
            {userProgress.onboardingComplete ? (
              <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Onboarding Complete
              </Badge>
            ) : (
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                <Clock className="h-3 w-3 mr-1" />
                {3 - userProgress.featuresUsed} more to complete
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 
