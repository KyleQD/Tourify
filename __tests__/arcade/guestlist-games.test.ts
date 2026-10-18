import { describe, expect, it } from 'vitest'
import {
  getGuestlistGameSlot,
  getGuestlistDiscoveryModule,
  parseGuestlistFrequency,
  getNextGuestlistGame,
  type GuestlistFrequency,
} from '@/lib/feed/guestlist-games'

describe('Guestlist Games feed placement', () => {
  it('adds at most two real-game cards after organic posts 10 and 30', () => {
    const placements = Array.from({ length: 80 }, (_, i) => getGuestlistGameSlot(i + 1, 'following', 'normal')).filter(Boolean)
    expect(placements).toEqual([
      { key: 'guestlist:beat-deck:10', game: 'beat-deck', afterPost: 10 },
      { key: 'guestlist:dj-odyssey:30', game: 'dj-odyssey', afterPost: 30 },
    ])
  })

  it('counts post positions across a 20-post page boundary without duplicates', () => {
    const pageOne = Array.from({ length: 20 }, (_, i) => i + 1)
    const pageTwo = Array.from({ length: 20 }, (_, i) => i + 21)
    expect([...pageOne, ...pageTwo].map(post => getGuestlistGameSlot(post, 'all', 'normal')).filter(Boolean)).toHaveLength(2)
    expect(pageOne.map(post => getGuestlistGameSlot(post, 'all', 'normal')).filter(Boolean)).toHaveLength(1)
    expect(pageTwo.map(post => getGuestlistGameSlot(post, 'all', 'normal')).filter(Boolean)).toHaveLength(1)
  })

  it('treats games as independent inserts, never imaginary social posts', () => {
    const posts = Array.from({ length: 45 }, (_, i) => 'post-' + String(i + 1))
    const timeline: string[] = []
    for (let i = 0; i < posts.length; i++) {
      timeline.push(posts[i])
      const slot = getGuestlistGameSlot(i + 1, 'following', 'normal')
      if (slot) timeline.push(slot.key)
    }
    expect(timeline.filter(key => key.startsWith('post-'))).toEqual(posts)
    expect(timeline.indexOf('guestlist:beat-deck:10')).toBe(10)
    expect(timeline.indexOf('guestlist:dj-odyssey:30')).toBe(31)
  })

  it('is opt-out with a one-slot fewer setting and no cards in personal feed', () => {
    const frequencies: GuestlistFrequency[] = ['normal', 'fewer', 'off']
    expect(frequencies.map(mode => Array.from({ length: 80 }, (_, i) => getGuestlistGameSlot(i + 1, 'all', mode)).filter(Boolean).length))
      .toEqual([2, 1, 0])
    expect(getGuestlistGameSlot(10, 'personal', 'normal')).toBeNull()
    expect(getGuestlistGameSlot(30, 'personal', 'normal')).toBeNull()
    expect(getGuestlistGameSlot(10, 'news', 'normal')).toBeNull()
    expect(getGuestlistGameSlot(30, 'work', 'normal')).toBeNull()
    expect(getGuestlistGameSlot(30, 'following', 'fewer')?.game).toBe('beat-deck')
  })

  it('preserves three discovery rails while keeping artists separate from post-ten game', () => {
    const normal = Array.from({ length: 20 }, (_, i) => ({ at: i + 1, rail: getGuestlistDiscoveryModule(i + 1, true) })).filter(x => x.rail)
    expect(normal).toEqual([
      { at: 3, rail: 'events' }, { at: 6, rail: 'music' }, { at: 14, rail: 'artists' },
    ])
    const disabled = Array.from({ length: 20 }, (_, i) => ({ at: i + 1, rail: getGuestlistDiscoveryModule(i + 1, false) })).filter(x => x.rail)
    expect(disabled).toEqual([
      { at: 3, rail: 'events' }, { at: 6, rail: 'music' }, { at: 10, rail: 'artists' },
    ])
  })

  it('recognizes only safe preference values', () => {
    expect(parseGuestlistFrequency('off')).toBe('off')
    expect(parseGuestlistFrequency('fewer')).toBe('fewer')
    expect(parseGuestlistFrequency('normal')).toBe('normal')
    expect(parseGuestlistFrequency('every-post')).toBe('normal')
    expect(parseGuestlistFrequency(null)).toBe('normal')
  })
  it('cycles between the two embedded games without introducing new feed posts', () => {
    expect(getNextGuestlistGame('beat-deck')).toBe('dj-odyssey')
    expect(getNextGuestlistGame('dj-odyssey')).toBe('beat-deck')
    expect(getNextGuestlistGame(getNextGuestlistGame('beat-deck'))).toBe('beat-deck')
  })

})
