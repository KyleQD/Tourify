import { validateProductionEnvironment } from "@/lib/config/environment-contract"

/** @deprecated Use the centralized production environment contract. */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const result = validateProductionEnvironment("runtime")
  return {
    valid: result.valid,
    missing: result.issues
      .filter((issue) => issue.code === "missing")
      .flatMap((issue) => issue.variables),
  }
}
