"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Keyboard, 
  Search, 
  X, 
  Copy, 
  Download,
  Monitor,
  Smartphone,
  Globe,
  Calendar,
  Users,
  Building,
  Music,
  Ticket,
  Truck,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Home,
  Plus,
  Save,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Fullscreen,
  Command
} from "lucide-react"
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts"

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("navigation")
  const { shortcuts, isMac } = useKeyboardShortcuts()

  // Group shortcuts by category
  const shortcutsByCategory = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, typeof shortcuts>)

  // Filter shortcuts based on search
  const filteredShortcuts = shortcuts.filter(shortcut =>
    shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    shortcut.key.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Get modifier key display
  const getModifierKey = () => isMac ? "⌘" : "Ctrl"

  // Format shortcut display
  const formatShortcut = (shortcut: typeof shortcuts[0]) => {
    let display = ''
    if (shortcut.modifier) {
      display += shortcut.modifier === 'cmd' ? '⌘' : shortcut.modifier === 'ctrl' ? 'Ctrl' : shortcut.modifier === 'alt' ? 'Alt' : 'Shift'
      display += '+'
    }
    display += shortcut.key
    return display
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation':
        return <Globe className="h-4 w-4" />
      case 'actions':
        return <Plus className="h-4 w-4" />
      case 'search':
        return <Search className="h-4 w-4" />
      case 'system':
        return <Settings className="h-4 w-4" />
      default:
        return <Keyboard className="h-4 w-4" />
    }
  }

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'navigation':
        return 'text-blue-400'
      case 'actions':
        return 'text-green-400'
      case 'search':
        return 'text-purple-400'
      case 'system':
        return 'text-orange-400'
      default:
        return 'text-slate-400'
    }
  }

  // Copy all shortcuts to clipboard
  const copyAllShortcuts = () => {
    const shortcutsText = shortcuts.map(shortcut => 
      `${formatShortcut(shortcut)}\t${shortcut.description}`
    ).join('\n')
    
    navigator.clipboard.writeText(shortcutsText)
  }

  // Download shortcuts as text file
  const downloadShortcuts = () => {
    const shortcutsText = `Tourify Admin Dashboard - Keyboard Shortcuts\n\n${shortcuts.map(shortcut => 
      `${formatShortcut(shortcut)}\t${shortcut.description}`
    ).join('\n')}`
    
    const blob = new Blob([shortcutsText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tourify-keyboard-shortcuts.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center space-x-3">
              <Keyboard className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
                <p className="text-sm text-slate-400">
                  Master the dashboard with keyboard shortcuts
                  {isMac ? ' (macOS)' : ' (Windows/Linux)'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={copyAllShortcuts}>
                <Copy className="h-4 w-4 mr-2" />
                Copy All
              </Button>
              <Button variant="outline" size="sm" onClick={downloadShortcuts}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Search */}
            <div className="mb-6">
              <Input
                placeholder="Search shortcuts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 border-slate-600"
              />
            </div>

            {/* Shortcuts Display */}
            {searchQuery ? (
              // Search Results
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">
                  Search Results ({filteredShortcuts.length})
                </h3>
                <div className="grid gap-3">
                  {filteredShortcuts.map((shortcut, index) => (
                    <motion.div
                      key={`${shortcut.key}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-slate-700 ${getCategoryColor(shortcut.category)}`}>
                          {getCategoryIcon(shortcut.category)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{shortcut.description}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {shortcut.category}
                          </Badge>
                        </div>
                      </div>
                      <kbd className="px-3 py-1 bg-slate-700 text-slate-200 rounded text-sm font-mono border border-slate-600">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              // Categorized View
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
                  {Object.keys(shortcutsByCategory).map(category => (
                    <TabsTrigger key={category} value={category} className="text-xs">
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
                  <TabsContent key={category} value={category} className="space-y-4">
                    <div className="grid gap-3">
                      {categoryShortcuts.map((shortcut, index) => (
                        <motion.div
                          key={`${shortcut.key}-${index}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-lg bg-slate-700 ${getCategoryColor(category)}`}>
                              {getCategoryIcon(category)}
                            </div>
                            <div>
                              <p className="font-medium text-white">{shortcut.description}</p>
                              {shortcut.global && (
                                <Badge variant="outline" className="text-xs mt-1 bg-blue-500/20 text-blue-300 border-blue-500/30">
                                  Global
                                </Badge>
                              )}
                            </div>
                          </div>
                          <kbd className="px-3 py-1 bg-slate-700 text-slate-200 rounded text-sm font-mono border border-slate-600">
                            {formatShortcut(shortcut)}
                          </kbd>
                        </motion.div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center justify-between text-sm text-slate-400">
              <div className="flex items-center space-x-4">
                <span>Total shortcuts: {shortcuts.length}</span>
                <span>•</span>
                <span>Press ⌘? to show this help anytime</span>
              </div>
              <div className="flex items-center space-x-2">
                {isMac ? (
                  <>
                    <Command className="h-4 w-4" />
                    <span>Command key</span>
                  </>
                ) : (
                  <>
                    <Command className="h-4 w-4" />
                    <span>Control key</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for using keyboard shortcuts help
export function useKeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const openHelp = () => setIsOpen(true)
  const closeHelp = () => setIsOpen(false)

  return {
    isOpen,
    openHelp,
    closeHelp
  }
} 