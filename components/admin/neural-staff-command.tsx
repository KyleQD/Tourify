"use client"

/** Admin Dashboard Builder: Placeholder AI surface; staff ops tabs are canonical (cmp-neural-staff wont-fix). */

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Settings,
  Users,
  Target,
  MessageSquare,
  Bell,
  Calendar,
  UserPlus,
  Activity,
  CheckCircle,
  AlertTriangle,
  Send,
  RadioTower,
  Wifi,
  Clock,
  Award,
  Star,
  Zap,
  BarChart3,
  Mic,
  Download,
  Filter,
  Search,
  Eye,
  Edit,
  MoreVertical,
  Plus,
  X,
  RotateCcw,
  Play,
  Pause,
  Volume2,
  VolumeX
} from "lucide-react"

interface NeuralCommandProps {
  staffCount: number
  activeStaff: number
  onTour: number
  available: number
  averageRating: number
  completedTours: number
}

interface AIInsight {
  id: string
  type: 'optimization' | 'alert' | 'suggestion' | 'prediction'
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'scheduling' | 'performance' | 'communication' | 'resource'
  timestamp: string
  actionable: boolean
  action?: string
}

interface LiveActivity {
  id: string
  user: string
  action: string
  time: string
  type: 'work' | 'admin' | 'update' | 'complete' | 'system' | 'ai'
  department: string
  impact: 'low' | 'medium' | 'high'
}

export function NeuralStaffCommand({ 
  staffCount, 
  activeStaff, 
  onTour, 
  available, 
  averageRating, 
  completedTours 
}: NeuralCommandProps) {
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [isEmergencyMode, setIsEmergencyMode] = useState(false)
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([
    {
      id: "1",
      type: "optimization",
      title: "Staff Scheduling Optimization",
      description: "AI analysis suggests moving 3 staff members to evening shifts could improve performance by 15%",
      priority: "high",
      category: "scheduling",
      timestamp: "2 min ago",
      actionable: true,
      action: "Apply Optimization"
    },
    {
      id: "2",
      type: "alert",
      title: "Availability Conflict Detected",
      description: "Jordan Kim has overlapping shifts scheduled for this weekend",
      priority: "critical",
      category: "scheduling",
      timestamp: "5 min ago",
      actionable: true,
      action: "Resolve Conflict"
    },
    {
      id: "3",
      type: "suggestion",
      title: "Performance Training Opportunity",
      description: "5 staff members show potential for advanced training programs",
      priority: "medium",
      category: "performance",
      timestamp: "12 min ago",
      actionable: true,
      action: "View Candidates"
    },
    {
      id: "4",
      type: "prediction",
      title: "Staffing Demand Forecast",
      description: "Predicted 20% increase in staffing needs for upcoming festival season",
      priority: "high",
      category: "resource",
      timestamp: "1 hour ago",
      actionable: true,
      action: "Review Forecast"
    }
  ])

  const [liveActivities, setLiveActivities] = useState<LiveActivity[]>([
    {
      id: "1",
      user: "Sarah Johnson",
      action: "Completed sound check for tonight's event",
      time: "2 min ago",
      type: "work",
      department: "Production",
      impact: "medium"
    },
    {
      id: "2",
      user: "AI System",
      action: "Optimized staff schedule for weekend events",
      time: "5 min ago",
      type: "ai",
      department: "System",
      impact: "high"
    },
    {
      id: "3",
      user: "Mike Chen",
      action: "Updated security protocols",
      time: "8 min ago",
      type: "update",
      department: "Security",
      impact: "high"
    },
    {
      id: "4",
      user: "Emma Rodriguez",
      action: "Approved overtime request for weekend event",
      time: "12 min ago",
      type: "admin",
      department: "Operations",
      impact: "medium"
    },
    {
      id: "5",
      user: "AI System",
      action: "Detected performance anomaly in lighting team",
      time: "15 min ago",
      type: "ai",
      department: "System",
      impact: "low"
    }
  ])

  const handleBroadcast = () => {
    if (!broadcastMessage.trim()) return
    
    // Add to live activities
    const newActivity: LiveActivity = {
      id: Date.now().toString(),
      user: "Admin",
      action: `Broadcast: ${broadcastMessage}`,
      time: "Just now",
      type: "admin",
      department: "Admin",
      impact: isEmergencyMode ? "high" : "medium"
    }
    
    setLiveActivities(prev => [newActivity, ...prev.slice(0, 9)])
    setBroadcastMessage("")
  }

  const handleAIInsightAction = (insightId: string) => {
    // Handle AI insight actions
    console.log(`Executing action for insight: ${insightId}`)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'work': return 'bg-green-400'
      case 'admin': return 'bg-blue-400'
      case 'update': return 'bg-yellow-400'
      case 'complete': return 'bg-purple-400'
      case 'ai': return 'bg-cyan-400'
      case 'system': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-6">
      {/* Neural Command Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Neural Staff Command
            </h2>
            <p className="text-slate-400">Advanced workforce intelligence & communication hub</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            className="bg-slate-800/50 border-slate-600 hover:bg-slate-700/50 backdrop-blur-sm"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
            <Settings className="h-4 w-4 mr-2" />
            AI Settings
          </Button>
        </div>
      </motion.div>

      {/* Real-time Stats Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-6 gap-4"
      >
        {[
          { label: "Total Staff", value: staffCount, icon: Users, color: "from-blue-500 to-cyan-500" },
          { label: "Active Staff", value: activeStaff, icon: Wifi, color: "from-green-500 to-emerald-500" },
          { label: "On Tour", value: onTour, icon: Calendar, color: "from-purple-500 to-pink-500" },
          { label: "Available", value: available, icon: CheckCircle, color: "from-teal-500 to-cyan-500" },
          { label: "Avg Rating", value: `${averageRating.toFixed(1)}`, icon: Star, color: "from-yellow-500 to-orange-500" },
          { label: "Tours Complete", value: completedTours, icon: Award, color: "from-indigo-500 to-purple-500" }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Emergency Broadcast System */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border-red-500/30 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <RadioTower className="h-5 w-5 text-red-400" />
                <span className="text-red-400 font-semibold">Broadcast System</span>
              </div>
              <div className="flex-1 flex items-center space-x-2">
                <Input 
                  placeholder="Send message to all staff..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEmergencyMode(!isEmergencyMode)}
                  className={`${isEmergencyMode ? 'bg-red-600 border-red-500 text-white' : 'border-slate-600'}`}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Emergency
                </Button>
                <Button 
                  onClick={handleBroadcast}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights and Live Activity */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* AI Insights */}
        <Card className="lg:col-span-2 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BrainCircuit className="h-5 w-5 text-purple-400" />
              <span className="text-purple-400">AI Insights & Recommendations</span>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">BETA</Badge>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-4">
                {aiInsights.map((insight) => (
                  <div key={insight.id} className="p-4 rounded-lg border backdrop-blur-sm hover:bg-slate-800/30 transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${getPriorityColor(insight.priority)}`}>
                          {insight.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                          {insight.category}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500">{insight.timestamp}</span>
                    </div>
                    
                    <h4 className="text-white font-semibold mb-2">{insight.title}</h4>
                    <p className="text-slate-400 text-sm mb-3">{insight.description}</p>
                    
                    {insight.actionable && insight.action && (
                      <div className="flex items-center justify-between">
                        <Button 
                          size="sm"
                          onClick={() => handleAIInsightAction(insight.id)}
                          className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-400"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          {insight.action}
                        </Button>
                        <Button variant="outline" size="sm" className="border-slate-600">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Activity Feed */}
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-cyan-400" />
              <span className="text-cyan-400">Live Activity Feed</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {liveActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getActivityTypeColor(activity.type)}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-sm font-medium truncate">{activity.user}</p>
                        <span className={`text-xs ${getImpactColor(activity.impact)}`}>
                          {activity.impact} impact
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mb-1">{activity.action}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-slate-500 text-xs">{activity.time}</p>
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                          {activity.department}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Scheduler */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BrainCircuit className="h-5 w-5 text-purple-400" />
              <span className="text-purple-400">AI Scheduler</span>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white">BETA</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <h4 className="text-purple-400 font-medium mb-2">Optimization Suggestions</h4>
                <div className="text-slate-300 text-sm space-y-1">
                  <p>• Move Maya to evening shift for better performance match</p>
                  <p>• Jordan has availability conflict at 18:00</p>
                  <p>• Recommend hiring additional security staff</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-400">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Auto-Assign
                </Button>
                <Button className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 hover:from-cyan-600/30 hover:to-blue-600/30 text-cyan-400">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Optimize
                </Button>
              </div>
              
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700">
                <Settings className="h-4 w-4 mr-2" />
                Configure AI Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
} 