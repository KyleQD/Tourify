"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, X, Star, Zap, Award, Crown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface AchievementNotificationProps {
  achievement: {
    id: string
    name: string
    description: string
    category: string
    icon: string
    color: string
    points: number
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  }
  isVisible: boolean
  onClose: () => void
  onViewDetails?: () => void
  /** When false, parent controls dismiss timing (used by AchievementUnlockProvider). */
  autoHide?: boolean
}

const rarityConfig = {
  common: {
    color: '#10b981',
    bgColor: '#f0fdf4',
    borderColor: '#22c55e',
    icon: Star,
    title: 'Achievement Unlocked!'
  },
  uncommon: {
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#f59e0b',
    icon: Award,
    title: 'Uncommon Achievement!'
  },
  rare: {
    color: '#8b5cf6',
    bgColor: '#faf5ff',
    borderColor: '#a855f7',
    icon: Trophy,
    title: 'Rare Achievement!'
  },
  epic: {
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#f87171',
    icon: Zap,
    title: 'Epic Achievement!'
  },
  legendary: {
    color: '#fbbf24',
    bgColor: '#fffbeb',
    borderColor: '#fbbf24',
    icon: Crown,
    title: 'Legendary Achievement!'
  }
}

export function AchievementNotification({ 
  achievement, 
  isVisible, 
  onClose, 
  onViewDetails,
  autoHide = true,
}: AchievementNotificationProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const config = rarityConfig[achievement.rarity] || rarityConfig.common
  const IconComponent = config.icon
  const showLegendaryEffects = achievement.rarity === 'legendary' || achievement.rarity === 'epic'

  useEffect(() => {
    if (!isVisible) return
    setShowConfetti(true)
    if (!autoHide) return
    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [isVisible, onClose, autoHide])

  const handleViewDetails = () => {
    onViewDetails?.()
    onClose()
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.5 
          }}
          className="fixed top-4 right-4 z-50 w-96 max-w-sm"
        >
          <Card className="border-2 shadow-2xl overflow-hidden" style={{ borderColor: config.borderColor }}>
            <CardContent className="p-0">
              {/* Header with gradient background */}
              <div 
                className="p-4 text-white relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${config.color}, ${config.borderColor})` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 0.5, repeat: 2 }}
                    >
                      <IconComponent className="h-6 w-6" />
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-sm">{config.title}</h3>
                      <p className="text-xs opacity-90">{achievement.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Confetti effect for rare+ unlocks */}
                {showConfetti && showLegendaryEffects && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: ['#fbbf24', '#ef4444', '#8b5cf6', '#10b981', '#f59e0b'][i % 5],
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ 
                          opacity: 0, 
                          y: -100,
                          x: Math.random() * 200 - 100
                        }}
                        transition={{ 
                          duration: 2 + Math.random() * 2,
                          delay: Math.random() * 0.5
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4" style={{ backgroundColor: config.bgColor }}>
                <p className="text-sm text-gray-700 mb-3">{achievement.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <Badge 
                    variant="secondary" 
                    className="text-xs"
                    style={{ backgroundColor: config.color, color: 'white' }}
                  >
                    {achievement.category}
                  </Badge>
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      +{achievement.points} pts
                    </span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewDetails}
                    className="flex-1 text-xs"
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="text-xs"
                    style={{ borderColor: config.color, color: config.color }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Hook to manage achievement notifications
export function useAchievementNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string
    achievement: any
    isVisible: boolean
  }>>([])

  const addNotification = (achievement: any) => {
    const id = Math.random().toString(36).substr(2, 9)
    setNotifications(prev => [...prev, { id, achievement, isVisible: true }])
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const closeNotification = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isVisible: false } : n)
    )
  }

  return {
    notifications,
    addNotification,
    removeNotification,
    closeNotification
  }
} 