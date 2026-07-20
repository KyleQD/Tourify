'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, MessageCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { useActingContext } from '@/hooks/use-acting-context'

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
}

export function MessageModal({
  isOpen,
  onClose,
  recipient,
  recipientAccount,
  prefill,
}: MessageModalProps) {
  const [message, setMessage] = useState(prefill?.text || '')
  const [isLoading, setIsLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { actingHeaders } = useActingContext()

  const handleSendMessage = async () => {
    if (!user || !isAuthenticated) {
      toast.error('Please sign in to send messages')
      return
    }

    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }

    if (message.length > 1000) {
      toast.error('Message is too long. Please keep it under 1000 characters.')
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
        toast.error(error.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-slate-700 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-purple-400" />
            Send Message
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={recipient.avatar_url || undefined} alt="" />
            <AvatarFallback className="bg-slate-700">
              {(recipient.full_name || recipient.username || '?').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{recipient.full_name || recipient.username}</p>
            <p className="truncate text-sm text-slate-400">@{recipient.username}</p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
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
          className="min-h-[120px] border-slate-600 bg-slate-800 text-white"
          maxLength={1000}
        />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{message.length}/1000</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="border-slate-600">
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !message.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600"
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
      </DialogContent>
    </Dialog>
  )
}
