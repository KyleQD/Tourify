"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  Star,
  TrendingUp,
  Target,
  Award,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  Edit,
  Plus,
  BarChart3
} from "lucide-react"

interface PerformanceReview {
  id: string
  staffId: string
  reviewDate: string
  overallRating: number
  categories: {
    technical: number
    communication: number
    reliability: number
    teamwork: number
    leadership: number
  }
  goals: Goal[]
  feedback: string
  strengths: string[]
  improvements: string[]
  nextReviewDate: string
}

interface Goal {
  id: string
  title: string
  description: string
  progress: number
  status: 'active' | 'completed' | 'paused'
  deadline: string
  priority: 'low' | 'medium' | 'high'
}

export default function PerformanceManagement() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("reviews")

  // Mock performance data
  const performanceReviews: PerformanceReview[] = [
    {
      id: "review-1",
      staffId: "staff-1",
      reviewDate: "2024-01-15",
      overallRating: 4.8,
      categories: {
        technical: 5.0,
        communication: 4.5,
        reliability: 5.0,
        teamwork: 4.8,
        leadership: 4.6
      },
      goals: [
        {
          id: "goal-1",
          title: "Complete Advanced Certification",
          description: "Obtain Pro Audio certification",
          progress: 75,
          status: "active",
          deadline: "2024-03-01",
          priority: "high"
        }
      ],
      feedback: "Exceptional performance with strong leadership qualities",
      strengths: ["Technical expertise", "Problem solving", "Team mentoring"],
      improvements: ["Time management", "Documentation"],
      nextReviewDate: "2024-07-15"
    }
  ]

  const staffMetrics = [
    {
      id: "staff-1",
      name: "Alex Chen",
      role: "Venue Manager",
      currentRating: 4.8,
      trend: "up",
      completedGoals: 8,
      activeGoals: 3,
      lastReview: "2024-01-15",
      nextReview: "2024-07-15"
    },
    {
      id: "staff-2", 
      name: "Maya Rodriguez",
      role: "Sound Engineer",
      currentRating: 4.6,
      trend: "up",
      completedGoals: 6,
      activeGoals: 2,
      lastReview: "2024-01-10",
      nextReview: "2024-07-10"
    }
  ]

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-400"
    if (rating >= 3.5) return "text-blue-400"
    if (rating >= 2.5) return "text-yellow-400"
    return "text-red-400"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
            Performance Management
          </h1>
          <p className="text-slate-400 mt-1">Track performance, set goals, and conduct reviews</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="bg-slate-800/50 border-slate-600">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button className="bg-gradient-to-r from-orange-500 to-red-600">
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Performance", value: "4.7/5", icon: Star, color: "from-yellow-500 to-orange-500" },
          { label: "Reviews Due", value: "3", icon: Calendar, color: "from-blue-500 to-cyan-500" },
          { label: "Goals Completed", value: "24", icon: Target, color: "from-green-500 to-emerald-500" },
          { label: "High Performers", value: "85%", icon: Award, color: "from-purple-500 to-pink-500" }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/30 border-slate-700/50">
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
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 grid w-full grid-cols-2">
          <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
          <TabsTrigger value="goals">Goals & Objectives</TabsTrigger>
        </TabsList>

        {/* Performance Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {staffMetrics.map((staff) => (
              <Card key={staff.id} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-white font-semibold">{staff.name}</h3>
                        <p className="text-slate-400 text-sm">{staff.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getRatingColor(staff.currentRating)}`}>
                        {staff.currentRating}
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp className={`h-4 w-4 ${staff.trend === 'up' ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-xs text-slate-400">Rating</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                      <div className="text-white font-semibold">{staff.completedGoals}</div>
                      <div className="text-xs text-slate-400">Completed Goals</div>
                    </div>
                    <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                      <div className="text-white font-semibold">{staff.activeGoals}</div>
                      <div className="text-xs text-slate-400">Active Goals</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="text-xs text-slate-400">Last Review: {staff.lastReview}</div>
                    <div className="text-xs text-slate-400">Next Review: {staff.nextReview}</div>
                  </div>

                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="border-slate-600 flex-1">
                      <Edit className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 flex-1">
                      <Target className="h-4 w-4 mr-1" />
                      Set Goals
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {performanceReviews[0].goals.map((goal) => (
              <Card key={goal.id} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold">{goal.title}</h3>
                      <p className="text-slate-400 text-sm">{goal.description}</p>
                    </div>
                    <Badge variant="outline" className={`${
                      goal.priority === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                      goal.priority === 'medium' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                      'text-green-400 bg-green-500/10 border-green-500/20'
                    }`}>
                      {goal.priority}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Progress</span>
                      <span className="text-sm text-white font-medium">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-slate-400">Due: {goal.deadline}</span>
                    </div>
                    <Badge variant="outline" className={`${
                      goal.status === 'completed' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                      goal.status === 'active' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                      'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                    }`}>
                      {goal.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
} 