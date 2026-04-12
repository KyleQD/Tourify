interface PostgrestLikeError {
  code?: string
  message?: string
}

export function isSchemaCacheMissingError(error: PostgrestLikeError | null | undefined) {
  return error?.code === "PGRST205"
}

export function getSchemaNotReadyMessage({ feature }: { feature: string }) {
  return `${feature} is not ready in this environment. Run the latest database migrations and refresh the schema cache.`
}
