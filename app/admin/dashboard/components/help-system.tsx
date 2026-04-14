"use client"

/** Legacy shim: use `useProductEducation` from `@/components/product-education/product-education-context`. */
import { useProductEducation } from "@/components/product-education/product-education-context"

export function useHelpSystem() {
  const { openHelp, closeHelp, drawerOpen } = useProductEducation()
  return {
    isOpen: drawerOpen,
    openHelp,
    closeHelp,
    currentPage: undefined as string | undefined,
  }
}
