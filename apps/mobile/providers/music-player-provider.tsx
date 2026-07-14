import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio"
import { getMusicStreamUrl, recordMobilePlay, type MobileMusicAccessLevel, type MobileMusicTrack } from "@/lib/api/music"

interface MusicPlayerContextValue {
  currentTrack: MobileMusicTrack | null
  accessLevel: MobileMusicAccessLevel | null
  isLoading: boolean
  isPlaying: boolean
  position: number
  duration: number
  playTrack: (track: MobileMusicTrack) => Promise<void>
  pause: () => void
  resume: () => void
  seekTo: (seconds: number) => Promise<void>
  stop: () => void
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null)

export function MusicPlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, 500)
  const status = useAudioPlayerStatus(player)
  const [currentTrack, setCurrentTrack] = useState<MobileMusicTrack | null>(null)
  const [accessLevel, setAccessLevel] = useState<MobileMusicAccessLevel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const completedTrackIds = useRef(new Set<string>())
  const lastHeartbeatByTrack = useRef(new Map<string, number>())

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
      allowsRecording: false,
      shouldRouteThroughEarpiece: false,
    })
  }, [])

  const playTrack = useCallback(
    async (track: MobileMusicTrack) => {
      setIsLoading(true)
      try {
        const stream = await getMusicStreamUrl(track.id)
        completedTrackIds.current.delete(track.id)
        lastHeartbeatByTrack.current.delete(track.id)
        setCurrentTrack(track)
        setAccessLevel(stream.accessLevel)
        player.replace({ uri: stream.url })
        player.play()
        await recordMobilePlay({
          musicId: track.id,
          accessLevel: stream.accessLevel,
          source: "mobile_music_player",
          eventType: "play_started",
        }).catch(() => null)
      } finally {
        setIsLoading(false)
      }
    },
    [player]
  )

  const pause = useCallback(() => {
    player.pause()
  }, [player])

  const resume = useCallback(() => {
    if (currentTrack) player.play()
  }, [currentTrack, player])

  const stop = useCallback(() => {
    player.pause()
    player.replace(null)
    setCurrentTrack(null)
    setAccessLevel(null)
  }, [player])

  const seekTo = useCallback(
    (seconds: number) => player.seekTo(Math.max(0, seconds)),
    [player]
  )

  useEffect(() => {
    if (!currentTrack || !accessLevel) return

    const currentSecond = Math.floor(status.currentTime || 0)
    const lastHeartbeat = lastHeartbeatByTrack.current.get(currentTrack.id) || 0
    if (status.playing && currentSecond >= 15 && currentSecond - lastHeartbeat >= 30) {
      lastHeartbeatByTrack.current.set(currentTrack.id, currentSecond)
      void recordMobilePlay({
        musicId: currentTrack.id,
        accessLevel,
        listenSeconds: currentSecond,
        source: "mobile_music_player",
        eventType: "play_progress",
      }).catch(() => null)
    }

    if (status.didJustFinish && !completedTrackIds.current.has(currentTrack.id)) {
      completedTrackIds.current.add(currentTrack.id)
      void recordMobilePlay({
        musicId: currentTrack.id,
        accessLevel,
        listenSeconds: Math.round(status.duration || status.currentTime || 0),
        completed: true,
        source: "mobile_music_player",
      }).catch(() => null)
    }
  }, [accessLevel, currentTrack, status.currentTime, status.didJustFinish, status.duration, status.playing])

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      currentTrack,
      accessLevel,
      isLoading,
      isPlaying: Boolean(status.playing),
      position: status.currentTime || 0,
      duration: status.duration || currentTrack?.duration || 0,
      playTrack,
      pause,
      resume,
      seekTo,
      stop,
    }),
    [accessLevel, currentTrack, isLoading, pause, playTrack, resume, seekTo, status.currentTime, status.duration, status.playing, stop]
  )

  return <MusicPlayerContext.Provider value={value}>{children}</MusicPlayerContext.Provider>
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext)
  if (!context) throw new Error("useMusicPlayer must be used inside MusicPlayerProvider")
  return context
}
