import { supabase } from '@/lib/supabase'

export interface SessionInfo {
  id: string
  userId: string
  accessToken: string
  refreshToken: string
  deviceInfo: {
    userAgent: string
    ipAddress: string
    deviceType: 'mobile' | 'tablet' | 'desktop'
    browser: string
    os: string
  }
  isRemembered: boolean
  expiresAt: string
  lastActivity: string
  createdAt: string
  isActive: boolean
}

export interface SessionOptions {
  rememberMe?: boolean
  sessionDuration?: number // minutes
  extendedDuration?: number // days for "remember me"
  deviceInfo?: {
    userAgent?: string
    ipAddress?: string
  }
}

export class SessionManagementService {
  private static instance: SessionManagementService
  private sessionCheckInterval: NodeJS.Timeout | null = null
  private inactivityTimer: NodeJS.Timeout | null = null

  private constructor() {
    this.initializeSessionMonitoring()
  }

  public static getInstance(): SessionManagementService {
    if (!SessionManagementService.instance) {
      SessionManagementService.instance = new SessionManagementService()
    }
    return SessionManagementService.instance
  }

  // Initialize session with options
  public async initializeSession(options: SessionOptions = {}): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      const deviceInfo = this.detectDeviceInfo(options.deviceInfo?.userAgent)
      
      // Store session information
      await supabase
        .from('user_sessions')
        .upsert({
          user_id: session.user.id,
          access_token_hash: this.hashToken(session.access_token),
          refresh_token_hash: this.hashToken(session.refresh_token),
          device_info: deviceInfo,
          ip_address: options.deviceInfo?.ipAddress,
          is_remembered: options.rememberMe || false,
          expires_at: options.rememberMe 
            ? new Date(Date.now() + (options.extendedDuration || 30) * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + (options.sessionDuration || 480) * 60 * 1000).toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true
        })

      // Set up session monitoring
      this.startSessionMonitoring()
      
      // Handle "remember me" functionality
      if (options.rememberMe) {
        this.enablePersistentSession()
      }
    } catch (error) {
      console.error('Error initializing session:', error)
    }
  }

  // Enable persistent session ("remember me")
  private enablePersistentSession(): void {
    try {
      // Set longer-lived session in localStorage
      localStorage.setItem('tourify_remember_session', 'true')
      localStorage.setItem('tourify_session_timestamp', Date.now().toString())
      
      // Configure Supabase to persist session
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          localStorage.setItem('tourify_last_activity', Date.now().toString())
        }
      })
    } catch (error) {
      console.error('Error enabling persistent session:', error)
    }
  }

  // Update session activity
  public async updateActivity(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      // Update last activity timestamp
      await supabase
        .from('user_sessions')
        .update({ last_activity: new Date().toISOString() })
        .eq('user_id', session.user.id)
        .eq('is_active', true)

      // Update localStorage for "remember me" sessions
      if (localStorage.getItem('tourify_remember_session') === 'true') {
        localStorage.setItem('tourify_last_activity', Date.now().toString())
      }

      // Reset inactivity timer
      this.resetInactivityTimer()
    } catch (error) {
      console.error('Error updating session activity:', error)
    }
  }

  // Get user's active sessions
  public async getUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      if (error) {
        console.error('Error fetching user sessions:', error)
        throw error
      }

      return data?.map(session => ({
        id: session.id,
        userId: session.user_id,
        accessToken: '', // Don't return actual tokens
        refreshToken: '',
        deviceInfo: session.device_info,
        isRemembered: session.is_remembered,
        expiresAt: session.expires_at,
        lastActivity: session.last_activity,
        createdAt: session.created_at,
        isActive: session.is_active
      })) || []
    } catch (error) {
      console.error('Error in getUserSessions:', error)
      return []
    }
  }

  // Revoke specific session
  public async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .eq('id', sessionId)
        .eq('user_id', userId)

      if (error) {
        console.error('Error revoking session:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in revokeSession:', error)
      return false
    }
  }

  // Revoke all other sessions (except current)
  public async revokeOtherSessions(userId: string, currentSessionId?: string): Promise<boolean> {
    try {
      let query = supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_active', true)

      if (currentSessionId) {
        query = query.neq('id', currentSessionId)
      }

      const { error } = await query

      if (error) {
        console.error('Error revoking other sessions:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in revokeOtherSessions:', error)
      return false
    }
  }

  // Clean up expired sessions
  public async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date().toISOString()
      
      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          revoked_at: now 
        })
        .lt('expires_at', now)
        .eq('is_active', true)
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error)
    }
  }

  // Check session validity
  public async isSessionValid(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return false

      // Check if session exists in our records and is active
      const { data, error } = await supabase
        .from('user_sessions')
        .select('expires_at, is_active')
        .eq('user_id', session.user.id)
        .eq('access_token_hash', this.hashToken(session.access_token))
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (error || !data) return false

      // Check if session has expired
      const now = new Date()
      const expiresAt = new Date(data.expires_at)
      
      if (now > expiresAt) {
        // Revoke expired session
        await this.revokeCurrentSession()
        return false
      }

      return true
    } catch (error) {
      console.error('Error checking session validity:', error)
      return false
    }
  }

  // Secure logout with cleanup
  public async secureLogout(revokeAllSessions: boolean = false): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        if (revokeAllSessions) {
          // Revoke all user sessions
          await this.revokeOtherSessions(session.user.id)
        }
        
        // Revoke current session
        await this.revokeCurrentSession()
      }

      // Clear local storage
      this.clearLocalSession()

      // Stop session monitoring
      this.stopSessionMonitoring()

      // Sign out from Supabase
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error during secure logout:', error)
      throw error
    }
  }

  // Revoke current session
  private async revokeCurrentSession(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return

      await supabase
        .from('user_sessions')
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .eq('user_id', session.user.id)
        .eq('access_token_hash', this.hashToken(session.access_token))
    } catch (error) {
      console.error('Error revoking current session:', error)
    }
  }

  // Clear local session data
  private clearLocalSession(): void {
    try {
      localStorage.removeItem('tourify_remember_session')
      localStorage.removeItem('tourify_session_timestamp')
      localStorage.removeItem('tourify_last_activity')
      sessionStorage.clear()
    } catch (error) {
      console.error('Error clearing local session:', error)
    }
  }

  // Initialize session monitoring
  private initializeSessionMonitoring(): void {
    // Check for existing session on page load
    this.checkExistingSession()
    
    // Monitor user activity
    this.setupActivityListeners()
  }

  // Check for existing session (for "remember me")
  private async checkExistingSession(): Promise<void> {
    try {
      const rememberSession = localStorage.getItem('tourify_remember_session')
      const lastActivity = localStorage.getItem('tourify_last_activity')
      
      if (rememberSession === 'true' && lastActivity) {
        const lastActivityTime = parseInt(lastActivity)
        const now = Date.now()
        const daysSinceActivity = (now - lastActivityTime) / (1000 * 60 * 60 * 24)
        
        // If more than 30 days of inactivity, clear session
        if (daysSinceActivity > 30) {
          this.clearLocalSession()
          await supabase.auth.signOut()
        } else {
          // Extend session
          await this.updateActivity()
        }
      }
    } catch (error) {
      console.error('Error checking existing session:', error)
    }
  }

  // Setup activity listeners
  private setupActivityListeners(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const activityHandler = () => {
      this.updateActivity()
    }

    events.forEach(event => {
      document.addEventListener(event, activityHandler, true)
    })

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      events.forEach(event => {
        document.removeEventListener(event, activityHandler, true)
      })
    })
  }

  // Start session monitoring
  private startSessionMonitoring(): void {
    // Check session validity every 5 minutes
    this.sessionCheckInterval = setInterval(async () => {
      const isValid = await this.isSessionValid()
      if (!isValid) {
        await this.secureLogout()
      }
    }, 5 * 60 * 1000)

    // Set up inactivity timer (30 minutes)
    this.resetInactivityTimer()
  }

  // Stop session monitoring
  private stopSessionMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval)
      this.sessionCheckInterval = null
    }
    
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
      this.inactivityTimer = null
    }
  }

  // Reset inactivity timer
  private resetInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer)
    }

    // Log out after 30 minutes of inactivity (unless "remember me" is enabled)
    const isRemembered = localStorage.getItem('tourify_remember_session') === 'true'
    
    if (!isRemembered) {
      this.inactivityTimer = setTimeout(async () => {
        await this.secureLogout()
      }, 30 * 60 * 1000) // 30 minutes
    }
  }

  // Detect device information
  private detectDeviceInfo(userAgent?: string): any {
    const ua = userAgent || navigator.userAgent
    
    return {
      userAgent: ua,
      deviceType: this.getDeviceType(ua),
      browser: this.getBrowserName(ua),
      os: this.getOperatingSystem(ua)
    }
  }

  private getDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile'
    return 'desktop'
  }

  private getBrowserName(ua: string): string {
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }

  private getOperatingSystem(ua: string): string {
    if (ua.includes('Windows')) return 'Windows'
    if (ua.includes('Mac')) return 'macOS'
    if (ua.includes('Linux')) return 'Linux'
    if (ua.includes('Android')) return 'Android'
    if (ua.includes('iOS')) return 'iOS'
    return 'Unknown'
  }

  // Simple hash function for tokens (in production, use proper crypto)
  private hashToken(token: string): string {
    let hash = 0
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }
}

// Export singleton instance
export const sessionManagementService = SessionManagementService.getInstance() 