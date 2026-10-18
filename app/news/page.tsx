import type { Metadata } from 'next'

import { NewsPage } from '@/components/news/news-page'

export const metadata: Metadata = {
  title: 'Tourify News | Music, Live Events & Community',
  description: 'Discover music, live-event and entertainment industry news alongside original reporting and updates from the Tourify community.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'Tourify News',
    description: 'Music, live events, industry reporting and community news in one place.',
    type: 'website',
    url: '/news',
  },
}

export default function NewsRoutePage() {
  return <NewsPage />
}
