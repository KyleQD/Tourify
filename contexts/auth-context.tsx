"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type SocialProvider = 'google' | 'apple' | 'facebook'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signUp: (email: string, password: string, metadata?: { full_name?: string; username?: string }) => Promise<{ error?: AuthError }>
  signInWithSocial: (provider: SocialProvider, redirectTo?: string) => Promise<{ error?: AuthError }>
  signOut: () => Promise<{ error?: AuthError }>
  resetPassword: (email: string) => Promise<{ error?: AuthError }>
  updateProfile: (updates: { full_name?: string; username?: string; avatar_url?: string }) => Promise<{ error?: string }>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true) // Start with true to wait for initial auth check
  const router = useRouter()

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        setLoading(true)
        console.log('[Auth] Checking initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('[Auth] Session check error:', error)
        } else {
          console.log('[Auth] Initial session check:', session ? `User ${session.user?.id} authenticated` : 'No session')
        }
        
        setSession(session)
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('[Auth] Session check failed:', error)
      } finally {
        setLoading(false) // Always set loading to false after initial check
      }
    }

    checkSession()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] State change:', event, session ? `User ${session.user?.id}` : 'No session')
      
      setSession(session)
      setUser(session?.user ?? null)

      // Don't automatically redirect on sign in - let components handle this
      // The middleware will handle protecting routes and the login page will redirect after successful sign in

      if (event === 'SIGNED_OUT') {
        console.log('[Auth] User signed out, clearing local data')
        // Clear any local storage
        localStorage.removeItem('onboardingData')
        router.push('/login')
      }

      if (event === 'TOKEN_REFRESHED') {
        console.log('[Auth] Token refreshed successfully')
      }

      if (event === 'SIGNED_IN') {
        console.log('[Auth] User signed in successfully')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      console.log('[Auth] Attempting sign in for:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('[Auth] Sign in error:', {
          message: error.message,
          status: error.status,
          name: error.name
        })
        return { error }
      }
      
      console.log('[Auth] Sign in successful:', {
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at ? 'Yes' : 'No'
      })
      return { error: undefined }
    } catch (error) {
      console.error('[Auth] Sign in failed with exception:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (
    email: string, 
    password: string, 
    metadata?: { full_name?: string; username?: string }
  ) => {
    try {
      setLoading(true)
      console.log('[Auth] Attempting sign up for:', email, 'with metadata:', metadata)
      
      // Check for configuration issues first
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey || 
          supabaseAnonKey.includes('your_anon_key') || 
          supabaseAnonKey.includes('your_supabase_anon_key')) {
        return { 
          error: {
            message: 'Authentication service is not properly configured. Please contact support.',
            status: 500,
            name: 'ConfigurationError'
          } as AuthError
        }
      }

      const normalizedUsername = metadata?.username
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 32)

      if (normalizedUsername) {
        try {
          const usernameCheckResponse = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalizedUsername)}`)
          const usernameCheckData = await usernameCheckResponse.json().catch(() => null)

          if (!usernameCheckResponse.ok || !usernameCheckData?.available) {
            return {
              error: {
                message: usernameCheckData?.message || 'That username is not available. Please choose another username.',
                status: 400,
                name: 'UsernameUnavailable'
              } as AuthError
            }
          }
        } catch (usernameCheckError) {
          console.error('[Auth] Username check failed before signup:', usernameCheckError)
        }
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/auth/callback?type=signup&redirectTo=%2Flogin`
              : undefined,
          data: {
            full_name: metadata?.full_name,
            username: normalizedUsername || metadata?.username,
          },
        },
      })
      
      if (error) {
        console.error('[Auth] Sign up error:', {
          message: error.message,
          status: error.status,
          name: error.name
        })
        
        // Provide more user-friendly error messages
        let userFriendlyMessage = error.message
        
        if (error.message.includes('rate limit')) {
          userFriendlyMessage = 'Too many signup attempts. Please wait a few minutes before trying again.'
        } else if (error.message.includes('invalid email')) {
          userFriendlyMessage = 'Please enter a valid email address.'
        } else if (error.message.includes('weak password')) {
          userFriendlyMessage = 'Password must be at least 6 characters long.'
        } else if (error.message.includes('already registered')) {
          userFriendlyMessage = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message.toLowerCase().includes('database error saving new user')) {
          userFriendlyMessage = 'We could not create the account profile. This is usually a username conflict. Please choose a different username and try again.'
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userFriendlyMessage = 'Network error. Please check your internet connection and try again.'
        }
        
        return { 
          error: {
            ...error,
            message: userFriendlyMessage
          } as AuthError
        }
      }
      
      console.log('[Auth] Sign up successful:', {
        userId: data.user?.id,
        email: data.user?.email,
        needsConfirmation: !data.session ? 'Yes' : 'No'
      })
      return { error: undefined }
    } catch (error) {
      console.error('[Auth] Sign up failed with exception:', error)
      return { 
        error: {
          message: 'An unexpected error occurred. Please try again.',
          status: 500,
          name: 'UnexpectedError'
        } as AuthError
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      console.log('[Auth] Attempting sign out')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[Auth] Sign out error:', error)
        return { error }
      }
      
      console.log('[Auth] Sign out successful')
      return { error: undefined }
    } catch (error) {
      console.error('[Auth] Sign out failed with exception:', error)
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signInWithSocial = async (provider: SocialProvider, redirectTo = '/dashboard') => {
    try {
      setLoading(true)
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const normalizedRedirect = normalizeAuthRedirectPath(redirectTo)

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?redirectTo=${encodeURIComponent(normalizedRedirect)}&authType=social`
        }
      })

      if (error) return { error }
      return { error: undefined }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      console.log('[Auth] Attempting password reset for:', email)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) {
        console.error('[Auth] Reset password error:', error)
        return { error }
      }
      
      console.log('[Auth] Reset password email sent successfully')
      return { error: undefined }
    } catch (error) {
      console.error('[Auth] Reset password failed with exception:', error)
      return { error: error as AuthError }
    }
  }

  const updateProfile = async (updates: { 
    full_name?: string
    username?: string
    avatar_url?: string 
  }) => {
    try {
      if (!user) {
        console.warn('[Auth] Update profile called without authenticated user')
        return { error: 'No user logged in' }
      }

      console.log('[Auth] Updating profile for user:', user.id, 'with updates:', updates)

      const { error } = await supabase.auth.updateUser({
        data: updates
      })
      
      if (error) {
        console.error('[Auth] Update profile error:', error)
        return { error: error.message }
      }
      
      // Also update the profiles table if it exists
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: updates.full_name,
          username: updates.username,
          avatar_url: updates.avatar_url,
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('[Auth] Update profiles table error:', profileError)
        // Don't return error here as the main auth update succeeded
        console.warn('[Auth] Profiles table update failed, but auth update succeeded')
      } else {
        console.log('[Auth] Profile updated successfully in both auth and profiles table')
      }
      
      return { error: undefined }
    } catch (error) {
      console.error('[Auth] Update profile failed with exception:', error)
      return { error: 'Failed to update profile' }
    }
  }

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signInWithSocial,
    signOut,
    resetPassword,
    updateProfile,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

function normalizeAuthRedirectPath(target: string): string {
  if (!target?.startsWith('/')) return '/dashboard'
  if (target === '/' || target.startsWith('/login') || target.startsWith('/auth')) return '/dashboard'
  return target
}