'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'
import { ThemedDialogContent } from '@/components/public-artist/themed-dialog-content'
import type { ArtistProfileAppearance } from '@/lib/public-artist/artist-profile-appearance'

interface MessageModalProps {
  isOpen: boolean
  onClose: () => void
  recipient: {
    id: string
    username: string
    full_name?: string
    avatar_url?: string
  }
  /** Entity account the message should land in (artist/org/venue inbox). */
  recipientAccount?: {
    profileId: string
    accountType: string
  }
  prefill?: {
    text?: string
    attachment?: unknown
  }
  profileAppearance?: ArtistProfileAppearance | null
}

export function MessageModal({
  isOpen,
  onClose,
  recipient,
  recipientAccount,
  prefill,
  profileAppearance,
}: MessageModalProps) {
  const [message, setMessage] = useState(prefill?.text || '')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const { user, isAuthenticated } = useAuth()
  const { actingHeaders } = useActingContext()

  const handleSendMessage = async () => {
    setErrorMessage(null)
    if (!user || !isAuthenticated) {
      setErrorMessage('Sign in before sending a message.')
      return
    }

    if (!message.trim()) {
      setErrorMessage('Write a message before sending.')
      return
    }

    if (message.length > 2000) {
      setErrorMessage('Keep your message under 2,000 characters.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...actingHeaders,
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          recipientProfileId: recipientAccount?.profileId,
          recipientAccountType: recipientAccount?.accountType,
          content: message.trim(),
          attachment: prefill?.attachment || null,
        }),
      })

      if (response.ok) {
        toast.success(
          recipientAccount && recipientAccount.accountType !== 'general'
            ? 'Message request sent to their account inbox'
            : 'Message sent successfully',
        )
        setMessage('')
        onClose()
      } else {
        const error = await response.json().catch(() => ({}))
        setErrorMessage(error.error?.message || error.error || 'Your message could not be sent.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setErrorMessage('Your message could not be sent. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ThemedDialogContent
        profileAppearance={profileAppearance}
        className="max-h-[90dvh] overflow-y-auto border-white/15 bg-slate-950 text-[var(--artist-theme-text,#fff)] sm:max-w-md sm:rounded-3xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            Message {recipient.full_name || recipient.username}
          </DialogTitle>
          <DialogDescription className="text-[var(--artist-theme-muted,#94a3b8)]">
            Introduce yourself and share enough context for a thoughtful reply.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={recipient.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-slate-700">
              {(recipient.full_name || recipient.username || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{recipient.full_name || recipient.username}</p>
            <p className="truncate text-sm text-[var(--artist-theme-muted,#94a3b8)]">@{recipient.username}</p>
          </div>
        </div>

        <p className="text-xs text-[var(--artist-theme-muted,#94a3b8)]">
          If you are not friends, this will appear in their message requests inbox
          {recipientAccount && recipientAccount.accountType !== 'general'
            ? ` for this ${recipientAccount.accountType} account`
            : ''}
          .
        </p>

        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write your introduction…"
          className="min-h-[150px] rounded-2xl border-white/15 bg-white/[0.06] text-[var(--artist-theme-text,#fff)]"
          maxLength={2000}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? 'message-modal-error' : 'message-modal-hint'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              void handleSendMessage()
            }
          }}
        />

        <div className="flex items-start justify-between gap-3 text-xs">
          <span id={errorMessage ? 'message-modal-error' : 'message-modal-hint'} role={errorMessage ? 'alert' : undefined} className={errorMessage ? 'text-rose-400' : 'text-[var(--artist-theme-muted,#94a3b8)]'}>
            {errorMessage || 'Press ⌘ Enter or Ctrl Enter to send.'}
          </span>
          <span className="shrink-0 tabular-nums text-[var(--artist-theme-muted,#94a3b8)]">{message.length}/2,000</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span />
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
              style={
                profileAppearance
                  ? { background: profileAppearance.accentColor, color: profileAppearance.backgroundColor }
                  : undefined
              }
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </div>
      </ThemedDialogContent>
    </Dialog>
  )
}
