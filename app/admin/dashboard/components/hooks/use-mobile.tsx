/**
 * Compatibility re-export (DESIGN-031) for consumers that still resolve this
 * admin-route-local hook path. The canonical object-returning contract lives at
 * the repo-root `hooks/use-mobile.ts`; callers adapting from the retired
 * boolean-only contract use `const { isMobile } = useIsMobile()`.
 * Relative import is required: this subtree's tsconfig maps `@/*` to itself.
 */
export { useIsMobile } from "../../../../../hooks/use-mobile"
