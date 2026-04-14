"use client"

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react"
import { useAuth } from "@/contexts/auth-context"

export interface JukeboxTrack {
  id: string
  title: string
  artist_name: string
  artist_id?: string
  artist_avatar_url?: string
  duration?: number
  file_url: string
  cover_art_url?: string
  genre?: string
  tags?: string[]
  is_public?: boolean
  listing_id?: string | null
  allow_downloads?: boolean
  in_library?: boolean
}

interface JukeboxState {
  currentTrack: JukeboxTrack | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isShuffled: boolean
  repeatMode: "none" | "one" | "all"
  queue: JukeboxTrack[]
  history: JukeboxTrack[]
  activePlaylistId: string | null
  isPlayerExpanded: boolean
  visualTheme: string
}

type JukeboxAction =
  | { type: "SET_TRACK"; track: JukeboxTrack }
  | { type: "SET_PLAYING"; isPlaying: boolean }
  | { type: "SET_CURRENT_TIME"; time: number }
  | { type: "SET_DURATION"; duration: number }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_MUTE" }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "SET_REPEAT_MODE"; mode: "none" | "one" | "all" }
  | { type: "SET_QUEUE"; tracks: JukeboxTrack[] }
  | { type: "ADD_TO_QUEUE"; track: JukeboxTrack }
  | { type: "REMOVE_FROM_QUEUE"; index: number }
  | { type: "SET_ACTIVE_PLAYLIST"; playlistId: string | null }
  | { type: "SET_EXPANDED"; expanded: boolean }
  | { type: "ADD_TO_HISTORY"; track: JukeboxTrack }
  | { type: "CLEAR_QUEUE" }
  | { type: "SET_VISUAL_THEME"; theme: string }

const STORAGE_KEY = "tourify-jukebox-state"

function loadPersistedState(): Partial<JukeboxState> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return {
      volume: parsed.volume ?? 0.7,
      isMuted: parsed.isMuted ?? false,
      isShuffled: parsed.isShuffled ?? false,
      repeatMode: parsed.repeatMode ?? "none",
      currentTrack: parsed.currentTrack ?? null,
      queue: parsed.queue ?? [],
      visualTheme: parsed.visualTheme ?? "default",
    }
  } catch {
    return {}
  }
}

function persistState(state: JukeboxState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume: state.volume,
        isMuted: state.isMuted,
        isShuffled: state.isShuffled,
        repeatMode: state.repeatMode,
        currentTrack: state.currentTrack,
        queue: state.queue,
        visualTheme: state.visualTheme,
      })
    )
  } catch {}
}

const initialState: JukeboxState = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  isShuffled: false,
  repeatMode: "none",
  queue: [],
  history: [],
  activePlaylistId: null,
  isPlayerExpanded: false,
  visualTheme: "default",
}

function jukeboxReducer(
  state: JukeboxState,
  action: JukeboxAction
): JukeboxState {
  switch (action.type) {
    case "SET_TRACK":
      return { ...state, currentTrack: action.track, currentTime: 0 }
    case "SET_PLAYING":
      return { ...state, isPlaying: action.isPlaying }
    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.time }
    case "SET_DURATION":
      return { ...state, duration: action.duration }
    case "SET_VOLUME":
      return { ...state, volume: Math.max(0, Math.min(1, action.volume)) }
    case "TOGGLE_MUTE":
      return { ...state, isMuted: !state.isMuted }
    case "TOGGLE_SHUFFLE":
      return { ...state, isShuffled: !state.isShuffled }
    case "SET_REPEAT_MODE":
      return { ...state, repeatMode: action.mode }
    case "SET_QUEUE":
      return { ...state, queue: action.tracks }
    case "ADD_TO_QUEUE": {
      if (state.queue.some((t) => t.id === action.track.id)) return state
      return { ...state, queue: [...state.queue, action.track] }
    }
    case "REMOVE_FROM_QUEUE":
      return {
        ...state,
        queue: state.queue.filter((_, i) => i !== action.index),
      }
    case "CLEAR_QUEUE":
      return { ...state, queue: [] }
    case "SET_ACTIVE_PLAYLIST":
      return { ...state, activePlaylistId: action.playlistId }
    case "SET_EXPANDED":
      return { ...state, isPlayerExpanded: action.expanded }
    case "ADD_TO_HISTORY": {
      const filtered = state.history.filter(
        (t) => t.id !== action.track.id
      )
      return {
        ...state,
        history: [action.track, ...filtered].slice(0, 50),
      }
    }
    case "SET_VISUAL_THEME":
      return { ...state, visualTheme: action.theme }
    default:
      return state
  }
}

interface JukeboxContextValue {
  state: JukeboxState
  play: (track: JukeboxTrack) => void
  pause: () => void
  resume: () => void
  togglePlayPause: () => void
  next: () => void
  prev: () => void
  seekTo: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeatMode: () => void
  addToQueue: (track: JukeboxTrack) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  playPlaylist: (tracks: JukeboxTrack[], startIndex?: number) => void
  setActivePlaylistId: (id: string | null) => void
  setExpanded: (expanded: boolean) => void
  setVisualTheme: (theme: string) => void
  getAudioElement: () => HTMLAudioElement | null
}

const JukeboxContext = createContext<JukeboxContextValue | undefined>(
  undefined
)

export function useJukebox() {
  const ctx = useContext(JukeboxContext)
  if (!ctx)
    throw new Error("useJukebox must be used within a JukeboxProvider")
  return ctx
}

export function useJukeboxOptional() {
  return useContext(JukeboxContext)
}

export function JukeboxProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playRecordedRef = useRef<string | null>(null)

  const persisted = useRef(loadPersistedState())
  const [state, dispatch] = useReducer(jukeboxReducer, {
    ...initialState,
    ...persisted.current,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  })

  const [audioReady, setAudioReady] = useState(false)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = "metadata"
      setAudioReady(true)
    }
    return () => {
      audioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    persistState(state)
  }, [
    state.volume,
    state.isMuted,
    state.isShuffled,
    state.repeatMode,
    state.currentTrack,
    state.queue,
    state.visualTheme,
  ])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.volume = state.isMuted ? 0 : state.volume
  }, [state.volume, state.isMuted])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !audioReady) return

    function onTimeUpdate() {
      dispatch({ type: "SET_CURRENT_TIME", time: audio!.currentTime })
    }
    function onLoadedMetadata() {
      dispatch({ type: "SET_DURATION", duration: audio!.duration })
    }
    function onEnded() {
      handleTrackEnded()
    }
    function onError() {
      dispatch({ type: "SET_PLAYING", isPlaying: false })
    }

    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
    }
  }, [audioReady, state.repeatMode, state.queue, state.isShuffled])

  const recordPlay = useCallback(
    async (musicId: string) => {
      if (playRecordedRef.current === musicId) return
      playRecordedRef.current = musicId
      try {
        await fetch("/api/music/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ musicId }),
        })
      } catch {}
    },
    []
  )

  const resolveStreamUrl = useCallback(
    async (track: JukeboxTrack): Promise<string> => {
      try {
        const res = await fetch(`/api/music/stream?trackId=${track.id}`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.url) return data.url
        }
      } catch {}
      return track.file_url
    },
    []
  )

  const playTrack = useCallback(
    async (track: JukeboxTrack) => {
      const audio = audioRef.current
      if (!audio) return

      dispatch({ type: "SET_TRACK", track })
      dispatch({ type: "ADD_TO_HISTORY", track })
      playRecordedRef.current = null

      const streamUrl = await resolveStreamUrl(track)
      audio.src = streamUrl
      audio.load()
      audio
        .play()
        .then(() => {
          dispatch({ type: "SET_PLAYING", isPlaying: true })
          recordPlay(track.id)
        })
        .catch(() => {
          dispatch({ type: "SET_PLAYING", isPlaying: false })
        })
    },
    [recordPlay, resolveStreamUrl]
  )

  const pause = useCallback(() => {
    audioRef.current?.pause()
    dispatch({ type: "SET_PLAYING", isPlaying: false })
  }, [])

  const resume = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !state.currentTrack) return
    audio
      .play()
      .then(() => dispatch({ type: "SET_PLAYING", isPlaying: true }))
      .catch(() => {})
  }, [state.currentTrack])

  const togglePlayPause = useCallback(() => {
    if (state.isPlaying) pause()
    else resume()
  }, [state.isPlaying, pause, resume])

  const getNextTrack = useCallback((): JukeboxTrack | null => {
    if (state.queue.length === 0) return null

    const currentIndex = state.currentTrack
      ? state.queue.findIndex((t) => t.id === state.currentTrack!.id)
      : -1

    if (state.isShuffled) {
      const remaining = state.queue.filter(
        (t) => t.id !== state.currentTrack?.id
      )
      if (remaining.length === 0)
        return state.repeatMode === "all" ? state.queue[0] : null
      return remaining[Math.floor(Math.random() * remaining.length)]
    }

    if (currentIndex === -1 || currentIndex >= state.queue.length - 1)
      return state.repeatMode === "all" ? state.queue[0] : null

    return state.queue[currentIndex + 1]
  }, [state.queue, state.currentTrack, state.isShuffled, state.repeatMode])

  const getPrevTrack = useCallback((): JukeboxTrack | null => {
    if (state.queue.length === 0) return null
    const currentIndex = state.currentTrack
      ? state.queue.findIndex((t) => t.id === state.currentTrack!.id)
      : -1
    if (currentIndex <= 0)
      return state.repeatMode === "all"
        ? state.queue[state.queue.length - 1]
        : null
    return state.queue[currentIndex - 1]
  }, [state.queue, state.currentTrack, state.repeatMode])

  const next = useCallback(() => {
    const nextTrack = getNextTrack()
    if (nextTrack) playTrack(nextTrack)
    else {
      pause()
      dispatch({ type: "SET_CURRENT_TIME", time: 0 })
    }
  }, [getNextTrack, playTrack, pause])

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      dispatch({ type: "SET_CURRENT_TIME", time: 0 })
      return
    }
    const prevTrack = getPrevTrack()
    if (prevTrack) playTrack(prevTrack)
  }, [getPrevTrack, playTrack])

  const handleTrackEnded = useCallback(() => {
    if (state.repeatMode === "one") {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
      return
    }
    next()
  }, [state.repeatMode, next])

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    dispatch({ type: "SET_CURRENT_TIME", time })
  }, [])

  const setVolume = useCallback((volume: number) => {
    dispatch({ type: "SET_VOLUME", volume })
  }, [])

  const toggleMute = useCallback(() => {
    dispatch({ type: "TOGGLE_MUTE" })
  }, [])

  const toggleShuffle = useCallback(() => {
    dispatch({ type: "TOGGLE_SHUFFLE" })
  }, [])

  const cycleRepeatMode = useCallback(() => {
    const modes: Array<"none" | "one" | "all"> = ["none", "one", "all"]
    const idx = modes.indexOf(state.repeatMode)
    dispatch({ type: "SET_REPEAT_MODE", mode: modes[(idx + 1) % 3] })
  }, [state.repeatMode])

  const addToQueue = useCallback((track: JukeboxTrack) => {
    dispatch({ type: "ADD_TO_QUEUE", track })
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    dispatch({ type: "REMOVE_FROM_QUEUE", index })
  }, [])

  const clearQueue = useCallback(() => {
    dispatch({ type: "CLEAR_QUEUE" })
  }, [])

  const playPlaylist = useCallback(
    (tracks: JukeboxTrack[], startIndex = 0) => {
      if (tracks.length === 0) return
      dispatch({ type: "SET_QUEUE", tracks })
      playTrack(tracks[startIndex] || tracks[0])
    },
    [playTrack]
  )

  const setActivePlaylistId = useCallback((id: string | null) => {
    dispatch({ type: "SET_ACTIVE_PLAYLIST", playlistId: id })
  }, [])

  const setExpanded = useCallback((expanded: boolean) => {
    dispatch({ type: "SET_EXPANDED", expanded })
  }, [])

  const setVisualTheme = useCallback((theme: string) => {
    dispatch({ type: "SET_VISUAL_THEME", theme })
  }, [])

  const getAudioElement = useCallback(() => audioRef.current, [])

  const value: JukeboxContextValue = {
    state,
    play: playTrack,
    pause,
    resume,
    togglePlayPause,
    next,
    prev,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeatMode,
    addToQueue,
    removeFromQueue,
    clearQueue,
    playPlaylist,
    setActivePlaylistId,
    setExpanded,
    setVisualTheme,
    getAudioElement,
  }

  return (
    <JukeboxContext.Provider value={value}>
      {children}
    </JukeboxContext.Provider>
  )
}
