'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, MapPin, Music2 } from 'lucide-react'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface FeedItem {
  id: string
  title: string
  description: string
  date: string
  time: string
  location: string
  imageUrl?: string
  user: {
    name: string
    avatar?: string
  }
}

export default function FeedMain() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([
    {
      id: '1',
      title: 'Summer Tour 2024',
      description: 'Join us for an unforgettable summer tour across the country!',
      date: '2024-06-15',
      time: '19:00',
      location: 'Madison Square Garden, NY',
      user: {
        name: 'John Doe',
      },
    },
    {
      id: '2',
      title: 'Album Release Party',
      description: 'Celebrating the release of our new album with a special performance.',
      date: '2024-07-20',
      time: '20:00',
      location: 'The Roxy, LA',
      user: {
        name: 'Jane Smith',
      },
    },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tour Feed</h2>
        <Button variant="outline" className="bg-purple-600 text-white hover:bg-purple-700">
          Create Post
        </Button>
      </div>

      <div className="space-y-4">
        {feedItems.map((item) => (
          <Card key={item.id} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center space-x-4">
              <Avatar>
                <AvatarImage src={item.user.avatar} />
                <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <p className="text-sm text-slate-400">{item.user.name}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-300">{item.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatSafeDate(item.date)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{item.time}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span>{item.location}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
} 