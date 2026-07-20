"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getAuthSignUpEmailRedirectTo } from '@/lib/auth/auth-email-redirect'
import { isEmailNotConfirmedAuthError } from '@/lib/auth-errors'
function authDevLog(...args: unknown[]) {
  if (process.env.NODE_ENV !== 'development') return
  console.log(...args)
}

type SocialProvider = 'google' | 'apple' | 'facebook'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  authError: string | null
  /** Re-run initial session read from Supabase (e.g. after network recovery). */
  retrySessionCheck: () => Promise<void>
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error?: AuthError; needsEmailVerification?: boolean }>
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
  /**
   * `onAuthStateChange` (e.g. INITIAL_SESSION) can hydrate session before `getUser()`
   * finishes or if `getUser()` times out on slow / strict browsers (Safari Private).
   * Never wipe listener-hydrated auth in that case.
   */
  const authListenerHydratedRef = useRef(false)

  const runInitialSessionCheck = useCallback(async () => {
    const started = typeof performance !== 'undefined' ? performance.now() : 0
    authDevLog('[Auth] Checking initial auth...')
    let sessionHydrated = false
    const AUTH_CHECK_TIMEOUT_MS = 8_000

    function withTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        const timeoutId = globalThis.setTimeout(() => {
          reject(new Error(`[Auth] ${label} timed out after ${AUTH_CHECK_TIMEOUT_MS}ms`))
        }, AUTH_CHECK_TIMEOUT_MS)
        Promise.resolve(promise).then(
          (value) => {
            globalThis.clearTimeout(timeoutId)
            resolve(value)
          },
          (error) => {
            globalThis.clearTimeout(timeoutId)
            reject(error)
          },
        )
      })
    }

    try {
      // Seed from local/cookie session first so nav and account UI hydrate immediately.
      // getUser() still validates with the auth server afterward.
      const { data: { session: existingSession }, error: sessionError } =
        await withTimeout(supabase.auth.getSession(), 'getSession')

      if (sessionError)
        console.warn('[Auth] getSession warning:', sessionError.message)

      if (existingSession?.user) {
        sessionHydrated = true
        authListenerHydratedRef.current = true
        setSession(existingSession)
        setUser(existingSession.user)
        setAuthError(null)
        setLoading(false)
        authDevLog(
          '[Auth] Session seeded:',
          `User ${existingSession.user.id}`,
          `(${(performance.now() - started).toFixed(0)}ms)`,
        )
      }

      const { data: { user: nextUser }, error } = await withTimeout(
        supabase.auth.getUser(),
        'getUser',
      )

      if (error) {
        const isMissingSession =
          error.name === 'AuthSessionMissingError' ||
          /auth session missing/i.test(error.message || '')

        // Unauthenticated visitors hit this on /login — not a failure.
        if (isMissingSession && !sessionHydrated && !authListenerHydratedRef.current) {
          setAuthError(null)
          setSession(null)
          setUser(null)
        } else if (authListenerHydratedRef.current || sessionHydrated) {
          console.warn(
            '[Auth] getUser reported error but session already hydrated; keeping auth state:',
            error.message,
          )
          setAuthError(null)
        } else {
          console.error('[Auth] Auth check error:', error)
          setAuthError(error.message)
          setSession(null)
          setUser(null)
        }
      } else if (nextUser) {
        setAuthError(null)
        authListenerHydratedRef.current = true
        setUser(nextUser)
        if (!existingSession)
          setSession((prev) => prev ?? null)
        authDevLog(
          '[Auth] Initial auth:',
          `User ${nextUser.id}`,
          `(${(performance.now() - started).toFixed(0)}ms)`,
        )
      } else if (!sessionHydrated && !authListenerHydratedRef.current) {
        setAuthError(null)
        setSession(null)
        setUser(null)
        authDevLog(
          '[Auth] Initial auth: No user',
          `(${(performance.now() - started).toFixed(0)}ms)`,
        )
      }
    } catch (error) {
      console.error('[Auth] Auth check failed:', error)
      if (authListenerHydratedRef.current || sessionHydrated) {
        console.warn(
          '[Auth] getUser failed or timed out but session already hydrated; keeping user',
        )
        setAuthError(null)
      } else {
        setAuthError(
          error instanceof Error
            ? error.message
            : 'Unable to verify your session. Try refreshing the page.',
        )
        setSession(null)
        setUser(null)
      }
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
    let cancelled = false

    // Sync callback only — async work inside onAuthStateChange deadlocks the auth lock
    // (getSession/from hang; EPK/music client queries never return).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      authDevLog('[Auth] State change:', event, session ? `User ${session.user?.id}` : 'No session')

      authListenerHydratedRef.current = Boolean(session)
      setSession(session)
      setUser(session?.user ?? null)
      if (session) setAuthError(null)

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT' || session) {
        setLoading(false)
      }

      if (event === 'SIGNED_OUT') {
        authListenerHydratedRef.current = false
        authDevLog('[Auth] User signed out, clearing local data')
        try {
          localStorage.removeItem('onboardingData')
        } catch (storageError) {
          authDevLog('[Auth] Could not clear onboardingData from localStorage:', storageError)
        }
        // Navigation is handled by signOut() / /auth/signout after cookies clear.
      }

      if (event === 'TOKEN_REFRESHED') {
        authDevLog('[Auth] Token refreshed successfully')
      }

      if (event === 'SIGNED_IN') {
        authDevLog('[Auth] User signed in successfully')
      }
    })

    // Validate after the listener is registered so we do not race initialize/lock.
    queueMicrotask(() => {
      if (!cancelled) {
        runInitialSessionCheck().catch(() => {})
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [runInitialSessionCheck])

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
        if (isEmailNotConfirmedAuthError(error)) {
          return {
            needsEmailVerification: true,
            error: {
              ...error,
              message:
                'Confirm your email before signing in. Check your inbox and spam folder, or tap “Resend verification email” in the dialog.',
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

      try {
        await supabase.auth.signOut({ scope: 'global' })
      } catch {
        /* Server route is authoritative for cookie clearing. */
      }

      try {
        const keys = Object.keys(localStorage).filter(
          (key) =>
            key.includes('sb-cloudify-auth') ||
            key.includes('supabase.auth') ||
            key === 'sb-cloudify-auth-token' ||
            key === 'cloudify_remember_session' ||
            key === 'onboardingData'
        )
        for (const key of keys) localStorage.removeItem(key)
      } catch {
        /* noop */
      }

      if (typeof window !== 'undefined')
        window.location.assign('/auth/signout')

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