/**
 * Shared World ingestion infrastructure (PILOT_INGESTION_SPEC_V0_1 §5/§10/§11).
 * Server-side only: never import from client components.
 */
import { createHash } from "node:crypto"

export const USER_AGENT =
  "TourifyWorldIngestion/0.1 (https://tourify.app; ingest-contact: kyleqdaley@gmail.com)"

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class RateLimiter {
  private last = 0
  constructor(private readonly minIntervalMs: number) {}
  async wait(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.last
    if (elapsed < this.minIntervalMs) await sleep(this.minIntervalMs - elapsed)
    this.last = Date.now()
  }
}

export function sha256json(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value, Object.keys(value as object).sort()))
    .digest("hex")
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export interface JsonFetchOptions {
  headers?: Record<string, string>
  timeoutMs?: number
}

export interface FetchRetryOptions extends JsonFetchOptions {
  retries?: number
  backoffMs?: number
  /** Some APIs return HTTP 200 with {"error": "..."} when busy. */
  retryOnBodyError?: boolean
}

export async function fetchJson<T>(url: string, options: FetchRetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 0
  const backoff = options.backoffMs ?? 1200
  let lastError: unknown = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000)
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...(options.headers ?? {}) },
        signal: controller.signal,
      })
      // 503/429 are the documented transient responses for MusicBrainz.
      if (response.status === 503 || response.status === 429) {
        lastError = new Error(`HTTP ${response.status} (transient) for ${new URL(url).pathname}`)
        if (attempt < retries) {
          await sleep(backoff * Math.pow(2, attempt))
          continue
        }
        throw lastError
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${new URL(url).host}${new URL(url).pathname}`)
      }
      const parsed = (await response.json()) as T
      if (
        options.retryOnBodyError &&
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        typeof (parsed as Record<string, unknown>).error === "string"
      ) {
        lastError = new Error(`body error (transient): ${(parsed as Record<string, unknown>).error}`)
        if (attempt < retries) {
          await sleep(backoff * Math.pow(2, attempt))
          continue
        }
        throw lastError
      }
      return parsed
    } catch (error) {
      lastError = error
      if (attempt >= retries) throw lastError
      await sleep(backoff * Math.pow(2, attempt))
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError ?? new Error("unreachable")
}
