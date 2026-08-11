export function getAppChromeVisibility(pathname: string) {
  const isAdminRoute = pathname.startsWith("/admin")
  const isVenueRoute = pathname === "/venue" || pathname.startsWith("/venue/")
  const hideRootNav =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    isVenueRoute

  return {
    hideRootNav,
    hidePlayer: isAdminRoute || isVenueRoute,
    isAdminRoute,
    isVenueRoute,
  }
}
