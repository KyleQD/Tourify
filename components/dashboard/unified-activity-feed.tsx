"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMultiAccount } from "@/hooks/use-multi-account"
import { DashboardService, DashboardActivity } from "@/lib/services/dashboard.service"
import { 
  Music, 
  Building, 
  User, 
  Settings, 
  Calendar,
  Users,
  DollarSign,
  MessageSquare,
  Heart,
  Eye,
  Share,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  Filter,
  Zap,
  Bell
} from "lucide-react"

interface ActivityItem {
  id: string
  accountId: string
  accountType: string
  accountName: string
  type: 'booking' | 'message' | 'follower' | 'event' | 'revenue' | 'engagement' | 'system'
  title: string
  description: string
  timestamp: string
  priority: 'low' | 'medium' | 'high'
  actionRequired: boolean
  value?: number
  icon: any
}

export function UnifiedActivityFeed() {
  const { accounts, currentAccount } = useMultiAccount()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    const loadActivities = async () => {
      try {
        if (!currentAccount?.profile_id) return
        
        // Get real activities from the dashboard service
        const realActivities = await DashboardService.getDashboardActivity(currentAccount.profile_id)
        
        // Transform to ActivityItem format
        const transformedActivities: ActivityItem[] = realActivities.map(activity => ({
          id: activity.id,
          accountId: activity.accountId,
          accountType: activity.accountType,
          accountName: activity.accountName,
          type: activity.type,
          title: activity.title,
          description: activity.description,
          timestamp: activity.timestamp,
          priority: activity.priority,
          actionRequired: activity.actionRequired,
          value: activity.value,
          icon: getActivityIcon(activity.type)
        }))
        
        setActivities(transformedActivities)
        setFilteredActivities(transformedActivities)
        setIsLoading(false)
      } catch (error) {
        console.error('Error loading activities:', error)
        setIsLoading(false)
      }
    }

    loadActivities()
    }, [currentAccount])

  // Helper function to get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return Calendar
      case 'message':
        return MessageSquare
      case 'follower':
        return Users
      case 'event':
        return Calendar
      case 'revenue':
        return DollarSign
      case 'engagement':
        return TrendingUp
      case 'system':
        return Settings
      default:
        return Bell
    }
  }

  useEffect(() => {
    let filtered = activities

    // Filter by account
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(activity => activity.accountId === selectedAccount)
    }

    // Filter by priority
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(activity => activity.priority === selectedPriority)
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(activity => activity.type === selectedType)
    }

    // Sort by priority and timestamp
    filtered.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // If same priority, sort by timestamp (newer first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    setFilteredActivities(filtered)
  }, [activities, selectedAccount, selectedPriority, selectedType])

  const getAccountIcon = (accountType: string) => {
    switch (accountType) {
      case 'artist':
        return Music
      case 'venue':
        return Building
      case 'admin':
        return Settings
      default:
        return User
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-300 border-red-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'low':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking':
        return 'from-blue-500 to-cyan-500'
      case 'message':
        return 'from-purple-500 to-pink-500'
      case 'follower':
        return 'from-green-500 to-emerald-500'
      case 'revenue':
        return 'from-yellow-500 to-orange-500'
      case 'engagement':
        return 'from-indigo-500 to-purple-500'
      case 'system':
        return 'from-gray-500 to-slate-500'
      default:
        return 'from-gray-500 to-slate-500'
    }
  }

  const urgentCount = activities.filter(a => a.actionRequired).length
  const totalActivities = activities.length

  if (isLoading) {
    return (
      <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-white/10 rounded-xl"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="h-5 w-5 text-purple-400" />
            Activity Feed
          </CardTitle>
          <div className="flex items-center space-x-2">
            {urgentCount > 0 && (
              <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {urgentCount} urgent
              </Badge>
            )}
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {totalActivities} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex items-center space-x-3 mb-6">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(account => (
                <SelectItem key={account.profile_id} value={account.profile_id}>
                  {account.profile_data?.name || account.account_type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-32 bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="booking">Bookings</SelectItem>
              <SelectItem value="message">Messages</SelectItem>
              <SelectItem value="follower">Followers</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Activity List */}
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No activities found with current filters</p>
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const AccountIcon = getAccountIcon(activity.accountType)
                const typeColor = getTypeColor(activity.type)
                
                return (
                  <div
                    key={activity.id}
                    className={`p-4 rounded-2xl transition-all duration-300 group ${
                      activity.actionRequired 
                        ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Activity Icon */}
                      <div className="relative">
                        <div className={`w-10 h-10 bg-gradient-to-br ${typeColor} rounded-xl flex items-center justify-center`}>
                          <activity.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-slate-800 rounded-full flex items-center justify-center border border-white/20">
                          <AccountIcon className="h-2 w-2 text-purple-400" />
                        </div>
                      </div>
                      
                      {/* Activity Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h4 className="font-medium text-white text-sm">{activity.title}</h4>
                            <p className="text-gray-400 text-xs">{activity.accountName}</p>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {activity.actionRequired && (
                              <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                                <Zap className="h-2 w-2 mr-1" />
                                Action Required
                              </Badge>
                            )}
                            
                            <Badge className={getPriorityColor(activity.priority)}>
                              {activity.priority}
                            </Badge>
                          </div>
                        </div>
                        
                        <p className="text-gray-300 text-sm mb-2">{activity.description}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-xs text-gray-400">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {activity.timestamp}
                            </span>
                            {activity.value && (
                              <span className="flex items-center">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                {activity.value.toLocaleString()}
                              </span>
                            )}
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
} 