"use client"

import { useEffect, useRef, useCallback, useState, useMemo } from "react"

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  cpuUsage: number
  networkLatency: number
  bundleSize: number
  cacheHitRate: number
  errorRate: number
}

interface PerformanceThresholds {
  renderTime?: number // milliseconds
  memoryUsage?: number // MB
  cpuUsage?: number // percentage
  networkLatency?: number // milliseconds
  errorRate?: number // percentage
}

interface PerformanceMonitorOptions {
  thresholds?: PerformanceThresholds
  onThresholdExceeded?: (metric: string, value: number) => void
  onError?: (error: Error) => void
  enabled?: boolean
  interval?: number // milliseconds
}

interface PerformanceState {
  metrics: PerformanceMetrics
  isMonitoring: boolean
  lastUpdate: Date | null
  errors: Error[]
}

function buildNoStoreInit(input?: RequestInit): RequestInit {
  return {
    cache: 'no-store',
    ...input,
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      ...(input?.headers || {}),
    },
  }
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    thresholds = {
      renderTime: 100,
      memoryUsage: 100,
      cpuUsage: 80,
      networkLatency: 1000,
      errorRate: 5
    },
    onThresholdExceeded,
    onError,
    enabled = true,
    interval = 5000
  } = options

  const [state, setState] = useState<PerformanceState>({
    metrics: {
      renderTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      bundleSize: 0,
      cacheHitRate: 0,
      errorRate: 0
    },
    isMonitoring: false,
    lastUpdate: null,
    errors: []
  })

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const renderStartTime = useRef<number>(0)
  const errorCount = useRef<number>(0)
  const requestCount = useRef<number>(0)
  const cacheHitCount = useRef<number>(0)

  // Memoize thresholds to prevent unnecessary re-renders
  const memoizedThresholds = useMemo(() => thresholds, [
    thresholds.renderTime,
    thresholds.memoryUsage,
    thresholds.cpuUsage,
    thresholds.networkLatency,
    thresholds.errorRate
  ])

  // Memoize callbacks to prevent infinite loops
  const memoizedOnThresholdExceeded = useCallback(onThresholdExceeded || (() => {}), [onThresholdExceeded])
  const memoizedOnError = useCallback(onError || (() => {}), [onError])

  // Measure render time
  const startRenderTimer = useCallback(() => {
    renderStartTime.current = performance.now()
  }, [])

  const endRenderTimer = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current
    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        renderTime
      }
    }))

    if (memoizedThresholds.renderTime && renderTime > memoizedThresholds.renderTime) {
      memoizedOnThresholdExceeded('renderTime', renderTime)
    }
  }, [memoizedThresholds.renderTime, memoizedOnThresholdExceeded])

  // Measure memory usage
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // Convert to MB
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          memoryUsage
        }
      }))

      if (memoizedThresholds.memoryUsage && memoryUsage > memoizedThresholds.memoryUsage) {
        memoizedOnThresholdExceeded('memoryUsage', memoryUsage)
      }
    }
  }, [memoizedThresholds.memoryUsage, memoizedOnThresholdExceeded])

  // Measure CPU usage (approximation)
  const measureCpuUsage = useCallback(() => {
    // This is a simplified CPU measurement
    // In a real implementation, you might use Web Workers or other techniques
    const startTime = performance.now()
    let iterations = 0
    
    // Simple CPU-intensive task to measure
    while (performance.now() - startTime < 10) {
      iterations++
    }
    
    const cpuUsage = Math.min(100, (iterations / 1000) * 100)
    
    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        cpuUsage
      }
    }))

    if (memoizedThresholds.cpuUsage && cpuUsage > memoizedThresholds.cpuUsage) {
      memoizedOnThresholdExceeded('cpuUsage', cpuUsage)
    }
  }, [memoizedThresholds.cpuUsage, memoizedOnThresholdExceeded])

  // Measure network latency
  const measureNetworkLatency = useCallback(async () => {
    const startTime = performance.now()
    
    try {
      await fetch('/api/health', buildNoStoreInit({ method: 'HEAD' }))
      const latency = performance.now() - startTime
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          networkLatency: latency
        }
      }))

      if (memoizedThresholds.networkLatency && latency > memoizedThresholds.networkLatency) {
        memoizedOnThresholdExceeded('networkLatency', latency)
      }
    } catch (error) {
      console.warn('Failed to measure network latency:', error)
    }
  }, [memoizedThresholds.networkLatency, memoizedOnThresholdExceeded])

  // Track cache hit rate
  const trackCacheHit = useCallback((hit: boolean) => {
    requestCount.current++
    if (hit) {
      cacheHitCount.current++
    }
    
    const cacheHitRate = (cacheHitCount.current / requestCount.current) * 100
    
    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        cacheHitRate
      }
    }))
  }, [])

  // Track errors
  const trackError = useCallback((error: Error) => {
    errorCount.current++
    const errorRate = (errorCount.current / requestCount.current) * 100
    
    setState(prev => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        errorRate
      },
      errors: [...prev.errors, error].slice(-10) // Keep last 10 errors
    }))

    if (memoizedThresholds.errorRate && errorRate > memoizedThresholds.errorRate) {
      memoizedOnThresholdExceeded('errorRate', errorRate)
    }

    memoizedOnError(error)
  }, [memoizedThresholds.errorRate, memoizedOnThresholdExceeded, memoizedOnError])

  // Measure bundle size
  const measureBundleSize = useCallback(() => {
    if ('getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('resource')
      let totalSize = 0
      for (const entry of entries) {
        const res = entry as PerformanceResourceTiming
        if (typeof (res as any).transferSize === 'number') totalSize += (res as any).transferSize
      }
      
      const bundleSize = totalSize / 1024 / 1024 // Convert to MB
      
      setState(prev => ({
        ...prev,
        metrics: {
          ...prev.metrics,
          bundleSize
        }
      }))
    }
  }, [])

  // Start monitoring - memoized to prevent infinite loops
  const startMonitoring = useCallback(() => {
    if (!enabled || state.isMonitoring) return

    setState(prev => ({ ...prev, isMonitoring: true }))

    // Initial measurements
    measureMemoryUsage()
    measureCpuUsage()
    measureNetworkLatency()
    measureBundleSize()

    // Set up interval for continuous monitoring
    intervalRef.current = setInterval(() => {
      measureMemoryUsage()
      measureCpuUsage()
      measureNetworkLatency()
    }, interval)
  }, [enabled, state.isMonitoring, interval, measureMemoryUsage, measureCpuUsage, measureNetworkLatency, measureBundleSize])

  // Stop monitoring - memoized to prevent infinite loops
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    setState(prev => ({ ...prev, isMonitoring: false }))
  }, [])

  // Reset metrics
  const resetMetrics = useCallback(() => {
    errorCount.current = 0
    requestCount.current = 0
    cacheHitCount.current = 0
    
    setState(prev => ({
      ...prev,
      metrics: {
        renderTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        networkLatency: 0,
        bundleSize: 0,
        cacheHitRate: 0,
        errorRate: 0
      },
      errors: []
    }))
  }, [])

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    const { metrics, lastUpdate, errors } = state
    
    return {
      metrics,
      lastUpdate,
      errors: errors.length,
      recommendations: generateRecommendations(metrics, memoizedThresholds)
    }
  }, [state, memoizedThresholds])

  // Generate performance recommendations
  const generateRecommendations = useCallback((metrics: PerformanceMetrics, thresholds: PerformanceThresholds) => {
    const recommendations: string[] = []
    
    if (metrics.renderTime > (thresholds.renderTime || 100)) {
      recommendations.push('Consider optimizing component rendering with React.memo or useMemo')
    }
    
    if (metrics.memoryUsage > (thresholds.memoryUsage || 100)) {
      recommendations.push('Memory usage is high. Consider implementing virtual scrolling or pagination')
    }
    
    if (metrics.cpuUsage > (thresholds.cpuUsage || 80)) {
      recommendations.push('CPU usage is high. Consider moving heavy computations to Web Workers')
    }
    
    if (metrics.networkLatency > (thresholds.networkLatency || 1000)) {
      recommendations.push('Network latency is high. Consider implementing better caching strategies')
    }
    
    if (metrics.errorRate > (thresholds.errorRate || 5)) {
      recommendations.push('Error rate is high. Review error handling and add better error boundaries')
    }
    
    return recommendations
  }, [])

  // Set up error tracking
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      trackError(new Error(event.message))
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason))
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [trackError])

  // Start monitoring on mount - FIXED: removed problematic dependencies
  useEffect(() => {
    if (enabled) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [enabled]) // Only depend on enabled, not the functions

  return {
    metrics: state.metrics,
    isMonitoring: state.isMonitoring,
    lastUpdate: state.lastUpdate,
    errors: state.errors,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    getPerformanceReport,
    startRenderTimer,
    endRenderTimer,
    trackCacheHit,
    trackError
  }
}

// Performance optimization utilities
export function usePerformanceOptimization() {
  const [optimizations, setOptimizations] = useState<string[]>([])

  const addOptimization = useCallback((optimization: string) => {
    setOptimizations(prev => [...prev, optimization])
  }, [])

  const clearOptimizations = useCallback(() => {
    setOptimizations([])
  }, [])

  return {
    optimizations,
    addOptimization,
    clearOptimizations
  }
}

// Bundle size analyzer
export function useBundleAnalyzer() {
  const [bundleInfo, setBundleInfo] = useState<{
    totalSize: number
    chunkCount: number
    largestChunk: number
    chunks: Array<{ name: string; size: number }>
  }>({
    totalSize: 0,
    chunkCount: 0,
    largestChunk: 0,
    chunks: []
  })

  const analyzeBundle = useCallback(() => {
    if ('getEntriesByType' in performance) {
      const entries = performance.getEntriesByType('resource')
      const chunks = entries
        .filter(e => (e as PerformanceResourceTiming).name?.includes?.('.js') || (e as PerformanceResourceTiming).name?.includes?.('.css'))
        .map(e => {
          const r = e as PerformanceResourceTiming
          const name = r.name?.split?.('/')?.pop?.() || 'unknown'
          const size = typeof (r as any).transferSize === 'number' ? (r as any).transferSize : 0
          return { name, size }
        })
        .sort((a, b) => b.size - a.size)

      const totalSize = chunks.reduce((total, chunk) => total + chunk.size, 0)
      const largestChunk = chunks[0]?.size || 0

      setBundleInfo({
        totalSize,
        chunkCount: chunks.length,
        largestChunk,
        chunks: chunks.slice(0, 10) // Top 10 largest chunks
      })
    }
  }, [])

  return {
    bundleInfo,
    analyzeBundle
  }
} 