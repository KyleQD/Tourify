export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const name = error instanceof Error ? error.name : ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    name === 'ChunkLoadError' ||
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk')
  )
}
