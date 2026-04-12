export interface StorageObjectTarget {
  bucket: string
  path: string
}

export function getStoragePathFromUrl(input: string | null): StorageObjectTarget | null {
  if (!input) return null

  try {
    const url = new URL(input)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const objectIndex = pathParts.findIndex(part => part === 'object')
    if (objectIndex === -1) return null

    const maybeVisibility = pathParts[objectIndex + 1]
    const bucketIndex = maybeVisibility === 'public' || maybeVisibility === 'sign' ? objectIndex + 2 : objectIndex + 1
    const bucket = pathParts[bucketIndex]
    const objectPath = pathParts.slice(bucketIndex + 1).join('/')
    if (!bucket || !objectPath) return null

    return { bucket, path: objectPath }
  } catch {
    return null
  }
}
