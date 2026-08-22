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

const registry = new Map<PlayableMediaKind, MediaResolver>()

export function registerMediaResolver(resolver: MediaResolver): void {
  registry.set(resolver.kind, resolver)
}

export function getMediaResolver(kind: PlayableMediaKind): MediaResolver | null {
  return registry.get(kind) ?? null
}

export async function dispatchMediaResolve(
  request: MediaResolveRequest,
  ctx: MediaResolverContext
): Promise<MediaResolution> {
  const resolver = getMediaResolver(request.kind)
  if (!resolver) {
    throw new TourifyMusicError(
      "PLAYBACK_RESOLUTION_FAILED",
      `No resolver registered for media kind ${request.kind}.`,
      false
    )
  }
  return resolver.resolve(request as never, ctx)
}
