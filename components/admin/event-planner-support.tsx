"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle,
  Star,
  TrendingUp,
  BarChart3,
  Target,
  Zap
} from "lucide-react"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"

// Event Status Badge Component
export function EventStatusBadge({ status }: { status: string }) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "draft":
        return { color: "bg-gray-500", text: "Draft" }
      case "review":
        return { color: "bg-yellow-500", text: "In Review" }
      case "published":
        return { color: "bg-green-500", text: "Published" }
      default:
        return { color: "bg-gray-500", text: status }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge className={`${config.color} text-white`}>
      {config.text}
    </Badge>
  )
}

// Progress Indicator Component
export function StepProgressIndicator({ 
  currentStep, 
  totalSteps, 
  stepTitles 
}: { 
  currentStep: number
  totalSteps: number
  stepTitles: string[]
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-slate-400">
          {Math.round((currentStep / totalSteps) * 100)}% Complete
        </span>
      </div>
      <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
      <div className="text-sm text-slate-400">
        {stepTitles[currentStep - 1]}
      </div>
    </div>
  )
}

// Event Stats Card Component
export function EventStatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue 
}: { 
  title: string
  value: string | number
  icon: any
  trend?: "up" | "down" | "neutral"
  trendValue?: string
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center mt-1">
                <TrendingUp 
                  className={`h-3 w-3 mr-1 ${
                    trend === "up" ? "text-green-400" : 
                    trend === "down" ? "text-red-400" : "text-slate-400"
                  }`} 
                />
                <span className={`text-xs ${
                  trend === "up" ? "text-green-400" : 
                  trend === "down" ? "text-red-400" : "text-slate-400"
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-slate-700/50">
            <Icon className="h-5 w-5 text-slate-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Team Member Avatar Component
export function TeamMemberAvatar({ 
  member 
}: { 
  member: {
    name: string
    email: string
    role: string
    avatar?: string
  }
}) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
      <Avatar className="h-10 w-10">
        <AvatarImage src={member.avatar} alt={member.name} />
        <AvatarFallback className="bg-slate-700 text-white">
          {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{member.name}</p>
        <p className="text-xs text-slate-400 truncate">{member.role}</p>
      </div>
    </div>
  )
}

// Checklist Item Component
export function ChecklistItem({ 
  item, 
  onToggle 
}: { 
  item: {
    id: string
    text: string
    completed: boolean
    required: boolean
  }
  onToggle: (id: string) => void
}) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700">
      <button
        onClick={() => onToggle(item.id)}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.completed 
            ? "bg-green-500 border-green-500" 
            : "border-slate-600 hover:border-slate-500"
        }`}
      >
        {item.completed && <CheckCircle className="h-3 w-3 text-white" />}
      </button>
      <div className="flex-1">
        <p className={`text-sm ${item.completed ? "text-slate-400 line-through" : "text-white"}`}>
          {item.text}
        </p>
        {item.required && (
          <Badge variant="destructive" className="text-xs mt-1">
            Required
          </Badge>
        )}
      </div>
    </div>
  )
}

// Budget Category Card Component
export function BudgetCategoryCard({ 
  category, 
  onUpdate 
}: { 
  category: {
    name: string
    allocated: number
    spent: number
  }
  onUpdate: (updates: any) => void
}) {
  const remaining = category.allocated - category.spent
  const percentage = (category.spent / category.allocated) * 100

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">{category.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Spent</span>
          <span className="text-white">{formatSafeCurrency(category.spent)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Allocated</span>
          <span className="text-white">{formatSafeCurrency(category.allocated)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Remaining</span>
          <span className={`${remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatSafeCurrency(remaining)}
          </span>
        </div>
        <Progress 
          value={percentage} 
          className="h-2" 
          style={{
            backgroundColor: "rgb(51 65 85)",
            "--progress-background": percentage > 100 ? "#ef4444" : "#10b981"
          } as any}
        />
      </CardContent>
    </Card>
  )
}

// Campaign Metrics Component
export function CampaignMetrics({ 
  metrics 
}: { 
  metrics: {
    reach: number
    engagement: number
    clicks: number
    conversions: number
  }
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="text-center p-3 rounded-lg bg-slate-800/30 border border-slate-700">
        <div className="text-2xl font-bold text-blue-400">{formatSafeNumber(metrics.reach)}</div>
        <div className="text-xs text-slate-400">Reach</div>
      </div>
      <div className="text-center p-3 rounded-lg bg-slate-800/30 border border-slate-700">
        <div className="text-2xl font-bold text-green-400">{formatSafeNumber(metrics.engagement)}</div>
        <div className="text-xs text-slate-400">Engagement</div>
      </div>
      <div className="text-center p-3 rounded-lg bg-slate-800/30 border border-slate-700">
        <div className="text-2xl font-bold text-yellow-400">{formatSafeNumber(metrics.clicks)}</div>
        <div className="text-xs text-slate-400">Clicks</div>
      </div>
      <div className="text-center p-3 rounded-lg bg-slate-800/30 border border-slate-700">
        <div className="text-2xl font-bold text-purple-400">{formatSafeNumber(metrics.conversions)}</div>
        <div className="text-xs text-slate-400">Conversions</div>
      </div>
    </div>
  )
}

// Loading State Component
export function EventPlannerLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-slate-400">Loading event planner...</p>
      </div>
    </div>
  )
}

// Empty State Component
export function EventPlannerEmpty({ 
  title, 
  description, 
  actionText, 
  onAction 
}: { 
  title: string
  description: string
  actionText: string
  onAction: () => void
}) {
  return (
    <div className="text-center py-12">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-20 animate-pulse"></div>
        <Calendar className="relative h-16 w-16 mx-auto text-purple-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 mb-6 max-w-md mx-auto">{description}</p>
      <Button onClick={onAction} className="bg-gradient-to-r from-purple-600 to-blue-600">
        {actionText}
      </Button>
    </div>
  )
} 