export interface EntitlementDeliveryInput {
  signedUrl: string | null
  signedUrlExpiresAt: string | null
  maxDownloads: number
  downloadCount: number
  assetBucket: string | null
  assetPath: string | null
  assetUrl: string | null
  watermarkedAssetUrl: string | null
}

export interface StorageTarget {
  bucket: string
  path: string
}

export function parseStorageTargetFromUrl(input: string | null): StorageTarget | null {
  if (!input) return null
  try {
    const url = new URL(input)
    const pathParts = url.pathname.split("/").filter(Boolean)
    const objectIndex = pathParts.findIndex(part => part === "object")
    if (objectIndex === -1) return null
    const maybeVisibility = pathParts[objectIndex + 1]
    const bucketIndex = maybeVisibility === "public" || maybeVisibility === "sign" ? objectIndex + 2 : objectIndex + 1
    const bucket = pathParts[bucketIndex]
    const objectPath = pathParts.slice(bucketIndex + 1).join("/")
    if (!bucket || !objectPath) return null
    return { bucket, path: objectPath }
  } catch {
    return null
  }
}

export function resolveStorageTarget(input: EntitlementDeliveryInput): StorageTarget | null {
  if (input.assetBucket && input.assetPath) return { bucket: input.assetBucket, path: input.assetPath }
  return parseStorageTargetFromUrl(input.assetUrl || input.watermarkedAssetUrl)
}

export function shouldRefreshSignedUrl({
  signedUrl,
  signedUrlExpiresAt,
  nowMs,
}: {
  signedUrl: string | null
  signedUrlExpiresAt: string | null
  nowMs: number
}) {
  const expiresAtMs = signedUrlExpiresAt ? new Date(signedUrlExpiresAt).getTime() : 0
  return !signedUrl || !expiresAtMs || expiresAtMs <= nowMs
}

export function hasReachedDownloadLimit({
  maxDownloads,
  downloadCount,
}: {
  maxDownloads: number
  downloadCount: number
}) {
  if (maxDownloads <= 0) return false
  return downloadCount >= maxDownloads
}
