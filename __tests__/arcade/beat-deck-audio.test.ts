import { afterEach, describe, expect, it, vi } from 'vitest'
import { OriginalBeatDeckPlayer } from '@/lib/arcade/beat-deck-audio'
import { BEAT_DECK_ORIGINALS } from '@/lib/arcade/beat-deck-originals'

// Test the browser sequencer transport without requiring an actual loudspeaker,
// microphone permission, signed audio URLs or a DOM.
function fakeAudioContext() {
  const starts: number[] = []
  const param = () => ({
    value: 0,
    setValueAtTime(value: number, _at: number) { this.value = value },
    exponentialRampToValueAtTime(value: number, _at: number) { this.value = value },
    linearRampToValueAtTime(value: number, _at: number) { this.value = value },
    cancelScheduledValues(_at: number) {},
  })
  const node = () => ({ connect(_to?: unknown) { return this }, disconnect() {} })
  const context = {
    currentTime: 0,
    sampleRate: 48000,
    state: 'running',
    destination: {},
    resume: async () => {},
    createDynamicsCompressor: () => ({
      ...node(), threshold: param(), knee: param(), ratio: param(),
      attack: param(), release: param(),
    }),
    createBuffer: (_channels: number, size: number, _rate: number) => ({
      getChannelData: (_channel: number) => new Float32Array(size),
    }),
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => ({
      ...node(), type: 'sine', frequency: param(),
      start: (time: number) => starts.push(time),
      stop: (_time: number) => {},
    }),
    createBiquadFilter: () => ({ ...node(), type: 'lowpass', frequency: param() }),
    createBufferSource: () => ({
      ...node(), buffer: null, start: (time: number) => starts.push(time),
      stop: (_time: number) => {},
    }),
  }
  return { context, starts }
}

afterEach(() => vi.useRealTimers())

describe('Beat Deck Web Audio original song transport', () => {
  for (const song of BEAT_DECK_ORIGINALS) {
    it('schedules audible events, pauses and resumes without chart-time drift: ' + song.title, async () => {
      vi.useFakeTimers()
      const { context, starts } = fakeAudioContext()
      const player = new OriginalBeatDeckPlayer(song.id, context as unknown as AudioContext)
      expect(player.duration).toBe(60)
      await player.start()
      expect(player.getTime()).toBe(0)
      expect(starts.length).toBeGreaterThan(4) // kick, bass, chords...
      context.currentTime = 12.5
      await vi.advanceTimersByTimeAsync(35)
      const now = player.getTime()
      expect(now).toBeGreaterThan(12)
      expect(now).toBeLessThan(13)
      player.pause()
      expect(player.getTime()).toBeCloseTo(now, 6)
      context.currentTime = 18
      expect(player.getTime()).toBeCloseTo(now, 6)
      await player.start()
      expect(player.getTime()).toBeCloseTo(now, 6)
      context.currentTime += 2
      await vi.advanceTimersByTimeAsync(40)
      expect(player.getTime()).toBeCloseTo(now + 2, 4)
      player.dispose()
      expect(player.getTime()).toBe(0)
    })
  }
})
