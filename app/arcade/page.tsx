import { ArcadeHub } from '@/components/arcade/arcade-hub'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arcade | Tourify',
  description: 'Play original music-inspired rhythm and DJ adventure games on Tourify.',
}

export default function ArcadePage() {
  return <main className="min-h-screen bg-[#090716]"><ArcadeHub /></main>
}
