"use client"

import { useState, useCallback } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Smile, Clock } from "lucide-react"
let Picker: any = null
let data: any = null
if (typeof window !== 'undefined') {
  // Lazy load to avoid type dependency at build time

  data = require('@emoji-mart/data')

  Picker = require('@emoji-mart/react')
}

interface EmojiPickerProps {
  onEmojiSelect?: (emoji: any) => void
  triggerClassName?: string
  disabled?: boolean
}

const FREQUENTLY_USED_KEY = "frequently-used-emojis"
const MAX_RECENT_EMOJIS = 36

export function EmojiPicker({ onEmojiSelect, triggerClassName = "", disabled = false }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Load frequently used emojis from localStorage
  const loadFrequentlyUsed = useCallback(() => {
    if (typeof window === "undefined") return []
    try {
      const stored = localStorage.getItem(FREQUENTLY_USED_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error("Error loading frequently used emojis:", error)
      return []
    }
  }, [])

  // Save emoji to frequently used
  const saveToFrequentlyUsed = useCallback(
    (emoji: any) => {
      if (typeof window === "undefined") return

      try {
        const current = loadFrequentlyUsed()
        const exists = current.find((e: any) => e.id === emoji.id)

        if (!exists) {
          const updated = [emoji, ...current].slice(0, MAX_RECENT_EMOJIS)
          localStorage.setItem(FREQUENTLY_USED_KEY, JSON.stringify(updated))
        }
      } catch (error) {
        console.error("Error saving frequently used emoji:", error)
      }
    },
    [loadFrequentlyUsed],
  )

  // Handle emoji selection
  const handleEmojiSelect = useCallback(
    (emoji: any) => {
      if (onEmojiSelect) {
        onEmojiSelect(emoji)
      }
      saveToFrequentlyUsed(emoji)
      setIsOpen(false)
    },
    [onEmojiSelect, saveToFrequentlyUsed],
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 hover:bg-gray-800/50 ${triggerClassName}`}
          disabled={disabled}
        >
          <Smile className="h-5 w-5 text-gray-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Tabs defaultValue="all">
          <div className="border-b border-gray-800 px-3">
            <TabsList className="h-10">
              <TabsTrigger value="all" className="text-xs">
                <Smile className="h-4 w-4 mr-1" />
                All
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">
                <Clock className="h-4 w-4 mr-1" />
                Recent
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="all" className="p-0">
            <ScrollArea className="h-[300px]">
              {Picker && data ? (
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  theme="dark"
                  skinTonePosition="none"
                  previewPosition="none"
                  searchPosition="none"
                />
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">Emoji picker unavailable</div>
              )}
            </ScrollArea>
          </TabsContent>
          <TabsContent value="recent" className="p-4">
            <div className="grid grid-cols-8 gap-2">
              {loadFrequentlyUsed().map((emoji: any) => (
                <Button
                  key={emoji.id}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji.native}
                </Button>
              ))}
            </div>
            {loadFrequentlyUsed().length === 0 && (
              <div className="text-center text-sm text-gray-500 py-4">No recently used emojis</div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}