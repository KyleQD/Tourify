/**
 * lib/events/providers/registry.ts
 *
 * Map-backed event provider registry. Adapters self-register at module
 * load (import the adapter module for its side effect on the server).
 * Pattern mirrors lib/music/providers/registry.ts.
 */

import {
  EventProviderError,
  type EventProvider,
  type EventProviderAdapter,
} from "./types"

const registry = new Map<EventProvider, EventProviderAdapter>()

export function registerEventProvider(adapter: EventProviderAdapter): void {
  registry.set(adapter.provider, adapter)
}

export function getEventProvider(id: EventProvider): EventProviderAdapter | undefined {
  return registry.get(id)
}

export function requireEventProvider(id: EventProvider): EventProviderAdapter {
  const adapter = registry.get(id)
  if (!adapter) {
    throw new EventProviderError(
      "DISABLED",
      `Event provider "${id}" is not registered or is currently disabled.`,
      false,
      id,
    )
  }
  return adapter
}

export function listEventProviders(): EventProvider[] {
  return Array.from(registry.keys())
}
