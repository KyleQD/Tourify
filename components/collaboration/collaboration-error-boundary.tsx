"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface CollaborationErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class CollaborationErrorBoundary extends React.Component<
  CollaborationErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: CollaborationErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Collaboration component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 text-white shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-rose-300">
              <AlertCircle className="h-5 w-5" />
              Collaboration Feature Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-xl border border-white/10 bg-slate-950/30 p-3 text-slate-200">
              The collaboration feature encountered an error and couldn't load properly.
            </p>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => this.setState({ hasError: false })}
                className="flex items-center gap-2 border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 border-white/20 bg-white/5 text-slate-100 hover:bg-white/15"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-300">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-slate-950/50 p-2 text-xs text-rose-200">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}