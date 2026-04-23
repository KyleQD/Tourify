"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getAuthSignUpEmailRedirectTo } from '@/lib/auth/auth-email-redirect'
import { useRouter } from 'next/navigation'

function authDevLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== 'development') return
  console.log(...args)
}

/** One attempt; slow mobile / cold token refresh can exceed a few seconds at scale. */
const SESSION_CHECK_TIMEOUT_MS = 28_000

class SessionCheckTimeoutError extends Error {
  readonly name = 'SessionCheckTimeoutError'
  constructor() {
    super(
      'Sign-in check timed out. Check your connection, then use Try again or refresh the page.',
    )
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(onTimeout()), ms)
    promise
      .then((value) => {
        clearTimeout(id)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(id)
        reject(err)
      })
  })
}

async function getSessionWithTimeoutAndRetry() {
  const runOnce = () =>
    withTimeout(
      supabase.auth.getSession(),
      SESSION_CHECK_TIMEOUT_MS,
      () => new SessionCheckTimeoutError(),
    )

  try {
    return await runOnce()
  } catch (first) {
    if (first instanceof SessionCheckTimeoutError) {
      console.warn('[Auth] Initial getSession timed out; retrying once before surfacing an error')
      return await runOnce()
    }
    throw first
  }
}

type SocialProvider = 'google' | 'apple' | 'facebook'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authError: string | null
  /** Re-run initial getSession (e.g. after timeout or network recovery). */
  retrySessionCheck: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signUp: (
    email: string,
    password: string,
    metadata?: { full_name?: string; username?: string; account_type?: string }
  ) => Promise<{ error?: AuthError; needsEmailConfirmation?: boolean }>
  /** Resend signup confirmation when the inbox is empty or the link expired. */
  resendSignupConfirmation: (email: string) => Promise<{ error?: AuthError }>
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
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const router = useRouter()

  const runInitialSessionCheck = useCallback(async () => {
    const started = typeof performance !== 'undefined' ? performance.now() : 0
    authDevLog('[Auth] Checking initial session...')
    try {
      const { data: { session: nextSession }, error } = await getSessionWithTimeoutAndRetry()

      if (error) {
        console.error('[Auth] Session check error:', error)
        setAuthError(error.message)
        setSession(null)
        setUser(null)
      } else {
        setAuthError(null)
        authDevLog(
          '[Auth] Initial session:',
          nextSession ? `User ${nextSession.user?.id}` : 'No session',
          `(${(performance.now() - started).toFixed(0)}ms)`,
        )
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
      }
    } catch (error) {
      console.error('[Auth] Session check failed:', error)
      setAuthError(
        error instanceof Error
          ? error.message
          : 'Unable to verify your session. Try refreshing the page.',
      )
      setSession(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const retrySessionCheck = useCallback(async () => {
    setAuthError(null)
    setLoading(true)
    await runInitialSessionCheck()
  }, [runInitialSessionCheck])

  useEffect(() => {
    void runInitialSessionCheck()

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      authDevLog('[Auth] State change:', event, session ? `User ${session.user?.id}` : 'No session')

      setSession(session)
      setUser(session?.user ?? null)
      if (session) setAuthError(null)

      // Don't automatically redirect on sign in - let components handle this
      // The middleware will handle protecting routes and the login page will redirect after successful sign in

      if (event === 'SIGNED_OUT') {
        authDevLog('[Auth] User signed out, clearing local data')
        // Safari strict privacy modes can block storage APIs.
        try {
          localStorage.removeItem('onboardingData')
        } catch (storageError) {
          authDevLog('[Auth] Could not clear onboardingData from localStorage:', storageError)
        }
        router.push('/login')
      }

      if (event === 'TOKEN_REFRESHED') {
        authDevLog('[Auth] Token refreshed successfully')
      }

      if (event === 'SIGNED_IN') {
        authDevLog('[Auth] User signed in successfully')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, runInitialSessionCheck])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      authDevLog('[Auth] Attempting sign in for:', email)
      
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
        const msg = error.message.toLowerCase()
        if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
          return {
            error: {
              ...error,
              message:
                'Confirm your email before signing in. Check your inbox and spam folder, or use “Resend confirmation email” on the Sign Up tab.',
            } as AuthError,
          }
        }
        return { error }
      }
      
      authDevLog('[Auth] Sign in successful:', {
        userId: data.user?.id,
        email: data.user?.email,
        emailConfirmed: data.user?.email_confirmed_at ? 'Yes' : 'No'
      })

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setAuthError(null)
      }

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
    metadata?: { full_name?: string; username?: string; account_type?: string }
  ) => {
    try {
      setLoading(true)
      authDevLog('[Auth] Attempting sign up for:', email, 'with metadata:', metadata)
      
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
          emailRedirectTo: getAuthSignUpEmailRedirectTo(),
          data: {
            full_name: metadata?.full_name,
            username: normalizedUsername || metadata?.username,
            account_type: metadata?.account_type || 'general',
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
      
      const needsEmailConfirmation = Boolean(data.user) && !data.session

      authDevLog('[Auth] Sign up successful:', {
        userId: data.user?.id,
        email: data.user?.email,
        needsConfirmation: needsEmailConfirmation ? 'Yes' : 'No'
      })

      if (data.session) {
        setSession(data.session)
        setUser(data.session.user)
        setAuthError(null)
      }

      return { error: undefined, needsEmailConfirmation }
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

  const resendSignupConfirmation = async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      return {
        error: {
          message: 'Enter the email you used to sign up.',
          status: 400,
          name: 'ValidationError',
        } as AuthError,
      }
    }
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: trimmed,
        options: { emailRedirectTo: getAuthSignUpEmailRedirectTo() },
      })
      if (error) {
        let message = error.message
        if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many')) {
          message = 'Too many resend attempts. Wait a few minutes and try again.'
        }
        return { error: { ...error, message } as AuthError }
      }
      return { error: undefined }
    } catch (error) {
      console.error('[Auth] Resend signup confirmation failed:', error)
      return {
        error: {
          message: 'Could not resend the email. Check your connection and try again.',
          status: 500,
          name: 'UnexpectedError',
        } as AuthError,
      }
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      authDevLog('[Auth] Attempting sign out')
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('[Auth] Sign out error:', error)
        return { error }
      }
      
      authDevLog('[Auth] Sign out successful')
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
      authDevLog('[Auth] Attempting password reset for:', email)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) {
        console.error('[Auth] Reset password error:', error)
        return { error }
      }
      
      authDevLog('[Auth] Reset password email sent successfully')
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

      authDevLog('[Auth] Updating profile for user:', user.id, 'with updates:', updates)

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
        authDevLog('[Auth] Profile updated successfully in both auth and profiles table')
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
    authError,
    retrySessionCheck,
    signIn,
    signUp,
    resendSignupConfirmation,
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