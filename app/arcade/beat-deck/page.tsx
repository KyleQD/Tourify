import { RhythmGame } from '@/components/arcade/rhythm-game'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Beat Deck | Tourify Arcade',
  description: 'Play an original four-lane rhythm game with keyboard or touch, using eligible Tourify tracks.',
}

export default function BeatDeckPage() {
  return <main className="min-h-screen bg-[#090716] px-3 py-8 sm:px-6"><div className="mx-auto max-w-4xl"><RhythmGame /></div></main>
}
