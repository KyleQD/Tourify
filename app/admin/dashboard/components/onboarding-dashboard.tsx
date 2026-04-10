"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Badge } from "../../../../components/ui/badge"
import { Progress } from "../../../../components/ui/progress"
import { motion, AnimatePresence } from "framer-motion"
import { CreateTourButton, CreateEventButton } from "./dashboard-navigation"
import {
  Globe,
  Calendar,
  Users,
  DollarSign,
  Music,
  Building,
  BarChart3,
  Target,
  ArrowRight,
  Play,
  CheckCircle,
  Star,
  MapPin,
  Clock,
  Plus,
  Sparkles,
  Zap,
  Award,
  TrendingUp,
  Activity,
  Bell,
  Settings,
  BookOpen,
  Lightbulb,
  Rocket
} from "lucide-react"

interface OnboardingDashboardProps {
  className?: string
}

export function OnboardingDashboard({ className = "" }: OnboardingDashboardProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [showDemo, setShowDemo] = useState(false)

  const features = [
    {
      icon: Globe,
      title: "Tour Management",
      description: "Plan and manage multi-city tours with ease",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    {
      icon: Calendar,
      title: "Event Scheduling",
      description: "Schedule shows, travel days, and rest periods",
      color: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    {
      icon: Users,
      title: "Team Coordination",
      description: "Manage crew, artists, and staff assignments",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    {
      icon: DollarSign,
      title: "Budget Tracking",
      description: "Monitor expenses and revenue in real-time",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20"
    },
    {
      icon: Building,
      title: "Venue Management",
      description: "Coordinate with venues and manage contracts",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Track performance and generate insights",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20"
    }
  ]

  const quickStartSteps = [
    {
      title: "Create Your First Tour",
      description: "Set up a tour with basic information, dates, and budget",
      icon: Globe,
      action: "Create Tour",
      component: <CreateTourButton variant="secondary" />
    },
    {
      title: "Add Events & Shows",
      description: "Schedule performances, travel days, and other events",
      icon: Calendar,
      action: "Add Event",
      component: <CreateEventButton variant="secondary" />
    },
    {
      title: "Invite Your Team",
      description: "Add crew members, artists, and staff to collaborate",
      icon: Users,
      action: "Add Team"
    },
    {
      title: "Track Your Success",
      description: "Monitor budgets, ticket sales, and performance metrics",
      icon: BarChart3,
      action: "View Analytics"
    }
  ]

  const demoWidgets = [
    {
      title: "Active Tours",
      content: (
        <div className="space-y-3">
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-white">Summer Festival Tour</h4>
              <Badge className="bg-green-500/20 text-green-400">Active</Badge>
            </div>
            <p className="text-xs text-slate-400 mb-2">The Electric Waves</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Progress</span>
                <span className="text-white">65%</span>
              </div>
              <Progress value={65} className="h-1" />
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Upcoming Events",
      content: (
        <div className="space-y-2">
          {[
            { name: "Madison Square Garden", date: "Tonight", status: "confirmed" },
            { name: "Boston Symphony Hall", date: "Tomorrow", status: "confirmed" },
            { name: "Chicago Theatre", date: "Jul 25", status: "scheduled" }
          ].map((event, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{event.name}</p>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  <span>{event.date}</span>
                </div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400">{event.status}</Badge>
            </div>
          ))}
        </div>
      )
    },
    {
      title: "Budget Overview",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-green-400">$2.5M</p>
              <p className="text-xs text-slate-400">Total Budget</p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-400">$1.2M</p>
              <p className="text-xs text-slate-400">Spent</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { name: "Venues", percentage: 40 },
              { name: "Travel", percentage: 25 },
              { name: "Staff", percentage: 35 }
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">{item.name}</span>
                  <span className="text-white">{item.percentage}%</span>
                </div>
                <Progress value={item.percentage} className="h-1" />
              </div>
            ))}
          </div>
        </div>
      )
    }
  ]

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6 py-12"
      >
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-2xl">
              <Rocket className="h-12 w-12 text-purple-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            Welcome to Tour Management
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Create, manage, and track your tours and events with our comprehensive platform. 
            Get started by creating your first tour!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <CreateTourButton variant="primary" />
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowDemo(!showDemo)}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <Play className="h-5 w-5 mr-2" />
            See Demo Dashboard
          </Button>
        </div>
      </motion.div>

      {/* Demo Dashboard */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Dashboard Preview</h2>
              <p className="text-slate-400">Here&apos;s what your dashboard will look like with active tours and events</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {demoWidgets.map((widget, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-white text-sm font-medium">{widget.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {widget.content}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features Grid */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Powerful Features</h2>
          <p className="text-slate-400">Everything you need to manage successful tours and events</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className={`p-3 rounded-full ${feature.bgColor} w-fit group-hover:scale-110 transition-transform`}>
                        <Icon className={`h-6 w-6 ${feature.color}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                        <p className="text-slate-400 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Quick Start Guide</h2>
          <p className="text-slate-400">Get up and running in 4 simple steps</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {quickStartSteps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === activeStep
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onMouseEnter={() => setActiveStep(index)}
              >
                <Card className={`bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-300 cursor-pointer ${
                  isActive ? 'ring-2 ring-purple-500/50' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center ${
                          isActive ? 'scale-110' : ''
                        } transition-transform`}>
                          <Icon className="h-6 w-6 text-purple-400" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-purple-400">Step {index + 1}</span>
                            {index === 0 && <Badge className="bg-green-500/20 text-green-400">Start Here</Badge>}
                          </div>
                          <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                          <p className="text-slate-400 text-sm">{step.description}</p>
                        </div>
                        {step.component && (
                          <div className="flex items-center space-x-2">
                            {step.component}
                            <ArrowRight className="h-4 w-4 text-purple-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Call to Action */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 space-y-6"
      >
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Ready to Get Started?</h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            Create your first tour and start experiencing the power of professional tour management.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <CreateTourButton variant="primary" />
          <CreateEventButton variant="outline" />
        </div>
      </motion.div>
    </div>
  )
} 