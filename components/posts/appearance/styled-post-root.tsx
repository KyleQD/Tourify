"use client"

import React from "react"
import type { PostAppearanceDTO } from "@/lib/appearance/contracts"
import type { EpkSkinId } from "@/lib/epk/epk-skin-tokens"
import { compilePostAppearance } from "@/lib/appearance/compile"
import { trackAppearanceEvent } from "@/lib/appearance/telemetry"
import { PostStyleBoundary } from "./post-style-boundary"
import { StandardPostFallback } from "./standard-post-fallback"
import { resolvePostAppearanceSnapshot } from "@/lib/post-appearance/resolve"
import type { PostCompiledAppearance } from "@/lib/appearance/compile"
import { PostTemplateFrame } from "./post-template-adapter"

const compiledAppearanceCache = new Map<string, PostCompiledAppearance>()
const MAX_COMPILED_APPEARANCES = 200

function cacheCompiledAppearance(key: string, value: PostCompiledAppearance) {
  if (compiledAppearanceCache.size >= MAX_COMPILED_APPEARANCES) {
    const oldest = compiledAppearanceCache.keys().next().value
    if (oldest) compiledAppearanceCache.delete(oldest)
  }
  compiledAppearanceCache.set(key, value)
  return value
}

interface StyledPostRootProps {
  postId: string
  appearance: Extract<PostAppearanceDTO, { mode: "styled" }>
  children: React.ReactNode
  surface?: string
  articleProps?: React.HTMLAttributes<HTMLElement>
}

interface ErrorState {
  hasError: boolean
}

class StyledPostRootBoundary extends React.Component<
  StyledPostRootProps & { fallback: React.ReactNode },
  ErrorState
> {
  constructor(props: StyledPostRootProps & { fallback: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    trackAppearanceEvent({
      type: "renderer_fallback",
      reason: "renderer_error",
      templateId: this.props.appearance.templateId,
      surface: this.props.surface ?? "feed",
    })
    console.error("[post-style] Renderer error, using fallback:", error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

/**
 * Renders a styled post using the appearance snapshot.
 * Falls back to StandardPostFallback on any compilation or rendering error.
 */
export function StyledPostRoot({
  postId,
  appearance,
  children,
  surface = "feed",
  articleProps,
}: StyledPostRootProps) {
  let compiled
  try {
    const resolved = resolvePostAppearanceSnapshot(appearance.snapshot)
    const cacheKey = appearance.snapshotHash
      ? `${appearance.templateId}:${appearance.snapshotHash}`
      : null
    compiled =
      (cacheKey ? compiledAppearanceCache.get(cacheKey) : undefined) ??
      compilePostAppearance(
        appearance.templateId as EpkSkinId,
        resolved.legacyTokens,
        resolved.configuration,
      )
    if (cacheKey && !compiledAppearanceCache.has(cacheKey)) {
      cacheCompiledAppearance(cacheKey, compiled)
    }
  } catch (err) {
    trackAppearanceEvent({
      type: "renderer_fallback",
      reason: "renderer_error",
      templateId: appearance.templateId,
      surface,
    })
    return (
      <article {...articleProps} data-post-id={postId}>
        <StandardPostFallback>{children}</StandardPostFallback>
      </article>
    )
  }

  const fallback = (
    <article {...articleProps} data-post-id={postId}>
      <StandardPostFallback>{children}</StandardPostFallback>
    </article>
  )

  return (
    <StyledPostRootBoundary
      postId={postId}
      appearance={appearance}
      fallback={fallback}
      surface={surface}
    >
      <PostStyleBoundary
        postId={postId}
        templateId={appearance.templateId}
        templateVersion={appearance.templateVersion}
        compiled={compiled}
        surface={surface}
        articleProps={articleProps}
      >
        <PostTemplateFrame templateId={appearance.templateId}>
          {children}
        </PostTemplateFrame>
      </PostStyleBoundary>
    </StyledPostRootBoundary>
  )
}
