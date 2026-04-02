import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

export interface SignupData {
  email: string
  password: string
  full_name?: string
  username?: string
  account_type?: string
  organization?: string
  role?: string
  enable_mfa?: boolean
}

export interface SignupResult {
  success: boolean
  user?: any
  session?: any
  needsEmailConfirmation?: boolean
  error?: string
}

export interface SigninData {
  email: string
  password: string
}

export interface SigninResult {
  success: boolean
  user?: any
  session?: any
  error?: string
}

export class AuthService {
  /**
   * Comprehensive user signup with proper error handling
   */
  static async signUp(data: SignupData): Promise<SignupResult> {
    try {
      console.log('[AuthService] Starting signup for:', data.email)
      
      // Validate input
      if (!data.email || !data.password) {
        return {
          success: false,
          error: 'Email and password are required'
        }
      }

      if (data.password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        }
      }

      // Prepare metadata
      const metadata: any = {}
      if (data.full_name) metadata.full_name = data.full_name
      if (data.username) metadata.username = data.username
      if (data.account_type) metadata.account_type = data.account_type
      if (data.organization) metadata.organization = data.organization
      if (data.role) metadata.role = data.role
      if (data.enable_mfa !== undefined) metadata.enable_mfa = data.enable_mfa
      metadata.onboarding_completed = false

      // Use the current host so callbacks work for tourify.live, demo, and local.
      const baseOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || 'https://tourify.live')
      const redirectUrl = `${baseOrigin}/auth/callback`

      console.log('[AuthService] Using redirect URL:', redirectUrl)

      // Attempt signup
      const { data: signupData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: metadata,
          emailRedirectTo: redirectUrl
        }
      })

      if (error) {
        console.error('[AuthService] Signup error:', error)
        
        // Handle specific error types
        if (error.message.includes('User already registered')) {
          return {
            success: false,
            error: 'An account with this email already exists. Please try signing in instead.'
          }
        }
        
        if (error.message.includes('Password should be at least')) {
          return {
            success: false,
            error: 'Password must be at least 6 characters long'
          }
        }
        
        if (error.message.includes('Invalid email')) {
          return {
            success: false,
            error: 'Please enter a valid email address'
          }
        }
        
        return {
          success: false,
          error: error.message || 'Failed to create account. Please try again.'
        }
      }

      if (!signupData.user) {
        return {
          success: false,
          error: 'Failed to create user account'
        }
      }

      console.log('[AuthService] Signup successful for user:', signupData.user.id)

      // Check if email confirmation is required
      const needsEmailConfirmation = !signupData.session

      return {
        success: true,
        user: signupData.user,
        session: signupData.session,
        needsEmailConfirmation
      }

    } catch (error) {
      console.error('[AuthService] Unexpected error during signup:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  /**
   * User signin with proper error handling
   */
  static async signIn(data: SigninData): Promise<SigninResult> {
    try {
      console.log('[AuthService] Starting signin for:', data.email)
      
      // Validate input
      if (!data.email || !data.password) {
        return {
          success: false,
          error: 'Email and password are required'
        }
      }

      // Attempt signin
      const { data: signinData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })

      if (error) {
        console.error('[AuthService] Signin error:', error)
        
        // Handle specific error types
        if (error.message.includes('Invalid login credentials')) {
          return {
            success: false,
            error: 'Invalid email or password. Please try again.'
          }
        }
        
        if (error.message.includes('Email not confirmed')) {
          return {
            success: false,
            error: 'Please check your email and click the confirmation link before signing in.'
          }
        }
        
        return {
          success: false,
          error: error.message || 'Failed to sign in. Please try again.'
        }
      }

      if (!signinData.user) {
        return {
          success: false,
          error: 'Failed to sign in'
        }
      }

      console.log('[AuthService] Signin successful for user:', signinData.user.id)

      return {
        success: true,
        user: signinData.user,
        session: signinData.session
      }

    } catch (error) {
      console.error('[AuthService] Unexpected error during signin:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  /**
   * User signout
   */
  static async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AuthService] Starting signout')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[AuthService] Signout error:', error)
        return {
          success: false,
          error: error.message || 'Failed to sign out'
        }
      }

      console.log('[AuthService] Signout successful')
      return { success: true }

    } catch (error) {
      console.error('[AuthService] Unexpected error during signout:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during sign out'
      }
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AuthService] Starting password reset for:', email)
      
      if (!email) {
        return {
          success: false,
          error: 'Email is required'
        }
      }

      // Use the current host so reset flow works for tourify.live and demo.
      const baseOrigin =
        typeof window !== 'undefined'
          ? window.location.origin
          : (process.env.NEXT_PUBLIC_SITE_URL || 'https://tourify.live')
      const redirectUrl = `${baseOrigin}/auth/reset-password`

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (error) {
        console.error('[AuthService] Password reset error:', error)
        return {
          success: false,
          error: error.message || 'Failed to send password reset email'
        }
      }

      console.log('[AuthService] Password reset email sent successfully')
      return { success: true }

    } catch (error) {
      console.error('[AuthService] Unexpected error during password reset:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: {
    full_name?: string
    username?: string
    avatar_url?: string
  }): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('[AuthService] Starting profile update')
      
      const { error } = await supabase.auth.updateUser({
        data: updates
      })

      if (error) {
        console.error('[AuthService] Profile update error:', error)
        return {
          success: false,
          error: error.message || 'Failed to update profile'
        }
      }

      console.log('[AuthService] Profile updated successfully')
      return { success: true }

    } catch (error) {
      console.error('[AuthService] Unexpected error during profile update:', error)
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      }
    }
  }

  /**
   * Get current user
   */
  static async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('[AuthService] Get current user error:', error)
        return null
      }

      return user
    } catch (error) {
      console.error('[AuthService] Unexpected error getting current user:', error)
      return null
    }
  }

  /**
   * Get current session
   */
  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('[AuthService] Get current session error:', error)
        return null
      }

      return session
    } catch (error) {
      console.error('[AuthService] Unexpected error getting current session:', error)
      return null
    }
  }

  /**
   * Verify email confirmation
   */
  static async verifyEmailConfirmation(token: string, type: string) {
    try {
      console.log('[AuthService] Verifying email confirmation')
      
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type as any
      })

      if (error) {
        console.error('[AuthService] Email verification error:', error)
        return {
          success: false,
          error: error.message
        }
      }

      console.log('[AuthService] Email verification successful')
      return {
        success: true,
        user: data.user,
        session: data.session
      }

    } catch (error) {
      console.error('[AuthService] Unexpected error during email verification:', error)
      return {
        success: false,
        error: 'An unexpected error occurred during email verification.'
      }
    }
  }

  /**
   * Check if user exists
   */
  static async checkUserExists(email: string): Promise<boolean> {
    try {
      // Try to sign in with a dummy password to check if user exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-for-check'
      })

      // If we get an "Invalid login credentials" error, the user exists
      // If we get an "User not found" error, the user doesn't exist
      return error?.message?.includes('Invalid login credentials') || false

    } catch (error) {
      console.error('[AuthService] Error checking user existence:', error)
      return false
    }
  }
}
