import type { WorldPlatformPermission } from "./permissions"

export interface WorldPermissionRpcClient {
  rpc(
    functionName: "has_global_permission",
    args: { p_permission_name: string },
  ): PromiseLike<{ data: boolean | null; error: { message?: string } | null }>
}

export class WorldEditorialAuthorizationError extends Error {
  constructor(
    public readonly code: "permission_check_failed" | "permission_denied",
    message: string,
  ) {
    super(message)
    this.name = "WorldEditorialAuthorizationError"
  }
}

/**
 * Run the World permission check with the caller's authenticated Supabase client.
 * The database helper is SECURITY INVOKER and uses auth.uid(), so this never
 * trusts a client-supplied user id and never needs service-role credentials.
 */
export async function hasWorldPlatformPermission(
  client: WorldPermissionRpcClient,
  permission: WorldPlatformPermission,
): Promise<boolean> {
  const { data, error } = await client.rpc("has_global_permission", {
    p_permission_name: permission,
  })
  if (error) {
    throw new WorldEditorialAuthorizationError(
      "permission_check_failed",
      error.message || "World platform permission check failed.",
    )
  }
  return data === true
}

export async function requireWorldPlatformPermission(
  client: WorldPermissionRpcClient,
  permission: WorldPlatformPermission,
): Promise<void> {
  if (!(await hasWorldPlatformPermission(client, permission))) {
    throw new WorldEditorialAuthorizationError(
      "permission_denied",
      `Required World permission is missing: ${permission}`,
    )
  }
}
