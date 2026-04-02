"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 p-4 text-white">
          <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-purple-900/20 backdrop-blur-2xl">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="mb-6 rounded-xl border border-white/10 bg-slate-950/30 p-3 text-slate-200">{this.state.error?.message || "An unexpected error occurred."}</p>
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false })
                  window.location.reload()
                }}
                className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-fuchsia-500"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
