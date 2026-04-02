"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  HelpCircle, 
  BookOpen, 
  Search, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  X, 
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Circle,
  Lightbulb,
  Video,
  FileText,
  Users,
  Settings,
  Keyboard,
  MousePointer,
  Smartphone,
  Monitor,
  Zap,
  Star,
  Bookmark,
  Share2,
  Download,
  ExternalLink,
  Info,
  AlertCircle,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  Calendar,
  Globe,
  Building,
  Music,
  Ticket,
  Truck,
  DollarSign
} from "lucide-react"

interface HelpTopic {
  id: string
  title: string
  description: string
  category: string
  content: string
  videoUrl?: string
  keywords: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  lastUpdated: string
  relatedTopics: string[]
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  target: string // CSS selector for the element to highlight
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
  required: boolean
  completed: boolean
}

interface HelpSystemProps {
  isOpen: boolean
  onClose: () => void
  currentPage?: string
  showOnboarding?: boolean
}

export function HelpSystem({ isOpen, onClose, currentPage, showOnboarding = false }: HelpSystemProps) {
  const [activeTab, setActiveTab] = useState("search")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null)
  const [onboardingStep, setOnboardingStep] = useState(0)
  const [showOnboardingFlow, setShowOnboardingFlow] = useState(showOnboarding)
  const [onboardingCompleted, setOnboardingCompleted] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentTopics, setRecentTopics] = useState<string[]>([])

  // Help topics data
  const helpTopics: HelpTopic[] = [
    {
      id: "dashboard-overview",
      title: "Dashboard Overview",
      description: "Learn about the main dashboard and key metrics",
      category: "Getting Started",
      content: `
        <h3>Welcome to the Tourify Admin Dashboard</h3>
        <p>The dashboard provides a comprehensive overview of your tour management operations. Here's what you'll find:</p>
        
        <h4>Key Metrics</h4>
        <ul>
          <li><strong>Total Tours:</strong> Number of active and completed tours</li>
          <li><strong>Active Events:</strong> Upcoming events and their status</li>
          <li><strong>Revenue:</strong> Total and monthly revenue tracking</li>
          <li><strong>Tickets Sold:</strong> Ticket sales and capacity utilization</li>
        </ul>

        <h4>Quick Actions</h4>
        <ul>
          <li>Use keyboard shortcuts (⌘1-9) for quick navigation</li>
          <li>Click on any metric card to view detailed information</li>
          <li>Use the search bar to find specific content</li>
          <li>Check notifications for important updates</li>
        </ul>

        <h4>Real-time Updates</h4>
        <p>The dashboard updates in real-time, so you'll always see the latest information without refreshing the page.</p>
      `,
      keywords: ["dashboard", "overview", "metrics", "getting started"],
      difficulty: "beginner",
      lastUpdated: "2024-01-15",
      relatedTopics: ["navigation", "keyboard-shortcuts", "notifications"]
    },
    {
      id: "keyboard-shortcuts",
      title: "Keyboard Shortcuts",
      description: "Master keyboard shortcuts for faster navigation",
      category: "Productivity",
      content: `
        <h3>Keyboard Shortcuts Guide</h3>
        <p>Use these keyboard shortcuts to navigate the dashboard more efficiently:</p>

        <h4>Navigation Shortcuts</h4>
        <ul>
          <li><kbd>⌘1</kbd> - Go to Dashboard</li>
          <li><kbd>⌘2</kbd> - Go to Tours</li>
          <li><kbd>⌘3</kbd> - Go to Events</li>
          <li><kbd>⌘4</kbd> - Go to Artists</li>
          <li><kbd>⌘5</kbd> - Go to Venues</li>
          <li><kbd>⌘6</kbd> - Go to Ticketing</li>
          <li><kbd>⌘7</kbd> - Go to Staff & Crew</li>
          <li><kbd>⌘8</kbd> - Go to Logistics</li>
          <li><kbd>⌘9</kbd> - Go to Finances</li>
          <li><kbd>⌘0</kbd> - Go to Analytics</li>
          <li><kbd>⌘,</kbd> - Go to Settings</li>
        </ul>

        <h4>Action Shortcuts</h4>
        <ul>
          <li><kbd>⌘N</kbd> - Create new item</li>
          <li><kbd>⌘S</kbd> - Save current item</li>
          <li><kbd>⌘K</kbd> - Global search</li>
          <li><kbd>⌘F</kbd> - Find in page</li>
          <li><kbd>⌘R</kbd> - Refresh data</li>
          <li><kbd>⌘E</kbd> - Export data</li>
          <li><kbd>⌘A</kbd> - Select all</li>
          <li><kbd>⌘D</kbd> - Deselect all</li>
        </ul>

        <h4>System Shortcuts</h4>
        <ul>
          <li><kbd>⌘?</kbd> - Show this help</li>
          <li><kbd>⌘H</kbd> - Toggle help panel</li>
          <li><kbd>⌘M</kbd> - Toggle sidebar</li>
          <li><kbd>⌘T</kbd> - Toggle theme</li>
        </ul>

        <p><strong>Note:</strong> On Windows/Linux, use <kbd>Ctrl</kbd> instead of <kbd>⌘</kbd>.</p>
      `,
      keywords: ["keyboard", "shortcuts", "navigation", "productivity"],
      difficulty: "beginner",
      lastUpdated: "2024-01-15",
      relatedTopics: ["navigation", "productivity-tips"]
    },
    {
      id: "tour-management",
      title: "Tour Management",
      description: "Complete guide to managing tours and events",
      category: "Tours & Events",
      content: `
        <h3>Tour Management Guide</h3>
        <p>Learn how to effectively manage your tours and events:</p>

        <h4>Creating a New Tour</h4>
        <ol>
          <li>Navigate to Tours section (⌘2)</li>
          <li>Click "New Tour" or use ⌘N</li>
          <li>Fill in tour details (name, artist, dates)</li>
          <li>Add venues and dates</li>
          <li>Configure ticketing options</li>
          <li>Set up logistics and crew</li>
          <li>Save and publish</li>
        </ol>

        <h4>Tour Status Management</h4>
        <ul>
          <li><strong>Planning:</strong> Tour is being planned</li>
          <li><strong>Active:</strong> Tour is currently running</li>
          <li><strong>Completed:</strong> Tour has finished</li>
          <li><strong>Cancelled:</strong> Tour was cancelled</li>
        </ul>

        <h4>Event Management</h4>
        <p>Each tour can have multiple events. Manage them individually or in bulk:</p>
        <ul>
          <li>Add/remove events from tours</li>
          <li>Update event details and status</li>
          <li>Manage ticket sales and capacity</li>
          <li>Track event performance</li>
        </ul>

        <h4>Best Practices</h4>
        <ul>
          <li>Always verify venue availability before confirming</li>
          <li>Set up notifications for important milestones</li>
          <li>Regularly update tour status and progress</li>
          <li>Monitor ticket sales and adjust capacity as needed</li>
        </ul>
      `,
      keywords: ["tour", "management", "events", "planning"],
      difficulty: "intermediate",
      lastUpdated: "2024-01-15",
      relatedTopics: ["event-management", "ticketing", "logistics"]
    },
    {
      id: "analytics-insights",
      title: "Analytics & Insights",
      description: "Understanding your data and performance metrics",
      category: "Analytics",
      content: `
        <h3>Analytics & Insights Guide</h3>
        <p>Make data-driven decisions with comprehensive analytics:</p>

        <h4>Key Metrics Explained</h4>
        <ul>
          <li><strong>Revenue Growth:</strong> Month-over-month revenue comparison</li>
          <li><strong>Ticket Sales:</strong> Sales trends and capacity utilization</li>
          <li><strong>Event Performance:</strong> Attendance and satisfaction metrics</li>
          <li><strong>Geographic Distribution:</strong> Tour locations and regional performance</li>
        </ul>

        <h4>Reports Available</h4>
        <ul>
          <li><strong>Financial Reports:</strong> Revenue, expenses, and profitability</li>
          <li><strong>Sales Reports:</strong> Ticket sales and conversion rates</li>
          <li><strong>Performance Reports:</strong> Event and tour performance</li>
          <li><strong>Audience Reports:</strong> Demographics and preferences</li>
        </ul>

        <h4>Exporting Data</h4>
        <p>Export any report in multiple formats:</p>
        <ul>
          <li>PDF for presentations and sharing</li>
          <li>CSV for data analysis</li>
          <li>Excel for detailed reporting</li>
        </ul>

        <h4>Custom Dashboards</h4>
        <p>Create custom dashboards to focus on specific metrics that matter to you.</p>
      `,
      keywords: ["analytics", "insights", "reports", "metrics"],
      difficulty: "intermediate",
      lastUpdated: "2024-01-15",
      relatedTopics: ["reports", "data-export"]
    }
  ]

  // Onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Tourify Admin",
      description: "Let's get you started with a quick tour",
      target: ".dashboard-overview",
      content: "This is your main dashboard where you'll see all your key metrics and recent activity.",
      position: "bottom",
      required: true,
      completed: false
    },
    {
      id: "navigation",
      title: "Navigation",
      description: "Learn how to navigate the dashboard",
      target: ".sidebar",
      content: "Use the sidebar to navigate between different sections. You can also use keyboard shortcuts (⌘1-9) for quick access.",
      position: "right",
      required: true,
      completed: false
    },
    {
      id: "search",
      title: "Global Search",
      description: "Find anything quickly",
      target: ".global-search",
      content: "Use the search bar to find tours, events, artists, or any other content. Press ⌘K to open search from anywhere.",
      position: "bottom",
      required: false,
      completed: false
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Stay updated with notifications",
      target: ".notifications",
      content: "Check here for important updates, alerts, and notifications about your tours and events.",
      position: "bottom",
      required: false,
      completed: false
    },
    {
      id: "help",
      title: "Getting Help",
      description: "Access help anytime",
      target: ".help-button",
      content: "Click the help icon or press ⌘? to access help, tutorials, and support anytime you need assistance.",
      position: "left",
      required: false,
      completed: false
    }
  ]

  // Filter topics based on search query
  const filteredTopics = helpTopics.filter(topic =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    topic.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Get topics by category
  const topicsByCategory = helpTopics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = []
    }
    acc[topic.category].push(topic)
    return acc
  }, {} as Record<string, HelpTopic[]>)

  // Handle topic selection
  const handleTopicSelect = useCallback((topic: HelpTopic) => {
    setSelectedTopic(topic)
    setActiveTab("topic")
    
    // Add to recent topics
    setRecentTopics(prev => {
      const filtered = prev.filter(id => id !== topic.id)
      return [topic.id, ...filtered.slice(0, 4)]
    })
  }, [])

  // Handle onboarding navigation
  const handleOnboardingNext = useCallback(() => {
    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep(prev => prev + 1)
    } else {
      setShowOnboardingFlow(false)
      setOnboardingCompleted(true)
      localStorage.setItem('onboardingCompleted', 'true')
    }
  }, [onboardingStep, onboardingSteps.length])

  const handleOnboardingPrev = useCallback(() => {
    if (onboardingStep > 0) {
      setOnboardingStep(prev => prev - 1)
    }
  }, [onboardingStep])

  const handleOnboardingSkip = useCallback(() => {
    setShowOnboardingFlow(false)
    setOnboardingCompleted(true)
    localStorage.setItem('onboardingCompleted', 'true')
  }, [])

  // Toggle favorite
  const toggleFavorite = useCallback((topicId: string) => {
    setFavorites(prev => {
      if (prev.includes(topicId)) {
        return prev.filter(id => id !== topicId)
      } else {
        return [...prev, topicId]
      }
    })
  }, [])

  // Check if onboarding was completed
  useEffect(() => {
    const completed = localStorage.getItem('onboardingCompleted')
    if (completed) {
      setOnboardingCompleted(true)
    }
  }, [])

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
              <HelpCircle className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-xl font-semibold text-white">Help & Support</h2>
                <p className="text-sm text-slate-400">Find answers and learn how to use the dashboard</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar */}
            <div className="w-80 border-r border-slate-700 bg-slate-800/50">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
                  <TabsTrigger value="search" className="text-xs">Search</TabsTrigger>
                  <TabsTrigger value="topics" className="text-xs">Topics</TabsTrigger>
                  <TabsTrigger value="onboarding" className="text-xs">Tour</TabsTrigger>
                </TabsList>

                <TabsContent value="search" className="h-full p-4 space-y-4">
                  <div className="space-y-3">
                    <Input
                      placeholder="Search help topics..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-slate-700 border-slate-600"
                    />
                    
                    {searchQuery && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-slate-300">Search Results</h4>
                        {filteredTopics.map(topic => (
                          <div
                            key={topic.id}
                            className="p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                            onClick={() => handleTopicSelect(topic)}
                          >
                            <h5 className="font-medium text-white">{topic.title}</h5>
                            <p className="text-sm text-slate-400">{topic.description}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {topic.difficulty}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="topics" className="h-full p-4 space-y-4 overflow-y-auto">
                  <div className="space-y-4">
                    {Object.entries(topicsByCategory).map(([category, topics]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">{category}</h4>
                        <div className="space-y-2">
                          {topics.map(topic => (
                            <div
                              key={topic.id}
                              className="p-3 bg-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                              onClick={() => handleTopicSelect(topic)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-white">{topic.title}</h5>
                                  <p className="text-sm text-slate-400">{topic.description}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleFavorite(topic.id)
                                  }}
                                  className="text-slate-400 hover:text-yellow-400"
                                >
                                  <Bookmark className={`h-4 w-4 ${favorites.includes(topic.id) ? 'fill-current' : ''}`} />
                                </Button>
                              </div>
                              <Badge variant="outline" className="mt-2 text-xs">
                                {topic.difficulty}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="onboarding" className="h-full p-4 space-y-4">
                  <div className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-medium text-white mb-2">Interactive Tour</h4>
                      <p className="text-sm text-slate-400 mb-4">
                        Take a guided tour to learn the basics
                      </p>
                      <Button
                        onClick={() => setShowOnboardingFlow(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Start Tour
                      </Button>
                    </div>

                    {recentTopics.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Recently Viewed</h4>
                        <div className="space-y-2">
                          {recentTopics.map(topicId => {
                            const topic = helpTopics.find(t => t.id === topicId)
                            if (!topic) return null
                            return (
                              <div
                                key={topic.id}
                                className="p-2 bg-slate-700/50 rounded cursor-pointer hover:bg-slate-700 transition-colors"
                                onClick={() => handleTopicSelect(topic)}
                              >
                                <h5 className="text-sm font-medium text-white">{topic.title}</h5>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {favorites.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-300 mb-2">Favorites</h4>
                        <div className="space-y-2">
                          {favorites.map(topicId => {
                            const topic = helpTopics.find(t => t.id === topicId)
                            if (!topic) return null
                            return (
                              <div
                                key={topic.id}
                                className="p-2 bg-slate-700/50 rounded cursor-pointer hover:bg-slate-700 transition-colors"
                                onClick={() => handleTopicSelect(topic)}
                              >
                                <h5 className="text-sm font-medium text-white">{topic.title}</h5>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === "topic" && selectedTopic ? (
                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-white mb-2">{selectedTopic.title}</h3>
                      <p className="text-slate-400 mb-4">{selectedTopic.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span>Category: {selectedTopic.category}</span>
                        <span>Difficulty: {selectedTopic.difficulty}</span>
                        <span>Updated: {selectedTopic.lastUpdated}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleFavorite(selectedTopic.id)}
                        className={favorites.includes(selectedTopic.id) ? 'text-yellow-400 border-yellow-400' : ''}
                      >
                        <Bookmark className={`h-4 w-4 ${favorites.includes(selectedTopic.id) ? 'fill-current' : ''}`} />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedTopic.content }} />
                  </div>

                  {selectedTopic.relatedTopics.length > 0 && (
                    <div className="border-t border-slate-700 pt-6">
                      <h4 className="text-lg font-medium text-white mb-3">Related Topics</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedTopic.relatedTopics.map(topicId => {
                          const topic = helpTopics.find(t => t.id === topicId)
                          if (!topic) return null
                          return (
                            <Button
                              key={topic.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleTopicSelect(topic)}
                              className="text-slate-300 border-slate-600 hover:bg-slate-700"
                            >
                              {topic.title}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <HelpCircle className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Welcome to Help</h3>
                  <p className="text-slate-400 mb-6">
                    Search for topics, browse categories, or take an interactive tour to get started.
                  </p>
                  <div className="flex items-center justify-center space-x-4">
                    <Button onClick={() => setActiveTab("search")}>
                      <Search className="h-4 w-4 mr-2" />
                      Search Topics
                    </Button>
                    <Button variant="outline" onClick={() => setShowOnboardingFlow(true)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Tour
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Onboarding Overlay */}
        <AnimatePresence>
          {showOnboardingFlow && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60"
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6"
                >
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2">
                      {onboardingSteps.map((step, index) => (
                        <div
                          key={step.id}
                          className={`w-2 h-2 rounded-full ${
                            index === onboardingStep ? 'bg-blue-500' : 
                            index < onboardingStep ? 'bg-green-500' : 'bg-slate-600'
                          }`}
                        />
                      ))}
                    </div>

                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {onboardingSteps[onboardingStep].title}
                      </h3>
                      <p className="text-slate-400">
                        {onboardingSteps[onboardingStep].content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Button
                        variant="ghost"
                        onClick={handleOnboardingSkip}
                        className="text-slate-400 hover:text-white"
                      >
                        Skip Tour
                      </Button>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          onClick={handleOnboardingPrev}
                          disabled={onboardingStep === 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={handleOnboardingNext}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {onboardingStep === onboardingSteps.length - 1 ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Finish
                            </>
                          ) : (
                            <>
                              Next
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook for using help system
export function useHelpSystem() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState<string>()

  const openHelp = useCallback((page?: string) => {
    setCurrentPage(page)
    setIsOpen(true)
  }, [])

  const closeHelp = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    openHelp,
    closeHelp,
    currentPage
  }
} 