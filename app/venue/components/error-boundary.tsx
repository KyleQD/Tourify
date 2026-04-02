"use client"

import React from 'react'
import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <AlertTriangle className="mb-4 h-12 w-12 text-amber-300" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="mb-4 max-w-md rounded-xl border border-white/10 bg-slate-950/30 p-3 text-slate-200">
              {this.state.error?.message || "An unexpected error occurred while rendering this component."}
            </p>
            <Button onClick={this.handleReset} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500">Try Again</Button>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
