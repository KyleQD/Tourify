import { DJQuestGame } from '@/components/arcade/dj-quest-game'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DJ Odyssey | Tourify Arcade',
  description: 'Tour six famous nightlife destinations, including Ibiza, Sunset Strip and EOS Lounge in Santa Barbara, in an original side-scrolling DJ adventure with illustrated chapter route maps.',
}

export default function DJQuestPage() {
  return <main className="min-h-screen bg-[#090716] px-3 py-8 sm:px-6"><div className="mx-auto max-w-5xl"><DJQuestGame /></div></main>
}
