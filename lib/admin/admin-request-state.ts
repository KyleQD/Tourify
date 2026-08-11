export type AdminRequestStatus =
  | "loading"
  | "ready"
  | "empty"
  | "denied"
  | "unavailable"
  | "stale"
  | "error"

export type AdminRequestState<T> =
  | { status: "loading"; data: null; message: null }
  | { status: "ready"; data: T; message: null }
  | { status: "empty"; data: T; message: null }
  | { status: "denied"; data: null; message: string }
  | { status: "unavailable"; data: null; message: string }
  | { status: "stale"; data: T; message: string }
  | { status: "error"; data: null; message: string }

export function loadingAdminRequest<T>(): AdminRequestState<T> {
  return { status: "loading", data: null, message: null }
}

export function resolvedAdminRequest<T>(
  data: T,
  options: { empty?: boolean; stale?: boolean; staleMessage?: string } = {},
): AdminRequestState<T> {
  if (options.stale) {
    return {
      status: "stale",
      data,
      message: options.staleMessage || "This data may be out of date.",
    }
  }
  return options.empty
    ? { status: "empty", data, message: null }
    : { status: "ready", data, message: null }
}

export function failedAdminRequest<T>(
  statusCode: number,
  message?: string,
): AdminRequestState<T> {
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: "denied",
      data: null,
      message: message || "You do not have access to this data.",
    }
  }
  if (statusCode === 409 || statusCode === 503) {
    return {
      status: "unavailable",
      data: null,
      message: message || "This data is temporarily unavailable.",
    }
  }
  return {
    status: "error",
    data: null,
    message: message || "The request failed.",
  }
}

export function isAdminRequestFailure(status: AdminRequestStatus): boolean {
  return status === "denied" || status === "unavailable" || status === "error"
}
