/**
 * Compatibility re-export (DESIGN-031) for consumers that still resolve the
 * legacy venue hook path. The canonical object-returning contract lives at
 * `hooks/use-mobile.ts`; callers adapting from the retired boolean-only
 * contract use `const { isMobile } = useIsMobile()`.
 */
export { useIsMobile } from "@/hooks/use-mobile"
