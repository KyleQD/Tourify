import type { WorldPlaceKnowledgeSnapshot } from "./contracts"

export interface WorldHistoryRepository {
  listPilotKeys(): Promise<string[]>
  getPlaceKnowledgeByKey(key: string): Promise<WorldPlaceKnowledgeSnapshot | null>
  getPlaceKnowledgeByPath(path: string): Promise<WorldPlaceKnowledgeSnapshot | null>
}
