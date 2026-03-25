"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { BrandLoadingScreen } from "@/components/ui/brand-loading-screen"

export default function HomePage() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only redirect after initial loading is complete and we have auth state
    if (!loading) {
      if (isAuthenticated && user) {
        // Redirect authenticated users to dashboard
        router.push('/dashboard')
        return
      } else {
        // Redirect unauthenticated users to login
        router.push('/login')
        return
      }
    }
  }, [loading, isAuthenticated, user, router])

  // Show branded loading state while determining auth status
  return (
    <BrandLoadingScreen
      message="Loading..."
      logoSrc="/tourify-logo-white.svg"
      fullScreen={true}
    />
  )
}

