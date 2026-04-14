import { createClient } from '@supabase/supabase-js'
// Types will be imported as needed

// =============================================================================
// OPTIMIZED SUPABASE CLIENT CONFIGURATION
// For maximum performance in real-time communication system
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function getSafeStorage() {
  if (typeof window === 'undefined') return undefined
  try {
    const probe = '__tourify_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return undefined
  }
}

const optimizedClientConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    storage: getSafeStorage(),
    headers: {
      'X-Client-Info': 'tourify-admin-optimized'
    }
  },
  
  realtime: {
    // Optimize real-time performance
    heartbeatIntervalMs: 30000, // 30 seconds
    reconnectDelayMs: [1000, 2000, 5000, 10000], // Progressive backoff
    timeout: 20000, // 20 seconds timeout
    
    // Enhanced error handling
    logger: process.env.NODE_ENV === 'development' ? console.log : undefined,
    
    // Connection pooling for better performance
    params: {
      eventsPerSecond: 100, // Allow high message throughput
      apikey: supabaseAnonKey
    },
    
    // Custom transport options
    transport: undefined,
    encode: (payload: any, callback: (encoded: string) => void) => {
      // Custom encoding for better performance
      callback(JSON.stringify(payload))
    },
    decode: (payload: string, callback: (decoded: any) => void) => {
      // Custom decoding with error handling
      try {
        callback(JSON.parse(payload))
      } catch (error) {
        console.error('Decode error:', error)
        callback(null)
      }
    }
  },
  
  // Database query optimizations
  db: {
    schema: 'public' as const
  },
  
  // Global fetch configuration
  global: {
    fetch: (url: RequestInfo | URL, options?: RequestInit) => {
      // Add custom headers and timeout to all requests
      const enhancedOptions: RequestInit = {
        ...options,
        headers: {
          'X-Client-Info': 'tourify-admin-optimized',
          'X-Request-Timestamp': new Date().toISOString(),
          ...options?.headers
        },
        // Add request timeout
        signal: options?.signal || AbortSignal.timeout(30000) // 30 second timeout
      }
      
      return fetch(url, enhancedOptions)
    }
  }
}

// =============================================================================
// CREATE OPTIMIZED CLIENT INSTANCE
// =============================================================================

export const createOptimizedClient = () => {
  const client = createClient<any>(supabaseUrl, supabaseAnonKey, optimizedClientConfig)
  
  // Add performance monitoring
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ Optimized Supabase client created')
  }
  
  return client
}

// =============================================================================
// CONNECTION POOL MANAGER
// Manages multiple connections for different features
// =============================================================================

class SupabaseConnectionPool {
  private static instance: SupabaseConnectionPool
  private connections: Map<string, ReturnType<typeof createOptimizedClient>> = new Map()
  private connectionLimits = {
    'default': 1,
    'communications': 3, // Multiple connections for high-throughput messaging
    'analytics': 1,
    'general': 2
  }

  static getInstance(): SupabaseConnectionPool {
    if (!SupabaseConnectionPool.instance) {
      SupabaseConnectionPool.instance = new SupabaseConnectionPool()
    }
    return SupabaseConnectionPool.instance
  }

  getConnection(connectionType: keyof typeof this.connectionLimits = 'default') {
    const connectionKey = `${connectionType}-${Math.floor(Math.random() * this.connectionLimits[connectionType])}`
    
    if (!this.connections.has(connectionKey)) {
      this.connections.set(connectionKey, createOptimizedClient())
    }
    
    return this.connections.get(connectionKey)!
  }

  closeConnection(connectionType: string, index: number = 0) {
    const connectionKey = `${connectionType}-${index}`
    const connection = this.connections.get(connectionKey)
    
    if (connection) {
      // Close all channels
      connection.removeAllChannels()
      this.connections.delete(connectionKey)
    }
  }

  closeAllConnections() {
    this.connections.forEach((connection) => {
      connection.removeAllChannels()
    })
    this.connections.clear()
  }
}

// =============================================================================
// SPECIALIZED CLIENT FACTORIES
// =============================================================================

// High-performance client for real-time communications
export const createCommunicationsClient = () => {
  const pool = SupabaseConnectionPool.getInstance()
  return pool.getConnection('communications')
}

// Standard client for general database operations
export const createGeneralClient = () => {
  const pool = SupabaseConnectionPool.getInstance()
  return pool.getConnection('general')
}

// Analytics client with specific optimizations
export const createAnalyticsClient = () => {
  const pool = SupabaseConnectionPool.getInstance()
  return pool.getConnection('analytics')
}

// =============================================================================
// PERFORMANCE MONITORING HOOKS
// =============================================================================

export class SupabasePerformanceMonitor {
  private static queryTimes: Map<string, number[]> = new Map()
  private static connectionEvents: Array<{ type: string, timestamp: Date }> = []

  static trackQuery(queryName: string, startTime: number) {
    const duration = Date.now() - startTime
    
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, [])
    }
    
    const times = this.queryTimes.get(queryName)!
    times.push(duration)
    
    // Keep only last 100 measurements
    if (times.length > 100) {
      times.shift()
    }
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`🐌 Slow query detected: ${queryName} took ${duration}ms`)
    }
  }

  static trackConnectionEvent(type: 'connect' | 'disconnect' | 'error' | 'reconnect') {
    this.connectionEvents.push({ type, timestamp: new Date() })
    
    // Keep only last 50 events
    if (this.connectionEvents.length > 50) {
      this.connectionEvents.shift()
    }
  }

  static getPerformanceStats() {
    const stats: Record<string, any> = {}
    
    this.queryTimes.forEach((times, queryName) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length
        const min = Math.min(...times)
        const max = Math.max(...times)
        
        stats[queryName] = { avg, min, max, count: times.length }
      }
    })
    
    return {
      queries: stats,
      connectionEvents: this.connectionEvents.slice(-10), // Last 10 events
      timestamp: new Date()
    }
  }

  static resetStats() {
    this.queryTimes.clear()
    this.connectionEvents = []
  }
}

// =============================================================================
// OPTIMIZED QUERY HELPERS
// =============================================================================

export const optimizedQueries = {
  // Get messages with optimized joins and caching
  getChannelMessages: (client: ReturnType<typeof createOptimizedClient>, channelId: string, limit = 50) => {
    const startTime = Date.now()
    
    const query = client
      .from('messages')
      .select(`
        id,
        content,
        message_type,
        priority,
        created_at,
        is_pinned,
        sender:profiles!sender_id(id, display_name),
        attachments:message_attachments(file_name, file_url, mime_type)
      `)
      .eq('channel_id', channelId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return query.then(result => {
      SupabasePerformanceMonitor.trackQuery('getChannelMessages', startTime)
      return result
    })
  },

  // Get announcements with priority-based filtering
  getActiveAnnouncements: (client: ReturnType<typeof createOptimizedClient>, filters: {
    tourId?: string
    eventId?: string
    venueId?: string
    priority?: string
  } = {}) => {
    const startTime = Date.now()
    
    let query = client
      .from('announcements')
      .select(`
        id,
        title,
        content,
        announcement_type,
        priority,
        created_at,
        expires_at,
        created_by_profile:profiles!created_by(id, display_name)
      `)
      .eq('is_published', true)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('priority', { ascending: true }) // Emergency first
      .order('created_at', { ascending: false })
    
    if (filters.tourId) query = query.eq('tour_id', filters.tourId)
    if (filters.eventId) query = query.eq('event_id', filters.eventId)
    if (filters.venueId) query = query.eq('venue_id', filters.venueId)
    if (filters.priority) query = query.eq('priority', filters.priority)
    
    return query.then(result => {
      SupabasePerformanceMonitor.trackQuery('getActiveAnnouncements', startTime)
      return result
    })
  },

  // Get user's accessible channels with participant info
  getUserChannels: (client: ReturnType<typeof createOptimizedClient>, userId: string) => {
    const startTime = Date.now()
    
    const query = client
      .from('channel_participants')
      .select(`
        role_in_channel,
        is_muted,
        last_read_at,
        channel:communication_channels(
          id,
          name,
          description,
          channel_type,
          is_public,
          created_at,
          latest_message:messages(
            content,
            created_at,
            sender:profiles!sender_id(display_name)
          )
        )
      `)
      .eq('user_id', userId)
      .order('channel.created_at', { ascending: false })
    
    return query.then(result => {
      SupabasePerformanceMonitor.trackQuery('getUserChannels', startTime)
      return result
    })
  }
}

// =============================================================================
// EXPORT DEFAULT CLIENT
// =============================================================================

export default createOptimizedClient