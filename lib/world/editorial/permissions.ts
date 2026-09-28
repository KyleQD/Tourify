export const WORLD_PLATFORM_PERMISSIONS = [
  "world.knowledge.view",
  "world.knowledge.review",
  "world.knowledge.publish",
  "world.sources.manage",
  "world.radio.review",
  "world.ingestion.manage",
] as const

export type WorldPlatformPermission = (typeof WORLD_PLATFORM_PERMISSIONS)[number]

export const WORLD_PLATFORM_ROLES = {
  reviewer: ["world.knowledge.view", "world.knowledge.review"],
  publisher: ["world.knowledge.view", "world.knowledge.review", "world.knowledge.publish"],
  source_manager: ["world.knowledge.view", "world.sources.manage", "world.ingestion.manage"],
  radio_reviewer: ["world.knowledge.view", "world.radio.review"],
  admin: WORLD_PLATFORM_PERMISSIONS,
} as const satisfies Record<string, readonly WorldPlatformPermission[]>

export function isWorldPlatformPermission(value: unknown): value is WorldPlatformPermission {
  return typeof value === "string" && (WORLD_PLATFORM_PERMISSIONS as readonly string[]).includes(value)
}
