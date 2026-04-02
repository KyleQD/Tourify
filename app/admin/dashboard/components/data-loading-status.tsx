"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Database, 
  Wifi, 
  WifiOff,
  Info,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  Eye,
  EyeOff,
  Download,
  Upload,
  Server,
  HardDrive,
  Network,
  Signal,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero
} from "lucide-react"
import { useDataValidation, validationRules } from "../hooks/use-data-validation"
import { useDataMonitoring } from "../hooks/use-data-validation"

interface DataLoadingStatusProps {
  data: any
  dataType: 'dashboardStats' | 'tour' | 'event' | 'artist' | 'venue'
  isLoading: boolean
  error: string | null
  onRetry?: () => void
  onRefresh?: () => void
  showDetails?: boolean
  className?: string
}

interface DataSourceStatus {
  name: string
  status: 'online' | 'offline' | 'degraded' | 'loading'
  latency: number
  lastUpdate: number
  errorRate: number
  dataQuality: number
}

const STATIC_HEALTH_SOURCES: DataSourceStatus[] = [
  {
    name: 'API Server',
    status: 'online',
    latency: 0,
    lastUpdate: 0,
    errorRate: 0,
    dataQuality: 100
  },
  {
    name: 'Database',
    status: 'online',
    latency: 0,
    lastUpdate: 0,
    errorRate: 0,
    dataQuality: 100
  },
  {
    name: 'Cache',
    status: 'online',
    latency: 0,
    lastUpdate: 0,
    errorRate: 0,
    dataQuality: 100
  }
]

export default function DataLoadingStatus({
  data,
  dataType,
  isLoading,
  error,
  onRetry,
  onRefresh,
  showDetails = false,
  className = ""
}: DataLoadingStatusProps) {
  const [isExpanded, setIsExpanded] = useState(showDetails)
  const dataSources = STATIC_HEALTH_SOURCES

  // Data validation
  const validationConfig = {
    rules: validationRules[dataType] || [],
    retryAttempts: 3,
    retryDelay: 1000,
    validateOnMount: true,
    showNotifications: false
  }

  const { validationResult, isValidating, retryCount, retryValidation } = useDataValidation(data, validationConfig)

  // Data monitoring
  const { isDataStale, getDataAge, getDataChangeRate } = useDataMonitoring(data)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400'
      case 'offline': return 'text-red-400'
      case 'degraded': return 'text-yellow-400'
      case 'loading': return 'text-blue-400'
      default: return 'text-slate-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4" />
      case 'offline': return <XCircle className="h-4 w-4" />
      case 'degraded': return <AlertCircle className="h-4 w-4" />
      case 'loading': return <RefreshCw className="h-4 w-4 animate-spin" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getSignalIcon = (quality: number) => {
    if (quality >= 90) return <SignalHigh className="h-4 w-4 text-green-400" />
    if (quality >= 70) return <SignalMedium className="h-4 w-4 text-yellow-400" />
    if (quality >= 50) return <SignalLow className="h-4 w-4 text-orange-400" />
    return <SignalZero className="h-4 w-4 text-red-400" />
  }

  const getDataAgeText = () => {
    const age = getDataAge()
    if (age < 60000) return `${Math.floor(age / 1000)}s ago`
    if (age < 3600000) return `${Math.floor(age / 60000)}m ago`
    return `${Math.floor(age / 3600000)}h ago`
  }

  const overallStatus = isLoading ? 'loading' : 
    error ? 'offline' : 
    validationResult.isValid ? 'online' : 'degraded'

  const overallQuality = dataSources.reduce((sum, source) => sum + source.dataQuality, 0) / dataSources.length

  return (
    <Card className={`bg-slate-900/50 border-slate-700/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${getStatusColor(overallStatus)}`}>
              {getStatusIcon(overallStatus)}
            </div>
            <div>
              <CardTitle className="text-white text-lg">Data Status</CardTitle>
              <p className="text-sm text-slate-400">
                {isLoading ? 'Loading data...' : 
                 error ? 'Error loading data' : 
                 validationResult.isValid ? 'Data loaded successfully' : 'Data validation issues'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${
              overallStatus === 'online' ? 'bg-green-500/20 text-green-400' :
              overallStatus === 'offline' ? 'bg-red-500/20 text-red-400' :
              overallStatus === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              {getSignalIcon(overallQuality)}
              <span className="text-sm font-medium text-white">{overallQuality.toFixed(0)}%</span>
            </div>
            <p className="text-xs text-slate-400">Data Quality</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Activity className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white">{getDataAgeText()}</span>
            </div>
            <p className="text-xs text-slate-400">Last Update</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Zap className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-white">{getDataChangeRate().toFixed(1)}</span>
            </div>
            <p className="text-xs text-slate-400">Changes/min</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Shield className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white">{validationResult.dataQuality}%</span>
            </div>
            <p className="text-xs text-slate-400">Validation</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
            <div className="mt-2 flex space-x-2">
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              {onRefresh && (
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Validation Issues */}
        {!validationResult.isValid && validationResult.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-300">Data Validation Issues</span>
            </div>
            <div className="space-y-1">
              {validationResult.errors.slice(0, 3).map((error, index) => (
                <p key={index} className="text-xs text-yellow-200">{error}</p>
              ))}
              {validationResult.errors.length > 3 && (
                <p className="text-xs text-yellow-300">+{validationResult.errors.length - 3} more errors</p>
              )}
            </div>
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={retryValidation}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Revalidate
              </Button>
            </div>
          </motion.div>
        )}

        {/* Data Stale Warning */}
        {isDataStale && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <span className="text-sm text-orange-300">Data may be stale</span>
            </div>
          </motion.div>
        )}

        {/* Detailed View */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Data Sources */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Data Sources</h4>
                <div className="space-y-2">
                  {dataSources.map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(source.status)}
                        <span className="text-sm text-white">{source.name}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-slate-400">
                        <span>{source.latency.toFixed(0)}ms</span>
                        <span>{source.errorRate.toFixed(1)}%</span>
                        <span>{source.dataQuality}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Validation Details */}
              {validationResult.warnings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Warnings</h4>
                  <div className="space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <p key={index} className="text-xs text-yellow-300">{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              <div>
                <h4 className="text-sm font-medium text-white mb-3">Performance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Data Quality</p>
                    <Progress value={validationResult.dataQuality} className="h-2" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-1">System Health</p>
                    <Progress value={overallQuality} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Retry Information */}
              {retryCount > 0 && (
                <div className="text-xs text-slate-400">
                  Retry attempts: {retryCount}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
              <span className="text-sm text-slate-400">Loading data...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Hook for using data loading status
export function useDataLoadingStatus(
  data: any,
  dataType: string,
  isLoading: boolean,
  error: string | null
) {
  const [showStatus, setShowStatus] = useState(false)
  const [autoHide, setAutoHide] = useState(true)

  useEffect(() => {
    if (error || !isLoading) {
      setShowStatus(true)
      if (autoHide && !error) {
        const timer = setTimeout(() => setShowStatus(false), 5000)
        return () => clearTimeout(timer)
      }
    }
  }, [error, isLoading, autoHide])

  return {
    showStatus,
    setShowStatus,
    autoHide,
    setAutoHide
  }
} 