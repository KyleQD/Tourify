'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Music2 } from 'lucide-react'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface FeatureSpotlightProps {
  title: string
  description: string
  date: string
  location: string
  imageUrl?: string
}

export default function FeatureSpotlight({
  title,
  description,
  date,
  location,
  imageUrl,
}: FeatureSpotlightProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-900/50 to-slate-800/50 border-purple-800/50">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <Music2 className="h-5 w-5 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">Featured Event</span>
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-slate-300">{description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{formatSafeDate(date)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
        </div>
        <Button className="w-full bg-purple-600 hover:bg-purple-700">
          Get Tickets
        </Button>
      </CardContent>
    </Card>
  )
} 