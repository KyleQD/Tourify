'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus } from 'lucide-react'
import { POLL_DURATIONS, type PollDuration } from '@/lib/polls/poll-duration'
import { cn } from '@/lib/utils'
import {
  ARTIST_GHOST_CHIP,
  ARTIST_INPUT,
  ARTIST_OUTLINE_BTN,
  ARTIST_SECTION_LABEL,
} from '@/components/dashboard/artist-tokens'

interface PollOptionEditorProps {
  options: string[]
  duration: PollDuration
  onOptionsChange: (options: string[]) => void
  onDurationChange: (duration: PollDuration) => void
  className?: string
  maxOptions?: number
}

const DURATION_LABELS: Record<PollDuration, string> = {
  '1d': '1 day',
  '3d': '3 days',
  '7d': '7 days',
  '14d': '14 days',
}

export function PollOptionEditor({
  options,
  duration,
  onOptionsChange,
  onDurationChange,
  className,
  maxOptions = 4,
}: PollOptionEditorProps) {
  function handleOptionChange(index: number, value: string) {
    const next = [...options]
    next[index] = value
    onOptionsChange(next)
  }

  function handleAddOption() {
    if (options.length >= maxOptions) return
    onOptionsChange([...options, ''])
  }

  function handleRemoveOption(index: number) {
    if (options.length <= 2) return
    onOptionsChange(options.filter((_, i) => i !== index))
  }

  return (
    <div
      className={cn(
        'space-y-4 rounded-2xl border border-white/10 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        className
      )}
    >
      <div className="space-y-2">
        <Label className={cn(ARTIST_SECTION_LABEL, 'block')}>Poll options</Label>
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="flex h-10 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-xs font-medium text-slate-400">
              {index + 1}
            </div>
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(event) => handleOptionChange(index, event.target.value)}
              maxLength={80}
              className={cn(ARTIST_INPUT, 'flex-1')}
            />
            {index > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveOption(index)}
                aria-label={`Remove option ${index + 1}`}
                className={cn(ARTIST_GHOST_CHIP, 'h-10 w-10 text-rose-300 hover:text-rose-200')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {options.length < maxOptions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddOption}
            className={cn(ARTIST_OUTLINE_BTN, 'h-9')}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add option
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor="poll-duration" className={cn(ARTIST_SECTION_LABEL, 'whitespace-nowrap')}>
          Duration
        </Label>
        <Select
          value={duration}
          onValueChange={(value) => {
            if ((POLL_DURATIONS as readonly string[]).includes(value))
              onDurationChange(value as PollDuration)
          }}
        >
          <SelectTrigger
            id="poll-duration"
            className={cn(ARTIST_OUTLINE_BTN, 'h-10 w-[140px]')}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-950/95 text-slate-100">
            {POLL_DURATIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {DURATION_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
