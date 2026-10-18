import {
  beatSeconds, getOriginalSong, originalSongFrequency, originalSongRoot,
  songLane, songStepSeconds, songTotalSteps, type BeatDeckOriginalSong,
} from './beat-deck-originals'

/**
 * A first-party 60-second Web Audio sequencer. Composes actual drums, bass,
 * chords and lead (not a metronome), with each melody transient at exactly
 * the same timestamp as its Beat Deck chart. No external files, rights or APIs.
 *
 * A look-ahead scheduler keeps music/chart synchronized even when request
 * animation frames drop. Clock uses AudioContext.currentTime (not Date.now).
 */
export class OriginalBeatDeckPlayer {
  readonly duration = 60
  private context: AudioContext
  private master: GainNode | null = null
  private compressor: DynamicsCompressorNode
  private noise: AudioBuffer
  private song: BeatDeckOriginalSong
  private startAt = 0
  private pausedAt = 0
  private nextStep = 0
  private ticker: ReturnType<typeof setInterval> | null = null
  private isRunning = false

  constructor(id: string, context: AudioContext) {
    const song = getOriginalSong(id)
    if (!song) throw new Error('Unknown original Beat Deck track')
    this.song = song
    this.context = context
    this.compressor = context.createDynamicsCompressor()
    this.compressor.threshold.value = -16
    this.compressor.knee.value = 18
    this.compressor.ratio.value = 3
    this.compressor.attack.value = 0.008
    this.compressor.release.value = 0.18
    this.compressor.connect(context.destination)
    this.noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.45), context.sampleRate)
    const channel = this.noise.getChannelData(0)
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1
  }

  getTime(): number {
    if (!this.isRunning) return this.pausedAt
    return Math.max(0, Math.min(this.duration, this.context.currentTime - this.startAt))
  }

  async start(): Promise<void> {
    if (this.isRunning) return
    await this.context.resume()
    if (this.context.state !== 'running') throw new Error('Audio is unavailable on this device')
    const now = this.context.currentTime
    this.startAt = now + 0.07 - this.pausedAt
    this.nextStep = Math.max(0, Math.ceil((this.pausedAt - 0.00001) / songStepSeconds(this.song)))
    this.master = this.context.createGain()
    this.master.gain.setValueAtTime(0.0001, now)
    this.master.gain.linearRampToValueAtTime(0.68, now + 0.04)
    this.master.connect(this.compressor)
    this.isRunning = true
    this.schedule()
    this.ticker = setInterval(() => this.schedule(), 30)
  }

  pause(): void {
    if (!this.isRunning) return
    this.pausedAt = this.getTime()
    this.isRunning = false
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
    this.silenceCurrentMaster()
  }

  stop(): void {
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
    this.isRunning = false
    this.pausedAt = 0
    this.nextStep = 0
    this.silenceCurrentMaster()
  }

  dispose(): void {
    this.stop()
    // Existing voices self-stop on their envelope; disconnect the output.
    this.compressor.disconnect()
  }

  private silenceCurrentMaster() {
    const master = this.master
    if (!master) return
    const now = this.context.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    master.gain.linearRampToValueAtTime(0, now + 0.01)
    this.master = null
    // Scheduled voices complete naturally; the detached bus stays silent.
    setTimeout(() => master.disconnect(), 1500)
  }

  private schedule() {
    if (!this.isRunning || !this.master) return
    const total = songTotalSteps(this.song)
    const stepTime = songStepSeconds(this.song)
    const horizon = this.context.currentTime + 0.22
    while (this.nextStep < total) {
      const time = this.startAt + this.nextStep * stepTime
      if (time > horizon) break
      // When resuming skip elapsed steps; never schedule sound in the past.
      if (time >= this.context.currentTime - 0.01) this.playStep(this.nextStep, Math.max(time, this.context.currentTime))
      this.nextStep++
    }
    if (this.nextStep >= total && this.ticker) {
      clearInterval(this.ticker)
      this.ticker = null
      // Leave transport running until exactly t=60, then game loop finishes.
    }
  }

  private tone(frequency: number, time: number, duration: number, gain: number,
    type: OscillatorType, lowpass?: number, slide?: number) {
    if (!this.master) return
    const ctx = this.context
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, time)
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, time + Math.min(duration * 0.6, 0.12))
    env.gain.setValueAtTime(0.0001, time)
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + 0.009)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    if (lowpass) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'; filter.frequency.value = lowpass
      osc.connect(filter); filter.connect(env)
    } else osc.connect(env)
    env.connect(this.master)
    osc.start(time); osc.stop(time + duration + 0.018)
  }

  private percussion(time: number, gain: number, duration: number, highpass: number) {
    if (!this.master) return
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const env = this.context.createGain()
    source.buffer = this.noise
    filter.type = 'highpass'
    filter.frequency.value = highpass
    env.gain.setValueAtTime(Math.max(0.0002, gain), time)
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    source.connect(filter); filter.connect(env); env.connect(this.master)
    source.start(time); source.stop(time + duration + 0.004)
  }

  private playStep(step: number, time: number) {
    const song = this.song
    const stepSeconds = songStepSeconds(song)
    const quarter = beatSeconds(song)
    const root = originalSongRoot(song, step)
    const chordMinor = song.chordMinor[Math.floor(step / 32) % song.chordMinor.length]
    const beat = Math.floor(step / 2)
    const bar = Math.floor(beat / 4)
    const withinBar = step % 8
    const isBeat = step % 2 === 0
    const breakBar = bar % 16 === 15
    const ending = step >= songTotalSteps(song) - 16
    const isFestival = song.id === 'original:festival-lights'
    const isCoastal = song.id === 'original:coastal-frequency'

    if (isBeat && !breakBar) {
      // Four-on-the-floor with distinct low kick transient.
      this.tone(isFestival ? 150 : 132, time, 0.16, 0.15, 'sine', undefined, 49)
      if (withinBar === 2 || withinBar === 6) {
        this.percussion(time, isFestival ? 0.07 : 0.052, 0.14, 1250)
        this.tone(192, time, 0.07, 0.017, 'triangle', undefined, 112)
      }
      if (isCoastal && withinBar === 0) this.percussion(time, 0.014, 0.09, 680)
      // Anchored sequenced bassline.
      if (!(isCoastal && beat % 4 === 3)) {
        const bassMidi = root - 12 + (beat % 4 === 3 ? 7 : 0)
        this.tone(originalSongFrequency(bassMidi), time, quarter * 0.52,
          isCoastal ? 0.085 : 0.093, isCoastal ? 'triangle' : 'sawtooth', isCoastal ? 600 : 450)
      }
    }
    if (step % 2 === 1) {
      this.percussion(time, isCoastal ? 0.026 : 0.034, 0.055, isCoastal ? 6500 : 8300)
      if (isFestival && bar >= 8 && !breakBar) this.percussion(time, 0.015, 0.045, 11500)
    }
    // Chords shift every four bars and create audible musical phrases.
    if (step % 8 === 0 && !breakBar) {
      const padMidi = root + 12
      for (const degree of [0, chordMinor ? 3 : 4, 7]) {
        this.tone(originalSongFrequency(padMidi + degree), time, Math.min(1.8, quarter * 3.5),
          isCoastal ? 0.016 : 0.013, isCoastal ? 'sine' : 'triangle', isCoastal ? 1800 : 1300)
      }
    }
    // Each lane onset is also an audible lead/pluck. Offbeat notes are quieter,
    // supporting hard charts without adding silent phantom target notes.
    if (step >= 4 && step < songTotalSteps(song) - 2) {
      const motifDegree = song.motif[Math.floor(step / 2) % song.motif.length]
      // Keep the melody compatible with each local chord quality.
      const degree = chordMinor ? (motifDegree === 4 ? 3 : motifDegree === 11 ? 10 : motifDegree) : (motifDegree === 3 ? 4 : motifDegree === 10 ? 11 : motifDegree)
      const shift = bar >= 16 ? 12 : 0
      const note = root + 12 + degree + shift
      const lane = songLane(song, step)
      this.tone(originalSongFrequency(note), time, isBeat ? 0.18 : 0.10,
        (isBeat ? 0.052 : 0.032) * (ending ? 0.7 : 1),
        isFestival ? 'sawtooth' : isCoastal ? 'sine' : 'triangle',
        isFestival ? 2700 : isCoastal ? 2200 : 3800)
      // A subtle stereo-free timbre shift for each visual lane, no panning
      // dependency for accessibility or headphone use.
      if (lane === 3 && isBeat) this.tone(originalSongFrequency(note - 12), time, 0.1, 0.009, 'sine')
    }
    // Occasional transitions to distinguish the minute's sections.
    if (withinBar === 0 && bar % 8 === 0 && bar !== 0) {
      this.percussion(time, 0.058, Math.min(0.25, stepSeconds), 3500)
    }
  }
}
