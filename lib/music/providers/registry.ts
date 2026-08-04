/**
 * lib/music/providers/registry.ts
 *
 * Simple Map-backed provider registry.
 * Adapters register themselves at module load time.
 * Business logic calls this to resolve the correct adapter by provider ID.
 */

import type { MusicProviderAdapter, MusicProviderId } from "./contracts"

const registry = new Map<MusicProviderId, MusicProviderAdapter>()

/**
 * Register a provider adapter. Typically called at module level in each adapter file.
 * Calling register() twice for the same provider ID will overwrite the previous entry.
 */
export function registerProvider(adapter: MusicProviderAdapter): void {
  registry.set(adapter.id, adapter)
}

/**
 * Get a provider adapter by ID.
 * Returns undefined if the provider is not registered (e.g. feature-flagged off).
 */
export function getProvider(id: MusicProviderId): MusicProviderAdapter | undefined {
  return registry.get(id)
}

/**
 * Get a provider adapter by ID. Throws TourifyMusicError if not found.
 */
export function requireProvider(id: MusicProviderId): MusicProviderAdapter {
  const adapter = registry.get(id)
  if (!adapter) {
    const { TourifyMusicError } = require("./contracts") as typeof import("./contracts")
    throw new TourifyMusicError(
      "FEATURE_DISABLED",
      `Provider "${id}" is not registered or is currently disabled.`,
      false
    )
  }
  return adapter
}

/**
 * Returns all currently registered provider IDs.
 */
export function listProviders(): MusicProviderId[] {
  return Array.from(registry.keys())
}
