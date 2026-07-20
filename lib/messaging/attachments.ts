/**
 * Shared message attachment helpers for DM composers.
 */

export interface MessageAttachment {
  url: string
  name: string
  type: 'image' | 'file' | 'audio'
  size: number
}

export const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments'
export const MESSAGE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024

export function inferAttachmentType(mime: string): MessageAttachment['type'] {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

export function isAllowedAttachmentMime(mime: string): boolean {
  if (mime.startsWith('image/')) return true
  if (mime.startsWith('audio/')) return true
  if (mime === 'application/pdf') return true
  if (
    mime === 'application/msword'
    || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || mime === 'application/vnd.ms-excel'
    || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    || mime === 'text/plain'
  )
    return true
  return false
}

export function buildAttachmentStoragePath(input: {
  userId: string
  threadKey: string
  fileName: string
}): string {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  return `${input.userId}/${input.threadKey}/${Date.now()}-${safeName}`
}
