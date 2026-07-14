"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  User,
  MessageSquare,
  Calendar,
  DollarSign,
  Settings,
  ArrowRight,
  Plus,
  Zap
} from "lucide-react"
import { format, addDays, differenceInDays, isToday, isTomorrow } from "date-fns"
import Link from "next/link"
import { cn } from "@/utils"
import {
  ARTIST_CARD,
  ARTIST_ICON_WELL,
  ARTIST_INSET,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
} from "@/components/dashboard/artist-tokens"

interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  dueDate: Date
  type: 'profile' | 'collaboration' | 'payment' | 'content' | 'event' | 'business'
  status: 'pending' | 'in_progress' | 'completed'
  progress?: number
  actionUrl?: string
}

interface ActionItemsProps {
  items: ActionItem[]
  isLoading?: boolean
  onComplete?: (id: string) => void
  onViewAll?: () => void
}

export function ArtistActionItems({ 
  items, 
  isLoading = false, 
  onComplete,
  onViewAll 
}: ActionItemsProps) {
  const [selectedPriority, setSelectedPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'medium': return <Clock className="h-4 w-4 text-yellow-400" />
      case 'low': return <Bell className="h-4 w-4 text-blue-400" />
      default: return <Bell className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'profile': return <User className="h-4 w-4" />
      case 'collaboration': return <MessageSquare className="h-4 w-4" />
      case 'payment': return <DollarSign className="h-4 w-4" />
      case 'content': return <Plus className="h-4 w-4" />
      case 'event': return <Calendar className="h-4 w-4" />
      case 'business': return <Settings className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'profile': return 'bg-purple-500/20'
      case 'collaboration': return 'bg-green-500/20'
      case 'payment': return 'bg-emerald-500/20'
      case 'content': return 'bg-blue-500/20'
      case 'event': return 'bg-orange-500/20'
      case 'business': return 'bg-pink-500/20'
      default: return 'bg-gray-500/20'
    }
  }

  const getDueDateText = (date: Date) => {
    const days = differenceInDays(date, new Date())
    if (days < 0) return 'Overdue'
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    if (days < 7) return `Due in ${days} days`
    if (days < 30) return `Due in ${Math.floor(days / 7)} weeks`
    return `Due in ${Math.floor(days / 30)} months`
  }

  const getDueDateColor = (date: Date) => {
    const days = differenceInDays(date, new Date())
    if (days < 0) return 'text-red-400'
    if (days <= 1) return 'text-orange-400'
    if (days <= 3) return 'text-yellow-400'
    return 'text-gray-400'
  }

  const filteredItems = selectedPriority === 'all' 
    ? items 
    : items.filter(item => item.priority === selectedPriority)

  const sortedItems = filteredItems.sort((a, b) => {
    // Sort by priority first (high > medium > low)
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    
    // Then sort by due date (earliest first)
    return a.dueDate.getTime() - b.dueDate.getTime()
  })

  const highPriorityCount = items.filter(item => item.priority === 'high').length
  const overdueCount = items.filter(item => differenceInDays(item.dueDate, new Date()) < 0).length

  if (isLoading) {
    return (
      <Card className={ARTIST_CARD}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 tracking-tight text-white">
            <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
              <Target className="h-4 w-4" />
            </div>
            Action Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={ARTIST_CARD}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 tracking-tight text-white">
              <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
                <Target className="h-4 w-4" />
              </div>
              Action Items
            </CardTitle>
            <CardDescription className="text-slate-400">
              Tasks that need your attention
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={ARTIST_OUTLINE_BTN}
            onClick={onViewAll}
            asChild
          >
            <Link href="/artist#needs-attention">
              <ArrowRight className="mr-2 h-4 w-4" />
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-white">{items.length}</div>
            <div className="text-sm text-slate-400">Total Tasks</div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-red-400">{highPriorityCount}</div>
            <div className="text-sm text-slate-400">High Priority</div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-amber-400">{overdueCount}</div>
            <div className="text-sm text-slate-400">Overdue</div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: items.length },
            { key: 'high', label: 'High', count: items.filter(i => i.priority === 'high').length },
            { key: 'medium', label: 'Medium', count: items.filter(i => i.priority === 'medium').length },
            { key: 'low', label: 'Low', count: items.filter(i => i.priority === 'low').length }
          ].map((priority) => (
            <Button
              key={priority.key}
              variant={selectedPriority === priority.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPriority(priority.key as typeof selectedPriority)}
              className={cn(
                selectedPriority === priority.key 
                  ? ARTIST_PRIMARY_BTN
                  : ARTIST_OUTLINE_BTN
              )}
            >
              {priority.label}
              <Badge variant="secondary" className="ml-2 border-0 bg-black/40 text-white">
                {priority.count}
              </Badge>
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {sortedItems.length > 0 ? (
            sortedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(ARTIST_INSET, 'flex items-start gap-3 p-3 transition-colors hover:border-purple-500/30')}
              >
                <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 shrink-0 items-center justify-center p-1.5')}>
                  {getTypeIcon(item.type)}
                </div>
                
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white">{item.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(item.priority)}>
                        {item.priority}
                      </Badge>
                      {item.status === 'completed' && (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                  </div>
                  
                  <p className="mb-3 text-xs text-slate-400">{item.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className={cn("text-xs", getDueDateColor(item.dueDate))}>
                        {getDueDateText(item.dueDate)}
                      </span>
                      {item.progress !== undefined && (
                        <div className="flex items-center gap-2">
                          <Progress value={item.progress} className="h-2 w-20" />
                          <span className="text-xs text-slate-400">{item.progress}%</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.actionUrl ? (
                        <Button size="sm" variant="outline" className={ARTIST_OUTLINE_BTN} asChild>
                          <Link href={item.actionUrl}>
                            <Zap className="mr-1 h-3 w-3" />
                            Action
                          </Link>
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className={ARTIST_OUTLINE_BTN}
                          onClick={() => onComplete?.(item.id)}
                          disabled={item.status === 'completed'}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
              <p className="mb-4 text-slate-400">All caught up! No pending tasks.</p>
              <Button 
                className={ARTIST_PRIMARY_BTN}
                asChild
              >
                <Link href="/artist/profile">
                  <Plus className="mr-2 h-4 w-4" />
                  Review Profile
                </Link>
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button 
            size="sm" 
            className={cn(ARTIST_PRIMARY_BTN, 'flex-1')}
            asChild
          >
            <Link href="/artist/profile">
              <User className="mr-2 h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className={ARTIST_OUTLINE_BTN}
            asChild
          >
            <Link href="/artist/events">
              <Calendar className="mr-2 h-4 w-4" />
              Events
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 