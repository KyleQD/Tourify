import { env } from "@/lib/config/env"
import { supabase } from "@/lib/supabase/client"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Network from "expo-network"

interface ApiRequestOptions extends RequestInit {
  authRequired?: boolean
  queueOnOffline?: boolean
  preferCachedOnOffline?: boolean
  skipOfflineQueue?: boolean
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export class QueuedOfflineError extends ApiError {
  queued: true

  constructor(message = "No service. Request saved and will sync when connection returns.") {
    super(message, 0)
    this.name = "QueuedOfflineError"
    this.queued = true
  }
}

interface CachedApiResponse {
  cachedAt: number
  payload: string
}

export interface QueuedApiRequest {
  id: string
  path: string
  method: string
  body?: string
  authRequired: boolean
  createdAt: string
}

const OFFLINE_CACHE_PREFIX = "tourify-mobile:api-cache:v1:"
const OFFLINE_QUEUE_KEY = "tourify-mobile:api-queue:v1"
const CONNECTIVITY_TIMEOUT_MS = 4500

async function buildHeaders(options?: ApiRequestOptions) {
  const headers = new Headers(options?.headers)
  if (options?.body && !(options.body instanceof FormData) && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json")

  const authRequired = options?.authRequired ?? true
  if (!authRequired) return headers

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`)
  return headers
}

function getCacheKey(path: string) {
  return `${OFFLINE_CACHE_PREFIX}${encodeURIComponent(path)}`
}

async function isApiReachable() {
  const networkState = await Network.getNetworkStateAsync()
  const isConnected = Boolean(networkState.isConnected)
  if (!isConnected) return false
  if (networkState.isInternetReachable === false) return false

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), CONNECTIVITY_TIMEOUT_MS)

  try {
    const response = await fetch(`${env.apiBaseUrl}/api/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal
    })
    return response.status < 500
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

async function readCachedResponse(path: string) {
  const raw = await AsyncStorage.getItem(getCacheKey(path))
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as CachedApiResponse
    return parsed.payload
  } catch {
    return null
  }
}

async function writeCachedResponse(path: string, payload: string) {
  const cacheEntry: CachedApiResponse = {
    cachedAt: Date.now(),
    payload
  }
  await AsyncStorage.setItem(getCacheKey(path), JSON.stringify(cacheEntry))
}

async function readQueue() {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as QueuedApiRequest[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeQueue(items: QueuedApiRequest[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items))
}

async function enqueueRequest(path: string, options?: ApiRequestOptions) {
  const method = (options?.method || "GET").toUpperCase()
  if (method === "GET") return

  const queue = await readQueue()
  const nextItem: QueuedApiRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    path,
    method,
    body: typeof options?.body === "string" ? options.body : undefined,
    authRequired: options?.authRequired ?? true,
    createdAt: new Date().toISOString()
  }

  queue.push(nextItem)
  await writeQueue(queue)
}

export function isQueuedOfflineError(error: unknown): error is QueuedOfflineError {
  return error instanceof QueuedOfflineError
}

function parseJsonPayload<T>(payload: string) {
  if (!payload) return {} as T
  return JSON.parse(payload) as T
}

async function sendRequest(path: string, options?: ApiRequestOptions) {
  const headers = await buildHeaders(options)
  return fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers
  })
}

async function sendRequestWithSessionRefresh(path: string, options?: ApiRequestOptions) {
  const initialResponse = await sendRequest(path, options)
  const authRequired = options?.authRequired ?? true
  if (!authRequired || initialResponse.status !== 401) return initialResponse

  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session) return initialResponse

  return sendRequest(path, options)
}

async function getOfflineFallback<T>(path: string, options?: ApiRequestOptions) {
  const method = (options?.method || "GET").toUpperCase()
  if (method === "GET" && (options?.preferCachedOnOffline ?? true)) {
    const cachedPayload = await readCachedResponse(path)
    if (cachedPayload) return parseJsonPayload<T>(cachedPayload)
  }

  if (method !== "GET" && (options?.queueOnOffline ?? true) && !options?.skipOfflineQueue) {
    await enqueueRequest(path, options)
    throw new QueuedOfflineError()
  }

  throw new ApiError("No network connection available.", 0)
}

export async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const method = (options?.method || "GET").toUpperCase()
  const isOnline = await isApiReachable()
  if (!isOnline) return getOfflineFallback<T>(path, options)

  let response: Response
  try {
    response = await sendRequestWithSessionRefresh(path, options)
  } catch {
    return getOfflineFallback<T>(path, options)
  }

  if (!response.ok) {
    const rawMessage = await response.text()
    const parsedMessage = tryExtractErrorMessage(rawMessage)
    const message = parsedMessage || rawMessage || `API request failed: ${response.status}`
    throw new ApiError(message, response.status)
  }

  const payload = await response.text()
  if (method === "GET" && payload) await writeCachedResponse(path, payload)
  return parseJsonPayload<T>(payload)
}

function tryExtractErrorMessage(payload: string) {
  try {
    const parsed = JSON.parse(payload) as {
      error?: string | { message?: string }
      details?: string
      message?: string
    }

    if (parsed.error && typeof parsed.error === "object" && parsed.error.message)
      return parsed.error.message

    if (typeof parsed.error === "string") return parsed.error
    return parsed.details || parsed.message || null
  } catch {
    return null
  }
}

export async function getOfflineQueueSize() {
  const queue = await readQueue()
  return queue.length
}

export async function exportOfflineQueueItems() {
  return readQueue()
}

export async function mergeOfflineQueueItems(items: QueuedApiRequest[]) {
  if (!items.length) return { added: 0, total: await getOfflineQueueSize() }

  const current = await readQueue()
  const currentIds = new Set(current.map((item) => item.id))
  const normalizedIncoming = items.filter((item) => item.path && item.method)
  const deduped = normalizedIncoming.filter((item) => !currentIds.has(item.id))
  const nextQueue = [...current, ...deduped]
  await writeQueue(nextQueue)
  return { added: deduped.length, total: nextQueue.length }
}

export async function flushQueuedApiRequests() {
  const queue = await readQueue()
  if (!queue.length) return { flushed: 0, remaining: 0 }

  const remaining: QueuedApiRequest[] = []
  let flushed = 0

  for (const item of queue) {
    try {
      const response = await sendRequestWithSessionRefresh(item.path, {
        method: item.method,
        body: item.body,
        authRequired: item.authRequired,
        skipOfflineQueue: true
      })
      if (!response.ok) {
        remaining.push(item)
        continue
      }
      flushed++
    } catch {
      remaining.push(item)
    }
  }

  await writeQueue(remaining)
  return { flushed, remaining: remaining.length }
}

export async function checkApiConnectivity() {
  return isApiReachable()
}
