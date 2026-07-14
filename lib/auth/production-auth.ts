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
import { authenticateRequestWithBearerFallback } from '@/lib/auth/mobile-request-auth'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

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
      if (!request) {
        return {
          error: 'Invalid request',
          details: 'No request object provided',
          status: 400
        }
      }

      const mobileCompatibleAuth = await authenticateRequestWithBearerFallback(request)
      if (mobileCompatibleAuth) {
        const supabase = this.createServiceClient()
        return {
          user: mobileCompatibleAuth.user,
          supabase
        }
      }

      // Prefer SSR cookie session (same path as server components / middleware refresh)
      const { createClient: createServerSupabaseClient } = await import('@/lib/supabase/server')
      const cookieSupabase = await createServerSupabaseClient()
      const { data: { user: cookieUser } } = await cookieSupabase.auth.getUser()

      let finalUser = cookieUser

      // Fallback: parse sb-tourify-auth-token from the raw Cookie header
      if (!finalUser) {
        finalUser = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
      }

      if (!finalUser) {
        return {
          error: 'Unauthorized',
          details: 'Authentication required',
          status: 401
        }
      }

      const supabase = this.createServiceClient()

      return { user: finalUser, supabase }
    } catch (error) {
      console.error('[Production Auth] Authentication error:', error)
      return {
        error: 'Authentication failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        status: 500
      }
    }
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
