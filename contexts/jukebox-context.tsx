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
import { toast } from "sonner"

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
  allow_library_add?: boolean
  access_mode?: "free" | "paid"
  in_library?: boolean
}

export type JukeboxTab =
  | "now-playing"
  | "queue"
  | "favorites"
  | "discover"
  | "following"
  | "playlists"
  | "library"

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
  isPlayerChromeVisible: boolean
  initialTab: JukeboxTab | null
  visualTheme: string
  playbackError: string | null
}

type JukeboxAction =
  | { type: "SET_TRACK"; track: JukeboxTrack }
  | { type: "CLEAR_TRACK" }
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
  | { type: "SET_EXPANDED"; expanded: boolean; tab?: JukeboxTab | null }
  | { type: "SET_CHROME_VISIBLE"; visible: boolean }
  | { type: "DISMISS_PLAYER" }
  | { type: "CLEAR_INITIAL_TAB" }
  | { type: "ADD_TO_HISTORY"; track: JukeboxTrack }
  | { type: "CLEAR_QUEUE" }
  | { type: "SET_VISUAL_THEME"; theme: string }
  | { type: "SET_PLAYBACK_ERROR"; error: string | null }

const STORAGE_KEY = "tourify-jukebox-state"
const MAX_PERSISTED_QUEUE = 50
const PROGRESS_THROTTLE_MS = 250

function stripTrackForPersist(track: JukeboxTrack): JukeboxTrack {
  return {
    id: track.id,
    title: track.title,
    artist_name: track.artist_name,
    artist_id: track.artist_id,
    artist_avatar_url: track.artist_avatar_url,
    duration: track.duration,
    file_url: `/api/music/stream?trackId=${track.id}`,
    cover_art_url: track.cover_art_url,
    genre: track.genre,
    tags: track.tags,
    is_public: track.is_public,
    listing_id: track.listing_id,
    allow_downloads: track.allow_downloads,
    allow_library_add: track.allow_library_add,
    access_mode: track.access_mode,
    in_library: track.in_library,
  }
}

function isApiStreamPath(url: string | undefined | null): boolean {
  if (!url) return true
  return url.startsWith("/api/music/stream") || url.includes("/api/music/stream?")
}

function loadPersistedState(): Partial<JukeboxState> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const queue = Array.isArray(parsed.queue)
      ? parsed.queue.slice(0, MAX_PERSISTED_QUEUE).map(stripTrackForPersist)
      : []
    return {
      volume: parsed.volume ?? 0.7,
      isMuted: parsed.isMuted ?? false,
      isShuffled: parsed.isShuffled ?? false,
      repeatMode: parsed.repeatMode ?? "none",
      // Never restore currentTrack — bottom chrome stays hidden until user plays/opens
      currentTrack: null,
      queue,
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
        // Persist queue only — not currentTrack (avoids auto-dock on reload)
        queue: state.queue.slice(0, MAX_PERSISTED_QUEUE).map(stripTrackForPersist),
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
  isPlayerChromeVisible: false,
  initialTab: null,
  visualTheme: "default",
  playbackError: null,
}

function jukeboxReducer(
  state: JukeboxState,
  action: JukeboxAction
): JukeboxState {
  switch (action.type) {
    case "SET_TRACK":
      return {
        ...state,
        currentTrack: action.track,
        currentTime: 0,
        duration: 0,
        playbackError: null,
        isPlayerChromeVisible: true,
      }
    case "CLEAR_TRACK":
      return {
        ...state,
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        playbackError: null,
      }
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
      return { ...state, queue: action.tracks.slice(0, MAX_PERSISTED_QUEUE) }
    case "ADD_TO_QUEUE": {
      if (state.queue.some((t) => t.id === action.track.id)) return state
      return {
        ...state,
        queue: [...state.queue, action.track].slice(0, MAX_PERSISTED_QUEUE),
      }
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
      return {
        ...state,
        isPlayerExpanded: action.expanded,
        // Opening the modal counts as launching the player chrome session
        isPlayerChromeVisible: action.expanded
          ? true
          : state.isPlayerChromeVisible,
        initialTab: !action.expanded
          ? null
          : action.tab !== undefined && action.tab !== null
            ? action.tab
            : action.tab === null
              ? null
              : state.initialTab,
      }
    case "SET_CHROME_VISIBLE":
      return { ...state, isPlayerChromeVisible: action.visible }
    case "DISMISS_PLAYER":
      return {
        ...state,
        isPlayerChromeVisible: false,
        isPlayerExpanded: false,
        initialTab: null,
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        playbackError: null,
      }
    case "CLEAR_INITIAL_TAB":
      return { ...state, initialTab: null }
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
    case "SET_PLAYBACK_ERROR":
      return { ...state, playbackError: action.error, isPlaying: false }
    default:
      return state
  }
}

export interface JukeboxPlayOptions {
  source?: string
}

interface JukeboxContextValue {
  state: JukeboxState
  play: (track: JukeboxTrack, options?: JukeboxPlayOptions) => void
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
  playPlaylist: (tracks: JukeboxTrack[], startIndex?: number, options?: JukeboxPlayOptions) => void
  setActivePlaylistId: (id: string | null) => void
  setExpanded: (expanded: boolean, tab?: JukeboxTab) => void
  dismissPlayer: () => void
  clearInitialTab: () => void
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

function streamErrorMessage(status: number): string {
  if (status === 401) return "Sign in to play this track"
  if (status === 402 || status === 403) return "Purchase or unlock required to play this track"
  if (status === 404) return "Track unavailable"
  return "Unable to play this track"
}

export function JukeboxProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playRecordedRef = useRef<string | null>(null)
  const playSourceRef = useRef<string>('jukebox')
  const playGenerationRef = useRef(0)
  const streamAbortRef = useRef<AbortController | null>(null)
  const lastProgressDispatchRef = useRef(0)
  const handleTrackEndedRef = useRef<() => void>(() => {})
  const nextRef = useRef<() => void>(() => {})
  const playTrackRef = useRef<(track: JukeboxTrack, options?: JukeboxPlayOptions) => void>(() => {})
  const stateRef = useRef<JukeboxState>(initialState)

  const persisted = useRef(loadPersistedState())
  const [state, dispatch] = useReducer(jukeboxReducer, {
    ...initialState,
    ...persisted.current,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    playbackError: null,
    isPlayerChromeVisible: false,
    currentTrack: null,
  })

  stateRef.current = state

  const [audioReady, setAudioReady] = useState(false)

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio()
      audioRef.current.preload = "metadata"
      setAudioReady(true)
    }
    return () => {
      streamAbortRef.current?.abort()
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
      const now = Date.now()
      if (now - lastProgressDispatchRef.current < PROGRESS_THROTTLE_MS) return
      lastProgressDispatchRef.current = now
      dispatch({ type: "SET_CURRENT_TIME", time: audio!.currentTime })
    }
    function onLoadedMetadata() {
      dispatch({ type: "SET_DURATION", duration: audio!.duration || 0 })
    }
    function onEnded() {
      handleTrackEndedRef.current()
    }
    function onError() {
      dispatch({
        type: "SET_PLAYBACK_ERROR",
        error: "Playback failed. Try another track.",
      })
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
  }, [audioReady])

  const recordPlay = useCallback(async (musicId: string, source = "jukebox") => {
    if (playRecordedRef.current === musicId) return
    playRecordedRef.current = musicId
    try {
      await fetch("/api/music/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ musicId, source }),
      })
    } catch {}
  }, [])

  const resolveStreamUrl = useCallback(
    async (
      track: JukeboxTrack,
      signal: AbortSignal
    ): Promise<{ url: string | null; error?: string }> => {
      try {
        const res = await fetch(`/api/music/stream?trackId=${track.id}`, {
          credentials: "include",
          signal,
        })
        if (res.ok) {
          const data = await res.json()
          if (data.url && !isApiStreamPath(data.url)) return { url: data.url }
          if (data.url) return { url: data.url }
          return { url: null, error: "Stream URL missing" }
        }
        return { url: null, error: streamErrorMessage(res.status) }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return { url: null }
        if (!isApiStreamPath(track.file_url)) return { url: track.file_url }
        return { url: null, error: "Unable to load stream" }
      }
    },
    []
  )

  const playTrack = useCallback(
    async (track: JukeboxTrack, options?: JukeboxPlayOptions) => {
      const audio = audioRef.current
      if (!audio) return

      const generation = ++playGenerationRef.current
      streamAbortRef.current?.abort()
      const abortController = new AbortController()
      streamAbortRef.current = abortController
      playSourceRef.current = options?.source || "jukebox"

      audio.pause()
      dispatch({ type: "SET_TRACK", track })
      dispatch({ type: "ADD_TO_HISTORY", track })
      dispatch({ type: "ADD_TO_QUEUE", track })
      playRecordedRef.current = null

      const result = await resolveStreamUrl(track, abortController.signal)
      if (generation !== playGenerationRef.current) return

      if (!result.url) {
        if (result.error) {
          dispatch({ type: "SET_PLAYBACK_ERROR", error: result.error })
          toast.error(result.error)
        }
        return
      }

      audio.src = result.url
      audio.load()
      try {
        await audio.play()
        if (generation !== playGenerationRef.current) {
          audio.pause()
          return
        }
        dispatch({ type: "SET_PLAYING", isPlaying: true })
        recordPlay(track.id, playSourceRef.current)
      } catch {
        if (generation !== playGenerationRef.current) return
        dispatch({
          type: "SET_PLAYBACK_ERROR",
          error: "Playback was blocked or failed",
        })
      }
    },
    [recordPlay, resolveStreamUrl]
  )

  playTrackRef.current = playTrack

  const pause = useCallback(() => {
    audioRef.current?.pause()
    dispatch({ type: "SET_PLAYING", isPlaying: false })
  }, [])

  const resume = useCallback(async () => {
    const audio = audioRef.current
    const track = stateRef.current.currentTrack
    if (!audio || !track) return

    if (!audio.src || isApiStreamPath(audio.src)) {
      playTrackRef.current(track)
      return
    }

    try {
      await audio.play()
      dispatch({ type: "SET_PLAYING", isPlaying: true })
    } catch {
      playTrackRef.current(track)
    }
  }, [])

  const togglePlayPause = useCallback(() => {
    if (stateRef.current.isPlaying) pause()
    else resume()
  }, [pause, resume])

  const getNextTrack = useCallback((): JukeboxTrack | null => {
    const { queue, currentTrack, isShuffled, repeatMode } = stateRef.current
    if (queue.length === 0) return null

    const currentIndex = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1

    if (isShuffled) {
      const remaining = queue.filter((t) => t.id !== currentTrack?.id)
      if (remaining.length === 0)
        return repeatMode === "all" ? queue[0] : null
      return remaining[Math.floor(Math.random() * remaining.length)]
    }

    if (currentIndex === -1 || currentIndex >= queue.length - 1)
      return repeatMode === "all" ? queue[0] : null

    return queue[currentIndex + 1]
  }, [])

  const getPrevTrack = useCallback((): JukeboxTrack | null => {
    const { queue, currentTrack, repeatMode } = stateRef.current
    if (queue.length === 0) return null
    const currentIndex = currentTrack
      ? queue.findIndex((t) => t.id === currentTrack.id)
      : -1
    if (currentIndex <= 0)
      return repeatMode === "all" ? queue[queue.length - 1] : null
    return queue[currentIndex - 1]
  }, [])

  const next = useCallback(() => {
    const nextTrack = getNextTrack()
    if (nextTrack) playTrackRef.current(nextTrack)
    else {
      pause()
      dispatch({ type: "SET_CURRENT_TIME", time: 0 })
    }
  }, [getNextTrack, pause])

  nextRef.current = next

  const prev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      dispatch({ type: "SET_CURRENT_TIME", time: 0 })
      return
    }
    const prevTrack = getPrevTrack()
    if (prevTrack) playTrackRef.current(prevTrack)
  }, [getPrevTrack])

  const handleTrackEnded = useCallback(() => {
    if (stateRef.current.repeatMode === "one") {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
        dispatch({ type: "SET_PLAYING", isPlaying: true })
      }
      return
    }
    nextRef.current()
  }, [])

  handleTrackEndedRef.current = handleTrackEnded

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    lastProgressDispatchRef.current = 0
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
    const idx = modes.indexOf(stateRef.current.repeatMode)
    dispatch({ type: "SET_REPEAT_MODE", mode: modes[(idx + 1) % 3] })
  }, [])

  const addToQueue = useCallback((track: JukeboxTrack) => {
    dispatch({ type: "ADD_TO_QUEUE", track })
  }, [])

  const removeFromQueue = useCallback((index: number) => {
    const current = stateRef.current
    const removed = current.queue[index]
    const isCurrent = removed && current.currentTrack?.id === removed.id
    dispatch({ type: "REMOVE_FROM_QUEUE", index })
    if (isCurrent) nextRef.current()
  }, [])

  const clearQueue = useCallback(() => {
    dispatch({ type: "CLEAR_QUEUE" })
  }, [])

  const playPlaylist = useCallback(
    (tracks: JukeboxTrack[], startIndex = 0, options?: JukeboxPlayOptions) => {
      if (tracks.length === 0) return
      dispatch({ type: "SET_QUEUE", tracks })
      playTrack(tracks[startIndex] || tracks[0], options)
    },
    [playTrack]
  )

  const setActivePlaylistId = useCallback((id: string | null) => {
    dispatch({ type: "SET_ACTIVE_PLAYLIST", playlistId: id })
  }, [])

  const setExpanded = useCallback((expanded: boolean, tab?: JukeboxTab) => {
    dispatch({
      type: "SET_EXPANDED",
      expanded,
      tab: expanded ? (tab ?? null) : null,
    })
  }, [])

  const dismissPlayer = useCallback(() => {
    streamAbortRef.current?.abort()
    playGenerationRef.current += 1
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.removeAttribute("src")
      audio.load()
    }
    playRecordedRef.current = null
    dispatch({ type: "DISMISS_PLAYER" })
    document.documentElement.style.setProperty("--player-height", "0px")
  }, [])

  const clearInitialTab = useCallback(() => {
    dispatch({ type: "CLEAR_INITIAL_TAB" })
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
    dismissPlayer,
    clearInitialTab,
    setVisualTheme,
    getAudioElement,
  }

  return (
    <JukeboxContext.Provider value={value}>
      {children}
    </JukeboxContext.Provider>
  )
}
