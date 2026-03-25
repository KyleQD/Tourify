import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

// =============================================================================
// NEXT.JS APP ROUTER LOADING PAGE
// This will be shown automatically during route transitions
// =============================================================================

export default function Loading() {
  return (
    <BrandLoadingScreen
      message="Loading..."
      logoSrc="/tourify-logo-white.svg"
      fullScreen={false}
    />
  )
}