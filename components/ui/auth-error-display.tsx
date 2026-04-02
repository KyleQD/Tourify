import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertCircle, AlertTriangle, Info, RefreshCw } from "lucide-react"
import { AuthErrorInfo, getAuthErrorSeverityColor } from "@/lib/auth-errors"

interface AuthErrorDisplayProps {
  error: AuthErrorInfo
  onRetry?: () => void
  onContactSupport?: () => void
  className?: string
}

export function AuthErrorDisplay({ 
  error, 
  onRetry, 
  onContactSupport, 
  className = "" 
}: AuthErrorDisplayProps) {
  const getIcon = () => {
    switch (error.severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />
      case 'info':
        return <Info className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getIconColor = () => {
    switch (error.severity) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-red-400'
    }
  }

  return (
    <Alert className={`${getAuthErrorSeverityColor(error.severity)} rounded-2xl border-white/20 shadow-xl backdrop-blur-2xl ${className}`}>
      <div className={getIconColor()}>
        {getIcon()}
      </div>
      <AlertDescription className="space-y-3 text-slate-100">
        <div>
          <div className="font-semibold text-white">
            {error.message}
          </div>
          {error.description && (
            <div className="mt-1 text-sm text-slate-200/90">
              {error.description}
            </div>
          )}
        </div>
        
        {error.actionable && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            )}
            
            {error.message.includes('support') && onContactSupport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onContactSupport}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              >
                Contact Support
              </Button>
            )}
            
            {error.message.includes('confirmation') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('mailto:', '_blank')}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
              >
                Check Email
              </Button>
            )}
          </div>
        )}
        
        {error.action && (
          <div className="text-xs italic text-slate-200/80">
            💡 {error.action}
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
} 