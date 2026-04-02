"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react"
import { themeUtils } from "../utils/theme-utils"

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
  variant?: 'primary' | 'secondary' | 'accent'
  progress?: number
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
  isLoading?: boolean
  lastUpdated?: Date
  onClick?: () => void
  className?: string
}

export function EnhancedMetricCard({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  subtitle,
  variant = 'primary',
  progress,
  status = 'neutral',
  isLoading = false,
  lastUpdated,
  onClick,
  className
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-400" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-400" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-400" />
      case 'info':
        return <Clock className="h-4 w-4 text-blue-400" />
      default:
        return null
    }
  }

  const getIconGradient = () => {
    switch (variant) {
      case 'primary':
        return 'from-red-500 to-pink-600'
      case 'secondary':
        return 'from-purple-500 to-indigo-600'
      case 'accent':
        return 'from-cyan-500 to-blue-600'
      default:
        return 'from-red-500 to-pink-600'
    }
  }

  return (
    <div onClick={onClick} className={`cursor-pointer ${className || ''}`}>
      <Card className={themeUtils.getMetricCardClasses(variant)}>
        <CardContent className="p-6">
          {/* Header with Icon and Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl bg-gradient-to-r ${getIconGradient()}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon()}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
                  {getTrendIcon()}
                  <span className="font-medium">{Math.abs(change)}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-3">
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {isLoading ? (
                  <div className="h-8 w-20 rounded bg-slate-700" />
                ) : (
                  value
                )}
              </h3>
              <p className="text-gray-400 text-sm font-medium">{title}</p>
            </div>

            {/* Subtitle */}
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}

            {/* Progress Bar */}
            {progress !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-medium">{Math.round(progress)}%</span>
                </div>
                <div className="admin-progress-enhanced">
                  <Progress 
                    value={progress} 
                    className="h-2 bg-slate-700"
                  />
                </div>
              </div>
            )}

            {/* Last Updated */}
            {lastUpdated && (
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last updated</span>
                <span>{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(lastUpdated)}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Specialized Metric Card Variants
export function RevenueMetricCard(props: Omit<MetricCardProps, 'icon'>) {
  return (
    <EnhancedMetricCard
      {...props}
      icon={({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )}
      variant="primary"
    />
  )
}

export function TeamMetricCard(props: Omit<MetricCardProps, 'icon'>) {
  return (
    <EnhancedMetricCard
      {...props}
      icon={({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )}
      variant="secondary"
    />
  )
}

export function PerformanceMetricCard(props: Omit<MetricCardProps, 'icon'>) {
  return (
    <EnhancedMetricCard
      {...props}
      icon={({ className }) => (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )}
      variant="accent"
    />
  )
}

export default EnhancedMetricCard 