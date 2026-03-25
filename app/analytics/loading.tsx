import { BrandLoadingScreen } from '@/components/ui/brand-loading-screen'

export default function Loading() {
  return (
    <BrandLoadingScreen
      message="Loading..."
      logoSrc="/tourify-logo-white.svg"
      fullScreen={false}
    />
  )
}
