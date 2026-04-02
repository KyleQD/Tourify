"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"

interface DataValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  missingFields: string[]
  dataQuality: number // 0-100
}

interface ValidationRule {
  field: string
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  minLength?: number
  maxLength?: number
  minValue?: number
  maxValue?: number
  pattern?: RegExp
  customValidator?: (value: any) => boolean
  errorMessage?: string
}

interface DataValidationConfig {
  rules: ValidationRule[]
  retryAttempts?: number
  retryDelay?: number
  validateOnMount?: boolean
  showNotifications?: boolean
}

export function validateDataWithRules<T>(
  dataToValidate: T | null | undefined,
  rules: ValidationRule[]
): DataValidationResult {
  if (!dataToValidate) {
    return {
      isValid: false,
      errors: ['Data is null or undefined'],
      warnings: [],
      missingFields: [],
      dataQuality: 0
    }
  }

  const errors: string[] = []
  const warnings: string[] = []
  const missingFields: string[] = []
  let validFields = 0
  const totalFields = rules.length

  rules.forEach(rule => {
    const value = (dataToValidate as Record<string, unknown>)[rule.field]

    if (value === undefined || value === null) {
      if (rule.required) {
        errors.push(rule.errorMessage || `Required field '${rule.field}' is missing`)
        missingFields.push(rule.field)
      } else {
        warnings.push(`Optional field '${rule.field}' is missing`)
      }
      return
    }

    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value
      if (actualType !== rule.type) {
        errors.push(rule.errorMessage || `Field '${rule.field}' should be of type '${rule.type}', got '${actualType}'`)
        return
      }
    }

    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(rule.errorMessage || `Field '${rule.field}' should be at least ${rule.minLength} characters`)
        return
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        warnings.push(`Field '${rule.field}' is longer than recommended ${rule.maxLength} characters`)
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.errorMessage || `Field '${rule.field}' does not match required pattern`)
        return
      }
    }

    if (typeof value === 'number') {
      if (rule.minValue !== undefined && value < rule.minValue) {
        errors.push(rule.errorMessage || `Field '${rule.field}' should be at least ${rule.minValue}`)
        return
      }
      if (rule.maxValue !== undefined && value > rule.maxValue) {
        errors.push(rule.errorMessage || `Field '${rule.field}' should be at most ${rule.maxValue}`)
        return
      }
    }

    if (Array.isArray(value)) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(rule.errorMessage || `Field '${rule.field}' should have at least ${rule.minLength} items`)
        return
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        warnings.push(`Field '${rule.field}' has more items than recommended ${rule.maxLength}`)
      }
    }

    if (rule.customValidator && !rule.customValidator(value)) {
      errors.push(rule.errorMessage || `Field '${rule.field}' failed custom validation`)
      return
    }

    validFields++
  })

  const dataQuality = totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingFields,
    dataQuality
  }
}

export function useDataValidation<T>(
  data: T | null | undefined,
  config: DataValidationConfig
) {
  const [validationResult, setValidationResult] = useState<DataValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
    missingFields: [],
    dataQuality: 0
  })
  const [isValidating, setIsValidating] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const validateData = useCallback(
    (dataToValidate: T | null | undefined): DataValidationResult =>
      validateDataWithRules(dataToValidate, config.rules),
    [config.rules]
  )

  const retryValidation = useCallback(async () => {
    const { retryAttempts = 3, retryDelay = 1000 } = config
    
    if (retryCount >= retryAttempts) {
      if (config.showNotifications) {
        toast.error(`Data validation failed after ${retryAttempts} attempts`)
      }
      return
    }

    setRetryCount(prev => prev + 1)
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)))
    
    const result = validateData(data)
    setValidationResult(result)
    
    if (!result.isValid && config.showNotifications) {
      toast.warning(`Data validation retry ${retryCount + 1}/${retryAttempts}`)
    }
  }, [data, config, retryCount, validateData])

  // Validate data when it changes
  useEffect(() => {
    if (config.validateOnMount || data !== null) {
      setIsValidating(true)
      const result = validateData(data)
      setValidationResult(result)
      setIsValidating(false)

      // Show notifications if enabled
      if (config.showNotifications) {
        if (result.isValid) {
          if (result.warnings.length > 0) {
            toast.warning(`Data loaded with ${result.warnings.length} warnings`)
          } else {
            toast.success('Data loaded successfully')
          }
        } else {
          toast.error(`Data validation failed: ${result.errors.length} errors`)
        }
      }
    }
  }, [data, config.validateOnMount, config.showNotifications, validateData])

  return {
    validationResult,
    isValidating,
    retryCount,
    retryValidation,
    validateData: () => {
      setIsValidating(true)
      const result = validateData(data)
      setValidationResult(result)
      setIsValidating(false)
      return result
    }
  }
}

// Predefined validation rules for common data types
export const validationRules = {
  // Dashboard stats validation
  dashboardStats: [
    { field: 'totalTours', required: true, type: 'number' as const, minValue: 0 },
    { field: 'activeTours', required: true, type: 'number' as const, minValue: 0 },
    { field: 'totalEvents', required: true, type: 'number' as const, minValue: 0 },
    { field: 'upcomingEvents', required: true, type: 'number' as const, minValue: 0 },
    { field: 'totalRevenue', required: true, type: 'number' as const, minValue: 0 },
    { field: 'monthlyRevenue', required: true, type: 'number' as const, minValue: 0 },
    { field: 'ticketsSold', required: true, type: 'number' as const, minValue: 0 },
    { field: 'totalCapacity', required: true, type: 'number' as const, minValue: 0 }
  ],

  // Tour validation
  tour: [
    { field: 'id', required: true, type: 'string' as const, minLength: 1 },
    { field: 'name', required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
    { field: 'artist', required: true, type: 'string' as const, minLength: 1 },
    { field: 'status', required: true, type: 'string' as const, pattern: /^(active|completed|planning|cancelled)$/ },
    { field: 'start_date', required: true, type: 'string' as const },
    { field: 'end_date', required: true, type: 'string' as const },
    { field: 'totalShows', required: true, type: 'number' as const, minValue: 0 },
    { field: 'completedShows', required: true, type: 'number' as const, minValue: 0 },
    { field: 'revenue', required: true, type: 'number' as const, minValue: 0 }
  ],

  // Event validation
  event: [
    { field: 'id', required: true, type: 'string' as const, minLength: 1 },
    { field: 'name', required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
    { field: 'venue_name', required: true, type: 'string' as const, minLength: 1 },
    { field: 'event_date', required: true, type: 'string' as const },
    { field: 'status', required: true, type: 'string' as const, pattern: /^(scheduled|confirmed|completed|cancelled)$/ },
    { field: 'tickets_sold', required: true, type: 'number' as const, minValue: 0 },
    { field: 'capacity', required: true, type: 'number' as const, minValue: 0 },
    { field: 'expected_revenue', required: true, type: 'number' as const, minValue: 0 }
  ],

  // Artist validation
  artist: [
    { field: 'id', required: true, type: 'string' as const, minLength: 1 },
    { field: 'name', required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
    { field: 'status', required: true, type: 'string' as const, pattern: /^(active|inactive)$/ },
    { field: 'revenue', required: true, type: 'number' as const, minValue: 0 },
    { field: 'events_count', required: true, type: 'number' as const, minValue: 0 }
  ],

  // Venue validation
  venue: [
    { field: 'id', required: true, type: 'string' as const, minLength: 1 },
    { field: 'name', required: true, type: 'string' as const, minLength: 1, maxLength: 200 },
    { field: 'status', required: true, type: 'string' as const, pattern: /^(active|inactive)$/ },
    { field: 'capacity', required: true, type: 'number' as const, minValue: 0 },
    { field: 'events_count', required: true, type: 'number' as const, minValue: 0 },
    { field: 'revenue', required: true, type: 'number' as const, minValue: 0 }
  ]
}

// Hook for validating array data
export function useArrayDataValidation<T>(
  data: T[] | null | undefined,
  itemValidationRules: ValidationRule[],
  config: Omit<DataValidationConfig, 'rules'> = {}
) {
  const [validationResults, setValidationResults] = useState<{
    overall: DataValidationResult
    items: Array<{ index: number; result: DataValidationResult }>
  }>({
    overall: { isValid: false, errors: [], warnings: [], missingFields: [], dataQuality: 0 },
    items: []
  })

  const validateArrayData = useCallback(() => {
    if (!data || !Array.isArray(data)) {
      const result = {
        isValid: false,
        errors: ['Data is not an array'],
        warnings: [],
        missingFields: [],
        dataQuality: 0
      }
      setValidationResults({ overall: result, items: [] })
      return { overall: result, items: [] }
    }

    const itemResults = data.map((item, index) => ({
      index,
      result: validateDataWithRules(item, itemValidationRules)
    }))

    const validItems = itemResults.filter(item => item.result.isValid).length
    const totalItems = itemResults.length
    const overallQuality = totalItems > 0 ? Math.round((validItems / totalItems) * 100) : 0

    const overallErrors = itemResults
      .filter(item => !item.result.isValid)
      .flatMap(item => item.result.errors.map(error => `Item ${item.index}: ${error}`))

    const overallWarnings = itemResults
      .flatMap(item => item.result.warnings.map(warning => `Item ${item.index}: ${warning}`))

    const overall: DataValidationResult = {
      isValid: overallErrors.length === 0,
      errors: overallErrors,
      warnings: overallWarnings,
      missingFields: [],
      dataQuality: overallQuality
    }

    const results = { overall, items: itemResults }
    setValidationResults(results)
    return results
  }, [data, itemValidationRules])

  useEffect(() => {
    validateArrayData()
  }, [validateArrayData])

  return {
    validationResults,
    validateArrayData,
    isValid: validationResults.overall.isValid,
    dataQuality: validationResults.overall.dataQuality,
    errorCount: validationResults.overall.errors.length,
    warningCount: validationResults.overall.warnings.length
  }
}

// Hook for real-time data monitoring
export function useDataMonitoring<T>(
  data: T | null | undefined,
  onDataChange?: (data: T, previousData: T | null) => void,
  onDataError?: (error: Error) => void
) {
  const [previousData, setPreviousData] = useState<T | null>(null)
  const [dataHistory, setDataHistory] = useState<Array<{ timestamp: number; data: T }>>([])
  const [isDataStale, setIsDataStale] = useState(false)

  useEffect(() => {
    if (data !== previousData) {
      const timestamp = Date.now()
      
      // Add to history (keep last 10 entries)
      setDataHistory(prev => {
        const newHistory = [...prev, { timestamp, data: data as T }]
        return newHistory.slice(-10)
      })

      // Check if data is stale (older than 5 minutes)
      if (dataHistory.length > 0) {
        const lastUpdate = dataHistory[dataHistory.length - 1].timestamp
        const isStale = timestamp - lastUpdate > 5 * 60 * 1000 // 5 minutes
        setIsDataStale(isStale)
      }

      // Call change handler
      if (onDataChange && data !== null && data !== undefined) {
        onDataChange(data, previousData)
      }

      setPreviousData(data as T)
    }
  }, [data, previousData, onDataChange, dataHistory])

  const getDataAge = () => {
    if (dataHistory.length === 0) return 0
    const lastUpdate = dataHistory[dataHistory.length - 1].timestamp
    return Date.now() - lastUpdate
  }

  const getDataChangeRate = () => {
    if (dataHistory.length < 2) return 0
    const recent = dataHistory.slice(-5)
    return recent.length / 5 // Changes per minute
  }

  return {
    dataHistory,
    isDataStale,
    getDataAge,
    getDataChangeRate,
    previousData
  }
} 