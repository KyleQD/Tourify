"use client"

import { Image as ImageIcon } from "lucide-react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { EventData } from "./types"

interface EventMediaTabProps {
  event: EventData
}

export function EventMediaTab({ event }: EventMediaTabProps) {
  const { tokens } = useEventSkin()
  return (
    <Card className={cn(tokens.card, tokens.body)}>
      <CardHeader className="pb-4">
        <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
          <ImageIcon className="h-5 w-5 text-pink-400" />
          Event Media
        </CardTitle>
      </CardHeader>
      <CardContent>
        {event.poster_url ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Event Poster</h4>
            <div className={cn(tokens.heroFrame, "mx-auto max-w-md overflow-hidden")}>
              <Image
                src={event.poster_url}
                alt={`${event.title} poster`}
                width={480}
                height={720}
                className="h-auto w-full object-cover"
              />
            </div>
            <p className="text-center text-sm text-white/45">No additional media yet</p>
          </div>
        ) : (
          <div className="py-12 text-center">
            <div className={cn(tokens.inset, "mx-auto mb-4 flex h-16 w-16 items-center justify-center")}>
              <ImageIcon className="h-8 w-8 text-white/35" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">No additional media yet</h3>
            <p className={tokens.muted}>Event poster and media will appear here when available.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
