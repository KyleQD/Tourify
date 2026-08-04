"use client"

import type { ReactNode } from "react"

import type { PostAppearanceSurface } from "@/lib/appearance/contracts"
import {
  resolvePostAppearanceDTO,
  type RawPostAppearanceRow,
} from "@/lib/feed/resolve-post-appearance-dto"

import { StyledPostRoot } from "./styled-post-root"

interface PostAppearanceBoundaryProps {
  postId: string
  appearance?: RawPostAppearanceRow | RawPostAppearanceRow[] | null
  enabled: boolean
  surface?: PostAppearanceSurface
  children: ReactNode
}

export function PostAppearanceBoundary({
  postId,
  appearance,
  enabled,
  surface = "feed",
  children,
}: PostAppearanceBoundaryProps) {
  const resolved = enabled
    ? resolvePostAppearanceDTO(appearance, postId)
    : { mode: "standard" as const }

  if (resolved.mode !== "styled") return children

  return (
    <StyledPostRoot postId={postId} appearance={resolved} surface={surface}>
      {children}
    </StyledPostRoot>
  )
}
