'use client'

import { FileText } from 'lucide-react'
import type { MessageAttachment } from '@/lib/messaging/attachments'
import { cn } from '@/lib/utils'

interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  className?: string
}

export function MessageAttachments({ attachments, className }: MessageAttachmentsProps) {
  if (!attachments.length) return null

  return (
    <div className={cn('mt-2 flex flex-wrap gap-2', className)}>
      {attachments.map((attachment) => {
        if (attachment.type === 'image') {
          return (
            <a key={attachment.url} href={attachment.url} target="_blank" rel="noopener noreferrer">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-h-40 rounded-md border border-slate-700 object-cover"
              />
            </a>
          )
        }

        return (
          <a
            key={attachment.url}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-200 hover:border-purple-500/40"
          >
            <FileText className="h-4 w-4 text-purple-400" />
            <span className="max-w-[160px] truncate">{attachment.name}</span>
            {attachment.size > 0 ? (
              <span className="text-slate-500">{(attachment.size / 1024).toFixed(0)} KB</span>
            ) : null}
          </a>
        )
      })}
    </div>
  )
}
