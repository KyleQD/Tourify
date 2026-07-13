'use client'

import Link from 'next/link'
import type { ComponentType } from 'react'
import {
  BarChart2,
  Calendar,
  FileText,
  MessageSquare,
  Music2,
  ShoppingBag,
  Users,
  Video,
} from 'lucide-react'
import { cn } from '@/utils'
import {
  ARTIST_CARD_INTERACTIVE,
  ARTIST_ICON_WELL,
  ARTIST_MUTED,
  ARTIST_SECTION_LABEL,
} from '@/components/dashboard/artist-tokens'

interface WorkflowCard {
  title: string
  description: string
  href: string
  icon: ComponentType<{ className?: string }>
}

const workflows: WorkflowCard[] = [
  {
    title: 'Music',
    description: 'Library & uploads',
    href: '/artist/music',
    icon: Music2,
  },
  {
    title: 'Content',
    description: 'Compose & schedule',
    href: '/artist/content',
    icon: Video,
  },
  {
    title: 'Events',
    description: 'Shows & tours',
    href: '/artist/events',
    icon: Calendar,
  },
  {
    title: 'EPK',
    description: 'Press kit builder',
    href: '/artist/epk',
    icon: FileText,
  },
  {
    title: 'Store',
    description: 'Merch & tickets',
    href: '/artist/store',
    icon: ShoppingBag,
  },
  {
    title: 'Community',
    description: 'Fans & network',
    href: '/artist/community',
    icon: Users,
  },
  {
    title: 'Business',
    description: 'Analytics & ops',
    href: '/artist/business',
    icon: BarChart2,
  },
  {
    title: 'Messages',
    description: 'Inbox & collabs',
    href: '/artist/messages',
    icon: MessageSquare,
  },
]

export function ArtistWorkflowLaunchpad() {
  return (
    <section className="mb-8" aria-label="Workflows">
      <div className="mb-4">
        <div className={ARTIST_SECTION_LABEL}>Launch</div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">Workflows</h2>
        <p className={ARTIST_MUTED}>Jump into any part of your artist account</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {workflows.map((workflow) => {
          const Icon = workflow.icon
          return (
            <Link
              key={workflow.href}
              href={workflow.href}
              className={cn(ARTIST_CARD_INTERACTIVE, 'group p-4')}
            >
              <div className={cn(ARTIST_ICON_WELL, 'mb-3 inline-flex h-9 w-9 items-center justify-center')}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="font-medium tracking-tight text-white">{workflow.title}</div>
              <div className="text-xs text-slate-400">{workflow.description}</div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
