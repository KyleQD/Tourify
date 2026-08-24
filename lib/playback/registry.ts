import type {
  MediaResolveRequest,
  MediaResolution,
  MediaResolverContext,
  PlayableMediaKind,
} from "./types"
import { TourifyMusicError } from "@/lib/music/providers/contracts"

export interface MediaResolver<K extends PlayableMediaKind = PlayableMediaKind> {
  readonly kind: K
  resolve(request: Extract<MediaResolveRequest, { kind: K }>, ctx: MediaResolverContext): Promise<MediaResolution>
}

/**
 * Heterogeneous resolver storage. `MediaResolver<any>` widens the
 * contravariant request parameter; dispatch re-narrows per registered kind.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const registry = new Map<PlayableMediaKind, MediaResolver<any>>()

export function registerMediaResolver(resolver: MediaResolver<any>): void {
  registry.set(resolver.kind, resolver)
}

export function getMediaResolver(kind: PlayableMediaKind): MediaResolver | null {
  return registry.get(kind) ?? null
}

export async function dispatchMediaResolve(
  request: MediaResolveRequest,
  ctx: MediaResolverContext
): Promise<MediaResolution> {
  const kind: PlayableMediaKind = request.kind ?? "track"
  const resolver: MediaResolver | null = getMediaResolver(kind)
  if (!resolver) {
    throw new TourifyMusicError(
      "PLAYBACK_RESOLUTION_FAILED",
      `No resolver registered for media kind ${request.kind}.`,
      false
    )
  }
  return resolver.resolve(request as never, ctx)
}
