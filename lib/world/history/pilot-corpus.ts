import type { WorldHistoryPilotBundle } from "./contracts"
import detroit from "@/data/world/pilots/detroit.json"
import kingston from "@/data/world/pilots/kingston.json"
import lagos from "@/data/world/pilots/lagos.json"
import london from "@/data/world/pilots/london.json"
import tokyo from "@/data/world/pilots/tokyo.json"

const PILOTS = [detroit, kingston, lagos, london, tokyo] as WorldHistoryPilotBundle[]
const BY_KEY = new Map(PILOTS.map((pilot) => [pilot.pilot_key, pilot]))
const BY_PATH = new Map(PILOTS.map((pilot) => [pilot.place_path, pilot]))

export function listWorldHistoryPilotKeys(): string[] {
  return [...BY_KEY.keys()]
}

export function getWorldHistoryPilotByKey(key: string): WorldHistoryPilotBundle | null {
  return BY_KEY.get(key) ?? null
}

export function getWorldHistoryPilotByPath(path: string): WorldHistoryPilotBundle | null {
  return BY_PATH.get(path) ?? null
}
