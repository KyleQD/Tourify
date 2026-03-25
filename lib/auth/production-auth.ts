/**
 * Production Authentication Service
 * 
 * Unified authentication service that provides consistent authentication
 * across all routes (middleware, API routes, server components).
 * 
 * This service consolidates all authentication logic to eliminate
 * inconsistencies between different parts of the application.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../database.types'

interface AuthSession {
  access_token: string
  user: {
    id: string
    email: string
    [key: string]: any
  }
  expires_at: number
  [key: string]: any
}

interface AuthResult {
  user: any
  supabase: any
}

interface AuthError {
  error: string
  details: string
  status: number
}

export class ProductionAuthService {
  /**
   * Parse authentication from request cookies
   * Uses the same logic that works in middleware
   */
  private static parseAuthFromCookies(request: NextRequest): any | null {
    try {
      const cookies = request.headers.get('cookie') || ''
      const cookieArray = cookies.split(';').map(c => c.trim())
      
      console.log('[Production Auth] Parsing cookies:', cookieArray.map(c => {
        const [name] = c.split('=')
        return `${name}: ${c.split('=')[1]?.length || 0} chars`
      }))
      
      // Look for the main auth cookie
      const authCookie = cookieArray.find(cookie => 
        cookie.startsWith('sb-tourify-auth-token=')
      )
      
      if (!authCookie) {
        console.log('[Production Auth] No sb-tourify-auth-token cookie found')
        
        // Fallback to old patterns for existing users
        const fallbackCookie = cookieArray.find(cookie => 
          (cookie.includes('sb-') && 
           cookie.includes('auth-token') && 
           !cookie.includes('code-verifier') &&
           !cookie.includes('refresh') &&
           cookie.split('=')[1]?.length > 100) ||
          (cookie.startsWith('sb-') && 
           cookie.includes('auqddrodjezjlypkzfpi') &&
           !cookie.includes('code-verifier') &&
           cookie.split('=')[1]?.length > 100)
        )
        
        if (fallbackCookie) {
          const cookieValue = fallbackCookie.split('=')[1]
          console.log('[Production Auth] Found fallback auth cookie, length:', cookieValue?.length)
          return this.tryParseCookieValue(cookieValue)
        }
        
        return null
      }
      
      const cookieValue = authCookie.split('=')[1]
      console.log('[Production Auth] Found main auth cookie: sb-tourify-auth-token length:', cookieValue?.length)
      
      return this.tryParseCookieValue(cookieValue)
    } catch (error) {
      console.log('[Production Auth] Error parsing auth from cookies:', error)
      return null
    }
  }

  /**
   * Try to parse cookie value as session data
   */
  private static tryParseCookieValue(cookieValue: string): any | null {
    if (!cookieValue) {
      console.log('[Production Auth] No cookie value to parse')
      return null
    }
    
    try {
      // Try to parse the session data
      const sessionData: AuthSession = JSON.parse(decodeURIComponent(cookieValue))
      
      if (sessionData && sessionData.access_token && sessionData.user) {
        console.log('[Production Auth] Successfully parsed session from cookie')
        console.log('[Production Auth] User from cookie:', sessionData.user.id)
        
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000)
        if (sessionData.expires_at && sessionData.expires_at > now) {
          return sessionData.user
        } else {
          console.log('[Production Auth] Token expired')
          return null
        }
      } else {
        console.log('[Production Auth] Cookie data missing required fields')
        return null
      }
    } catch (parseError) {
      console.log('[Production Auth] Failed to parse session data:', parseError)
      
      // Try parsing without URL decoding
      try {
        const sessionData2: AuthSession = JSON.parse(cookieValue)
        if (sessionData2 && sessionData2.access_token && sessionData2.user) {
          console.log('[Production Auth] Successfully parsed session without URL decoding')
          return sessionData2.user
        }
      } catch (parseError2) {
        console.log('[Production Auth] Failed to parse even without URL decoding')
      }
      
      return null
    }
  }

  /**
   * Create service role Supabase client for database operations
   */
  private static createServiceClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    return createClient<Database>(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }

  /**
   * Authenticate API request and return user + Supabase client
   * This is the main authentication method used by all API routes
   */
  static async authenticateRequest(request: NextRequest): Promise<AuthResult | AuthError> {
    try {
      console.log('[Production Auth] Starting authentication process')
      
      if (!request) {
        console.log('[Production Auth] No request object provided')
        return {
          error: 'Invalid request',
          details: 'No request object provided',
          status: 400
        }
      }
      
      // First try the standard Supabase method
      const standardSupabase = await this.createStandardClient()
      const { data: { user }, error: authError } = await standardSupabase.auth.getUser()
      
      let finalUser = user
      
      if (authError) {
        console.log('[Production Auth] Supabase auth error:', authError.message)
      }
      
      console.log('[Production Auth] Supabase method - User exists:', !!user)
      
      // If Supabase method fails, try manual cookie parsing (like middleware does)
      if (!user) {
        console.log('[Production Auth] Supabase method failed, trying manual cookie parsing...')
        finalUser = this.parseAuthFromCookies(request)
      }
      
      if (!finalUser) {
        console.log('[Production Auth] No authenticated user found')
        return {
          error: 'Unauthorized',
          details: 'Authentication required',
          status: 401
        }
      }
      
      console.log('[Production Auth] ✅ User authenticated:', {
        id: finalUser.id,
        email: finalUser.email
      })
      
      // Create service role client for database operations
      const supabase = this.createServiceClient()
      
      return { user: finalUser, supabase }
    } catch (error) {
      console.error('[Production Auth] 💥 Authentication error:', error)
      return {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      }
    }
  }

  /**
   * Create standard Supabase client for authentication
   */
  private static async createStandardClient() {
    const { createClient: createServerClient } = await import('@supabase/supabase-js')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    })
  }

  /**
   * Check if request has valid authentication without throwing errors
   * Useful for optional authentication scenarios
   */
  static async checkAuth(request: NextRequest): Promise<AuthResult | null> {
    try {
      const result = await this.authenticateRequest(request)
      if ('error' in result) {
        return null
      }
      return result
    } catch (error) {
      console.error('[Production Auth] Auth check failed:', error)
      return null
    }
  }

  /**
   * Middleware wrapper for API routes that require authentication
   * Usage: export const POST = withProductionAuth(async (request, { user, supabase }) => { ... })
   */
  static withProductionAuth(
    handler: (
      request: NextRequest, 
      auth: AuthResult
    ) => Promise<NextResponse> | NextResponse
  ) {
    return async (request: NextRequest) => {
      const authResult = await this.authenticateRequest(request)
      
      // If authentication failed, return error response
      if ('error' in authResult) {
        console.log('[Production Auth] Authentication failed, returning', authResult.status)
        return NextResponse.json({
          error: authResult.error,
          details: authResult.details
        }, { status: authResult.status })
      }
      
      // Call the handler with authenticated user and supabase client
      return handler(request, authResult)
    }
  }
}

// Export convenience functions for backward compatibility
export const authenticateRequest = ProductionAuthService.authenticateRequest
export const checkAuth = ProductionAuthService.checkAuth
export const withProductionAuth = ProductionAuthService.withProductionAuth

// Export the class for advanced usage
export default ProductionAuthService



