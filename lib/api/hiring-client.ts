export interface HiringApiError {
  message: string
  code: string
  status?: number
  retryable: boolean
  cause?: unknown
}

export type HiringApiResult<TData> =
  | {
      ok: true
      data: TData
      response: Response
    }
  | {
      ok: false
      error: HiringApiError
      response?: Response
    }

interface ReadHiringJsonOptions<TData> {
  fallbackData?: TData
  fallbackErrorMessage?: string
  unwrapData?: boolean
}

const DEFAULT_HIRING_ERROR_MESSAGE = "Failed to load hiring data."
const TRANSPORT_ERROR_MESSAGE = "Hiring data is temporarily unavailable. Check your connection and try again."

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback

  const error = payload.error
  if (typeof error === "string" && error.trim()) return error
  if (isRecord(error) && typeof error.message === "string" && error.message.trim()) return error.message

  if (typeof payload.message === "string" && payload.message.trim()) return payload.message

  return fallback
}

function getErrorCode(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback

  const error = payload.error
  if (isRecord(error) && typeof error.code === "string" && error.code.trim()) return error.code
  if (typeof payload.code === "string" && payload.code.trim()) return payload.code

  return fallback
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500
}

function mergeJsonHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers)
  if (!merged.has("Accept")) {
    merged.set("Accept", "application/json")
  }

  return merged
}

function buildFailure(
  message: string,
  code: string,
  retryable: boolean,
  response?: Response,
  cause?: unknown
): HiringApiResult<never> {
  return {
    ok: false,
    error: {
      message,
      code,
      status: response?.status,
      retryable,
      cause,
    },
    response,
  }
}

function unwrapHiringPayload<TData>(payload: unknown, fallbackData?: TData, unwrapData = true): TData {
  if (unwrapData && isRecord(payload) && "data" in payload) {
    return (payload.data as TData) ?? (fallbackData as TData)
  }

  return (payload as TData) ?? (fallbackData as TData)
}

async function readJsonPayload(response: Response): Promise<{ ok: true; payload: unknown } | { ok: false; error: unknown }> {
  const text = await response.text().catch((error) => {
    return { __readError: error }
  })

  if (typeof text !== "string") {
    return { ok: false, error: text.__readError }
  }

  if (!text.trim()) {
    return { ok: true, payload: undefined }
  }

  try {
    return { ok: true, payload: JSON.parse(text) as unknown }
  } catch (error) {
    return { ok: false, error }
  }
}

export async function readHiringJson<TData>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: ReadHiringJsonOptions<TData> = {}
): Promise<HiringApiResult<TData>> {
  const fallbackErrorMessage = options.fallbackErrorMessage ?? DEFAULT_HIRING_ERROR_MESSAGE

  let response: Response
  try {
    response = await fetch(input, {
      ...init,
      headers: mergeJsonHeaders(init.headers),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return buildFailure("Request cancelled.", "aborted", false, undefined, error)
    }

    return buildFailure(TRANSPORT_ERROR_MESSAGE, "transport_error", true, undefined, error)
  }

  const parsed = await readJsonPayload(response)

  if (!parsed.ok) {
    if (response.ok) {
      return buildFailure("Hiring data returned an invalid response.", "invalid_json", false, response, parsed.error)
    }

    return buildFailure(fallbackErrorMessage, `http_${response.status}`, isRetryableStatus(response.status), response, parsed.error)
  }

  const payload = parsed.payload
  const payloadReportsFailure = isRecord(payload) && payload.ok === false

  if (!response.ok || payloadReportsFailure) {
    const message = getErrorMessage(payload, fallbackErrorMessage)
    const code = getErrorCode(payload, response.ok ? "api_error" : `http_${response.status}`)
    return buildFailure(message, code, response.ok ? false : isRetryableStatus(response.status), response)
  }

  return {
    ok: true,
    data: unwrapHiringPayload<TData>(payload, options.fallbackData, options.unwrapData ?? true),
    response,
  }
}

export function buildNoStoreHiringRequestInit(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    cache: "no-store",
    headers: mergeJsonHeaders(init.headers),
  }
}
