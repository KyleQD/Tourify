import { describe, expect, it } from 'vitest'
import { getMusicStreamPolicy } from '@/lib/music/stream-policy'

describe('Arcade-only private music stream policy', () => {
  it('issues a shorter URL without caching for the Arcade', () => {
    const policy = getMusicStreamPolicy('arcade')
    expect(policy).toEqual({
      context: 'arcade',
      lifetimeSeconds: 300,
      eventSource: 'api_music_stream_arcade',
      cacheControl: 'private, no-store',
    })
  })

  it('preserves existing music player behavior for other callers', () => {
    for (const source of [null, '', 'standard', 'arcadeish', 'evil']) {
      expect(getMusicStreamPolicy(source)).toMatchObject({
        context: 'standard',
        lifetimeSeconds: 3600,
        eventSource: 'api_music_stream',
        cacheControl: 'private, max-age=3000',
      })
    }
  })
})
