'use client'

import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { DialogContent } from '@/components/ui/dialog'

export interface PublicMediaLightboxItem {
  url: string
  type?: string | null
  caption?: string | null
  thumbnailUrl?: string | null
}

export function PublicArtistMediaLightbox({
  items,
  index,
  onIndexChange,
  onOpenChange,
  artistName,
}: {
  items: PublicMediaLightboxItem[]
  index: number
  onIndexChange: (index: number) => void
  onOpenChange: (open: boolean) => void
  artistName: string
}) {
  const item = items[index]
  const canNavigate = items.length > 1
  const previous = () => onIndexChange((index - 1 + items.length) % items.length)
  const next = () => onIndexChange((index + 1) % items.length)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!canNavigate) return
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + items.length) % items.length)
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % items.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [canNavigate, index, items.length, onIndexChange])

  if (!item) return null
  const isVideo = item.type === 'video' || /\.(mp4|webm|mov)(?:\?|$)/i.test(item.url)

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-none w-screen max-w-none flex-col gap-0 overflow-hidden border-0 bg-neutral-950 p-0 text-white sm:h-[min(90dvh,56rem)] sm:w-[min(92vw,76rem)] sm:rounded-2xl">
        <DialogTitle className="sr-only">{artistName} media viewer</DialogTitle>
        <DialogDescription className="sr-only">
          Media item {index + 1} of {items.length}. Use the previous and next buttons or arrow keys to navigate.
        </DialogDescription>
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black p-3 sm:p-8">
          {isVideo ? (
            <video src={item.url} poster={item.thumbnailUrl || undefined} controls autoPlay className="max-h-full max-w-full object-contain" />
          ) : item.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.caption || `${artistName} media ${index + 1}`} className="max-h-full max-w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-neutral-400"><ImageOff className="h-10 w-10" />Media unavailable</div>
          )}
          {canNavigate ? (
            <>
              <Button type="button" size="icon" variant="secondary" onClick={previous} aria-label="Previous media" className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-black/65 text-white hover:bg-black/85 sm:left-5"><ChevronLeft className="h-6 w-6" /></Button>
              <Button type="button" size="icon" variant="secondary" onClick={next} aria-label="Next media" className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-black/65 text-white hover:bg-black/85 sm:right-5"><ChevronRight className="h-6 w-6" /></Button>
            </>
          ) : null}
        </div>
        <div className="flex min-h-20 items-start justify-between gap-6 border-t border-white/10 bg-neutral-950 px-5 py-4 sm:px-7">
          <p className="max-w-3xl text-sm leading-relaxed text-neutral-300">{item.caption || 'Untitled media'}</p>
          <p className="shrink-0 text-sm tabular-nums text-neutral-400">{index + 1} / {items.length}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
