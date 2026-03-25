"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Shuffle,
  Repeat,
  Music,
  Disc3,
  Radio,
  Headphones,
  Zap,
  Clock,
  Heart,
  Plus,
  ArrowRight,
  RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { jukeboxService, type Song } from "@/lib/services/jukebox.service"

interface JukeboxPlayerProps {
  className?: string
}

export function JukeboxPlayer({ className }: JukeboxPlayerProps) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.7)
  const [isMuted, setIsMuted] = useState(false)
  const [isShuffled, setIsShuffled] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none')
  const [playlist, setPlaylist] = useState<Song[]>([])
  const [showPlaylist, setShowPlaylist] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Handle play/pause
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        // Try to play, but handle errors gracefully
        audioRef.current.play().catch(() => {
          // Still update UI state for demo purposes
          setIsPlaying(true)
          // Simulate audio progress for demo
          const interval = setInterval(() => {
            setCurrentTime(prev => {
              if (prev >= duration) {
                clearInterval(interval)
                setIsPlaying(false)
                return 0
              }
              return prev + 1
            })
          }, 1000)
        })
      }
      setIsPlaying(!isPlaying)
    } else {
      // No audio element available, just toggle state for demo
      setIsPlaying(!isPlaying)
    }
  }

  // Handle song selection
  const selectSong = (song: Song) => {
    setCurrentSong(song)
    setIsPlaying(true)
    jukeboxService.setCurrentSong(song)
    jukeboxService.setPlaying(true)
    // Set the audio source for real playback
    if (audioRef.current) {
      audioRef.current.src = jukeboxService.getAudioUrl(song.id)
      // Try to play the audio
      audioRef.current.play().catch(() => {
        // Still update UI state for demo purposes
        setIsPlaying(true)
        // Simulate audio progress for demo
        const interval = setInterval(() => {
          setCurrentTime(prev => {
            if (prev >= song.duration) {
              clearInterval(interval)
              setIsPlaying(false)
              return 0
            }
            return prev + 1
          })
        }, 1000)
      })
    }
  }

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && audioRef.current) {
      const rect = progressRef.current.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const width = rect.width
      const clickTime = (clickX / width) * duration
      audioRef.current.currentTime = clickTime
      setCurrentTime(clickTime)
    }
  }

  // Handle volume change
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }

  // Handle mute toggle
  const toggleMute = () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    jukeboxService.toggleMute()
    if (audioRef.current) {
      audioRef.current.muted = newMutedState
    }
  }

  // Handle shuffle
  const toggleShuffle = () => {
    const newShuffledState = !isShuffled
    setIsShuffled(newShuffledState)
    jukeboxService.toggleShuffle()
    const state = jukeboxService.getState()
    setPlaylist(state.playlist)
  }

  // Handle repeat
  const toggleRepeat = () => {
    const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all']
    const currentIndex = modes.indexOf(repeatMode)
    const nextIndex = (currentIndex + 1) % modes.length
    const newRepeatMode = modes[nextIndex]
    setRepeatMode(newRepeatMode)
    jukeboxService.setRepeatMode(newRepeatMode)
  }

  // Handle like toggle
  const toggleLike = (songId: string) => {
    jukeboxService.toggleLike(songId)
    const state = jukeboxService.getState()
    setPlaylist(state.playlist)
    if (currentSong?.id === songId) {
      setCurrentSong(state.currentSong)
    }
  }

  // Initialize jukebox service and sync state
  useEffect(() => {
    jukeboxService.initialize()
    const state = jukeboxService.getState()
    setCurrentSong(state.currentSong)
    setIsPlaying(state.isPlaying)
    setCurrentTime(state.currentTime)
    setDuration(state.duration)
    setVolume(state.volume)
    setIsMuted(state.isMuted)
    setIsShuffled(state.isShuffled)
    setRepeatMode(state.repeatMode)
    setPlaylist(state.playlist)
  }, [])

  // Sync state with service
  useEffect(() => {
    if (currentSong) {
      jukeboxService.setCurrentSong(currentSong)
    }
  }, [currentSong])

  useEffect(() => {
    jukeboxService.setPlaying(isPlaying)
  }, [isPlaying])

  useEffect(() => {
    jukeboxService.updateCurrentTime(currentTime)
  }, [currentTime])

  useEffect(() => {
    jukeboxService.updateDuration(duration)
  }, [duration])

  useEffect(() => {
    jukeboxService.setVolume(volume)
  }, [volume])

  useEffect(() => {
    if (isMuted !== jukeboxService.getState().isMuted) {
      jukeboxService.toggleMute()
    }
  }, [isMuted])

  useEffect(() => {
    jukeboxService.setRepeatMode(repeatMode)
  }, [repeatMode])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Jukebox Player */}
      <Card className="bg-gradient-to-br from-purple-900/50 via-pink-900/50 to-orange-900/50 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
        <CardHeader className="pb-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
                      <CardTitle className="text-white flex items-center gap-2 text-lg">
              <div className="relative">
                <Disc3 className="h-6 w-6 text-yellow-400 animate-spin" />
                <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
              </div>
              Jukebox Player
              <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                LIVE
              </Badge>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                DEMO
              </Badge>
            </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Current Song Display */}
          <div className="text-center space-y-4">
            <motion.div 
              className="relative mx-auto w-32 h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
            >
              {currentSong?.albumArt ? (
                <img 
                  src={currentSong.albumArt} 
                  alt={`${currentSong.title} album art by ${currentSong.artist}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music className="h-12 w-12 text-white opacity-50" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20"></div>
            </motion.div>
            
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-lg truncate">
                {currentSong?.title || "No song selected"}
              </h3>
              <p className="text-gray-300 text-sm truncate">
                {currentSong?.artist || "Select a song to start"}
              </p>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                  {currentSong?.genre || "Unknown"}
                </Badge>
                <span className="text-gray-400 text-xs">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div 
              ref={progressRef}
              className="relative w-full h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden"
              onClick={handleProgressClick}
            >
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${(currentTime / duration) * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleShuffle}
              aria-label={isShuffled ? "Disable shuffle" : "Enable shuffle"}
              className={cn(
                "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all",
                isShuffled && "bg-purple-500/30 text-purple-300"
              )}
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              aria-label="Previous track"
              disabled
              title="Previous track is coming soon"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <SkipBack className="h-5 w-5" />
            </Button>
            
            <Button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause playback" : "Start playback"}
              className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 text-white" />
              ) : (
                <Play className="h-6 w-6 text-white ml-1" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              aria-label="Next track"
              disabled
              title="Next track is coming soon"
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleRepeat}
              aria-label={`Change repeat mode (current: ${repeatMode})`}
              className={cn(
                "w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 transition-all",
                repeatMode !== 'none' && "bg-purple-500/30 text-purple-300"
              )}
            >
              <Repeat className="h-4 w-4" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full"></span>
              )}
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          {/* Audio Status Notice */}
          <div className="text-center p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-xs text-gray-300">
              🎵 AYCE Swandive is now available for playback!
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Click on songs in the playlist to start playing
            </p>
          </div>

          {/* Playlist Toggle */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="text-white hover:bg-white/10 transition-all"
            >
              <Headphones className="h-4 w-4 mr-2" />
              {showPlaylist ? "Hide" : "Show"} Playlist
              <ArrowRight className={cn(
                "h-4 w-4 ml-2 transition-transform",
                showPlaylist && "rotate-90"
              )} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              aria-label="Add track"
              disabled
              title="Add track is coming soon"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Playlist */}
      <AnimatePresence>
        {showPlaylist && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Radio className="h-5 w-5 text-purple-400" />
                  Playlist
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                    {playlist.length} songs
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <div className="space-y-1 p-4">
                    {playlist.map((song, index) => (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                          currentSong?.id === song.id 
                            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30" 
                            : "bg-white/5 hover:bg-white/10"
                        )}
                        onClick={() => selectSong(song)}
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Music className="h-5 w-5 text-white" />
                          </div>
                          {currentSong?.id === song.id && isPlaying && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-medium text-sm truncate",
                              currentSong?.id === song.id ? "text-white" : "text-gray-300"
                            )}>
                              {song.title}
                            </span>
                            {song.isLiked && (
                              <Heart className="h-3 w-3 text-red-400 fill-current" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{song.artist}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                            {song.genre}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {formatTime(song.duration)}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => {
          // Handle song ending based on repeat mode
          if (repeatMode === 'one') {
            audioRef.current?.play()
          } else if (repeatMode === 'all') {
            // Play next song
          } else {
            setIsPlaying(false)
          }
        }}
      />

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(to right, #a855f7, #ec4899);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: linear-gradient(to right, #a855f7, #ec4899);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  )
}
