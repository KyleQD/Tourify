import { isProductionDeniedRoute } from '@/lib/config/launch-capabilities'

export function isProductionBlockedPathname(pathname: string) {
  return isProductionDeniedRoute(pathname)
}
