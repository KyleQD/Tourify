"use client"

import { useState, useEffect } from 'react'
import { 
  Search, 
  X,
  Command as CommandIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog'
import { EnhancedAccountSearch } from './enhanced-account-search'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSearchModal({ isOpen, onClose }: MobileSearchModalProps) {
  // Auto-focus search when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }, 100)
    }
  }, [isOpen])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="top-0 translate-y-0 max-w-full h-screen w-screen border-0 rounded-none p-0 bg-background/95 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full flex flex-col"
        >
          {/* Header */}
          <DialogHeader className="flex-row items-center justify-between p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-purple-500" />
              <h2 className="text-lg font-semibold">Search</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          {/* Search Content */}
          <div className="flex-1 p-4">
            <div className="max-w-2xl mx-auto">
              <EnhancedAccountSearch
                placeholder="Search everything on Tourify…"
                className="w-full"
                showRecentSearches={true}
                onNavigate={onClose}
              />
            </div>

            {/* Search Tips */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="p-4 rounded-xl bg-purple-50 border border-purple-100"
                >
                  <h3 className="font-medium text-purple-900 mb-2">🎵 Find music</h3>
                  <p className="text-sm text-purple-700">Discover artists, songs, albums, and EPs</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="p-4 rounded-xl bg-blue-50 border border-blue-100"
                >
                  <h3 className="font-medium text-blue-900 mb-2">🗓️ Find what’s live</h3>
                  <p className="text-sm text-blue-700">Explore public events and active tours</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 rounded-xl bg-emerald-50 border border-emerald-100"
                >
                  <h3 className="font-medium text-emerald-900 mb-2">👥 Find profiles</h3>
                  <p className="text-sm text-emerald-700">People, artists, services, venues, and organizations</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="p-4 rounded-xl bg-gray-50 border border-gray-200"
                >
                  <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <CommandIcon className="h-4 w-4" />
                    Quick Tip
                  </h3>
                  <p className="text-sm text-gray-700">Use Cmd+K for quick access</p>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
