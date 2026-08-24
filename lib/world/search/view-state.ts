/**
 * P22-T04 — search-result → World view-state mapping.
 *
 * Selecting a result translates deterministically into globe/page state:
 * camera target, selected place, active layer, filters, detail panel.
 */

import type { SearchKind, SearchResult } from "./federated-search"
import type { WorldLayer } from "@/lib/world/globe/zoom-policy"

export interface WorldViewState {
  cameraTargetPlaceKey: string | null
  selectedPlaceKey: string | null
  activeLayer: WorldLayer | null
  genreFilter: string | null
  eraFilter: string | null
  /** Which detail panel to open, if any. */
  panel: { kind: "place" | "journey" | "instrument" | null; key: string | null }
}

const KIND_TO_LAYER: Partial<Record<SearchKind, WorldLayer>> = {
  artist: "artists",
  venue: "venues",
  event: "events",
  radio: "places",
  place: "places",
  scene: "scenes",
}

/** Map a selected result into view state. Pure; no side effects. */
export function resultToViewState(
  result: SearchResult,
  current: Partial<WorldViewState> = {},
): WorldViewState {
  const layer = KIND_TO_LAYER[result.kind] ?? null

  // Place-like results navigate the camera and open the place page.
  if (result.kind === "place") {
    return {
      cameraTargetPlaceKey: result.id,
      selectedPlaceKey: result.id,
      activeLayer: layer,
      genreFilter: null,
      eraFilter: null,
      panel: { kind: "place", key: result.id },
    }
  }

  // Journey/instrument results open their own panels without camera moves.
  if (result.kind === "journey" || result.kind === "instrument") {
    return {
      cameraTargetPlaceKey: current.cameraTargetPlaceKey ?? null,
      selectedPlaceKey: current.selectedPlaceKey ?? null,
      activeLayer: current.activeLayer ?? null,
      genreFilter: current.genreFilter ?? null,
      eraFilter: current.eraFilter ?? null,
      panel: { kind: result.kind === "journey" ? "journey" : "instrument", key: result.id },
    }
  }

  // Entity results scope to their owning place and preselect the layer.
  const ownerPlace = result.placePath?.split("/").pop() ?? null
  return {
    cameraTargetPlaceKey: ownerPlace,
    selectedPlaceKey: ownerPlace,
    activeLayer: layer,
    genreFilter: result.kind === "genre" ? result.name.toLowerCase() : current.genreFilter ?? null,
    eraFilter: current.eraFilter ?? null,
    panel: { kind: "place", key: ownerPlace },
  }
}
