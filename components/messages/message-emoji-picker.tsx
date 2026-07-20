'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EmojiPicker } from '@/components/venue/social/emoji-picker'

interface MessageEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  disabled?: boolean
}

/** Dependency-free emoji picker for the DM composer (no @emoji-mart packages). */
export function MessageEmojiPicker({ onEmojiSelect, disabled }: MessageEmojiPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="border-slate-600 bg-slate-800"
          disabled={disabled}
          aria-label="Insert emoji"
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border-slate-700 bg-transparent p-0">
        <EmojiPicker
          onEmojiSelect={(emoji) => {
            onEmojiSelect(emoji)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
