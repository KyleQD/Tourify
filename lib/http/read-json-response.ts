/**
 * Safely parse a Response body as JSON.
 * Empty / truncated bodies (common during Turbopack recompiles or aborted
 * long-running API routes) return null instead of throwing SyntaxError.
 */
export async function readJsonResponse<T = unknown>(
  response: Response
): Promise<T | null> {
  const text = await response.text().catch(() => '')
  if (!text.trim()) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}
