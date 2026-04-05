import { AuthError } from '@supabase/supabase-js'

export interface AuthErrorInfo {
  message: string
  description?: string
  actionable?: boolean
  action?: string
  severity: 'error' | 'warning' | 'info'
}

export function mapAuthError(error: AuthError | Error | string): AuthErrorInfo {
  const errorMessage = typeof error === 'string' ? error : error.message?.toLowerCase() || ''

  // Invalid credentials
  if (errorMessage.includes('invalid login credentials') || 
      errorMessage.includes('invalid credentials') ||
      errorMessage.includes('email not confirmed') ||
      errorMessage.includes('invalid email or password')) {
    return {
      message: 'Invalid email or password',
      description: 'Please check your email and password and try again. Make sure your email is confirmed.',
      actionable: true,
      action: 'Try again or reset your password',
      severity: 'error'
    }
  }

  // Email not confirmed
  if (errorMessage.includes('email not confirmed') || 
      errorMessage.includes('confirm your email')) {
    return {
      message: 'Email not confirmed',
      description: 'Please check your email and click the confirmation link before signing in.',
      actionable: true,
      action: 'Check your email for confirmation link',
      severity: 'warning'
    }
  }

  // User not found
  if (errorMessage.includes('user not found') || 
      errorMessage.includes('no user found')) {
    return {
      message: 'Account not found',
      description: 'No account found with this email address.',
      actionable: true,
      action: 'Create an account or check your email address',
      severity: 'error'
    }
  }

  // User already exists
  if (errorMessage.includes('user already registered') || 
      errorMessage.includes('email already registered') ||
      errorMessage.includes('already registered')) {
    return {
      message: 'Account already exists',
      description: 'An account with this email already exists.',
      actionable: true,
      action: 'Sign in instead or use a different email',
      severity: 'warning'
    }
  }

  // Password too weak
  if (errorMessage.includes('password is too weak') || 
      errorMessage.includes('weak password') ||
      errorMessage.includes('password should be at least')) {
    return {
      message: 'Password too weak',
      description: 'Please choose a stronger password with at least 6 characters.',
      actionable: true,
      action: 'Use a stronger password',
      severity: 'error'
    }
  }

  // Rate limiting
  if (errorMessage.includes('too many requests') || 
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many attempts')) {
    return {
      message: 'Too many attempts',
      description: 'Please wait a few minutes before trying again.',
      actionable: true,
      action: 'Wait and try again later',
      severity: 'warning'
    }
  }

  // OAuth and social provider errors
  if (errorMessage.includes('oauth') ||
      errorMessage.includes('provider') ||
      errorMessage.includes('access_denied') ||
      errorMessage.includes('identity provider')) {
    return {
      message: 'Social sign-in failed',
      description: 'We could not complete sign-in with that provider. Please try again or use email sign-in.',
      actionable: true,
      action: 'Retry social sign-in or continue with email',
      severity: 'warning'
    }
  }

  // Network/connection errors
  if (errorMessage.includes('network') || 
      errorMessage.includes('connection') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout')) {
    return {
      message: 'Connection problem',
      description: 'Unable to connect to our servers. Please check your internet connection.',
      actionable: true,
      action: 'Check your connection and try again',
      severity: 'error'
    }
  }

  // Session expired
  if (errorMessage.includes('session expired') || 
      errorMessage.includes('token expired') ||
      errorMessage.includes('invalid token')) {
    return {
      message: 'Session expired',
      description: 'Your session has expired. Please sign in again.',
      actionable: true,
      action: 'Sign in again',
      severity: 'info'
    }
  }

  // Account disabled/suspended
  if (errorMessage.includes('account disabled') || 
      errorMessage.includes('account suspended') ||
      errorMessage.includes('user disabled')) {
    return {
      message: 'Account disabled',
      description: 'Your account has been disabled. Please contact support for assistance.',
      actionable: true,
      action: 'Contact support',
      severity: 'error'
    }
  }

  // Invalid email format
  if (errorMessage.includes('invalid email') || 
      errorMessage.includes('email format') ||
      errorMessage.includes('malformed email')) {
    return {
      message: 'Invalid email format',
      description: 'Please enter a valid email address.',
      actionable: true,
      action: 'Check your email format',
      severity: 'error'
    }
  }

  // Server errors
  if (errorMessage.includes('internal server error') || 
      errorMessage.includes('500') ||
      errorMessage.includes('server error')) {
    return {
      message: 'Server error',
      description: 'Our servers are experiencing issues. Please try again in a few minutes.',
      actionable: true,
      action: 'Try again later',
      severity: 'error'
    }
  }

  // Generic fallback
  return {
    message: 'Authentication failed',
    description: errorMessage || 'Something went wrong during authentication. Please try again.',
    actionable: true,
    action: 'Try again or contact support if the problem persists',
    severity: 'error'
  }
}

export function getAuthErrorSeverityColor(severity: AuthErrorInfo['severity']): string {
  switch (severity) {
    case 'error':
      return 'bg-red-500/20 border-red-500/50 text-red-200'
    case 'warning':
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
    case 'info':
      return 'bg-blue-500/20 border-blue-500/50 text-blue-200'
    default:
      return 'bg-red-500/20 border-red-500/50 text-red-200'
  }
}

export function getAuthErrorIcon(severity: AuthErrorInfo['severity']): string {
  switch (severity) {
    case 'error':
      return 'AlertCircle'
    case 'warning':
      return 'AlertTriangle'
    case 'info':
      return 'Info'
    default:
      return 'AlertCircle'
  }
} 