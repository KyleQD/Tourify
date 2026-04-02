"use client"

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// =============================================================================
// ERROR BOUNDARY TYPES
// =============================================================================

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showDetails?: boolean
}

// =============================================================================
// ERROR BOUNDARY CLASS COMPONENT
// =============================================================================

class ErrorBoundaryClass extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })
    
    // Log error
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-4">
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute -left-24 top-16 h-64 w-64 rotate-12 rounded-[2rem] bg-purple-500/15 blur-3xl" />
            <div className="absolute -right-20 bottom-8 h-72 w-72 -rotate-12 rounded-[2rem] bg-cyan-400/10 blur-3xl" />
          </div>
          
          <Card className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20">
                <AlertTriangle className="h-8 w-8 text-rose-300" />
              </div>
              <CardTitle className="text-2xl text-white">Something went wrong</CardTitle>
              <CardDescription className="text-slate-300">
                We encountered an unexpected error. This has been logged and our team will investigate.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative space-y-4">
              {/* Error Details (if enabled) */}
              {this.props.showDetails && this.state.error && (
                <div className="rounded-xl border border-white/15 bg-slate-950/40 p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Bug className="w-4 h-4 text-slate-300" />
                    <span className="text-sm font-medium text-slate-200">Error Details</span>
                  </div>
                  <div className="font-mono text-xs text-slate-300">
                    <p className="mb-1 font-semibold text-rose-300">{this.state.error.name}</p>
                    <p className="break-all">{this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
                        {this.state.errorInfo.componentStack.slice(0, 500)}
                        {this.state.errorInfo.componentStack.length > 500 && '...'}
                      </pre>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleRetry}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>
              
              {/* Report Issue */}
              <div className="text-center text-sm text-slate-300">
                <p>
                  If this problem persists, please{' '}
                  <button 
                    onClick={() => window.open('mailto:support@tourify.com?subject=Error Report')}
                    className="text-fuchsia-200 underline hover:text-fuchsia-100"
                  >
                    contact support
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// =============================================================================
// FUNCTIONAL ERROR BOUNDARY WRAPPER
// =============================================================================

export function ErrorBoundary(props: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props} />
}

// =============================================================================
// SPECIALIZED ERROR COMPONENTS
// =============================================================================

// Simple error message component
export function ErrorMessage({ 
  title = "Something went wrong", 
  message, 
  onRetry,
  className = ""
}: {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={`rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-2xl ${className}`}>
      <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-rose-300" />
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      {message && (
        <p className="mx-auto mb-4 max-w-md text-slate-300">{message}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/15">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}

// Network error component
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorMessage
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
    />
  )
}

// Not found error component
export function NotFoundError({ 
  resource = "page",
  onGoBack 
}: { 
  resource?: string
  onGoBack?: () => void 
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/70">
        <span className="text-2xl font-bold text-slate-400">404</span>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">
        {resource.charAt(0).toUpperCase() + resource.slice(1)} Not Found
      </h3>
      <p className="mx-auto mb-4 max-w-md text-slate-300">
        The {resource} you're looking for doesn't exist or has been moved.
      </p>
      {onGoBack && (
        <Button onClick={onGoBack} variant="outline" size="sm" className="border-white/20 bg-white/5 text-slate-100 hover:bg-white/15">
          <Home className="w-4 h-4 mr-2" />
          Go Back
        </Button>
      )}
    </div>
  )
}

// Unauthorized error component
export function UnauthorizedError({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-xl backdrop-blur-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">Access Denied</h3>
      <p className="mx-auto mb-4 max-w-md text-slate-300">
        You don't have permission to access this resource. Please sign in or contact an administrator.
      </p>
      {onSignIn && (
        <Button onClick={onSignIn} size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500">
          Sign In
        </Button>
      )}
    </div>
  )
}

// Generic error handler hook
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error)
    
    // You can integrate with error reporting services here
    // e.g., Sentry, LogRocket, etc.
  }

  return { handleError }
}

// Export the class component as well for direct use
export { ErrorBoundaryClass }