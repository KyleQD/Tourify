"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { ComingSoonBanner } from "@/components/ui/coming-soon-banner"
import {
  BookOpen,
  Award,
  Clock,
  Users,
  Play,
  CheckCircle,
  Star,
  Calendar,
  Target,
  TrendingUp,
  Plus
} from "lucide-react"

interface TrainingCourse {
  id: string
  title: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  duration: string
  instructor: string
  enrolledCount: number
  completionRate: number
  rating: number
  status: 'available' | 'coming_soon' | 'full'
}

interface Certification {
  id: string
  name: string
  issuer: string
  description: string
  requirements: string[]
  validity: string
  cost: number
  nextExam: string
}

export default function TrainingDevelopment() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("courses")

  const trainingCourses: TrainingCourse[] = [
    {
      id: "course-1",
      title: "Advanced Pro Tools Certification",
      description: "Master professional audio production with Pro Tools",
      category: "Technical",
      difficulty: "advanced",
      duration: "40 hours",
      instructor: "Sarah Chen",
      enrolledCount: 12,
      completionRate: 85,
      rating: 4.8,
      status: "available"
    },
    {
      id: "course-2",
      title: "Leadership in Event Management",
      description: "Develop leadership skills for venue operations",
      category: "Management",
      difficulty: "intermediate",
      duration: "24 hours",
      instructor: "Mike Johnson",
      enrolledCount: 8,
      completionRate: 92,
      rating: 4.6,
      status: "available"
    }
  ]

  const certifications: Certification[] = [
    {
      id: "cert-1",
      name: "Certified Event Security Professional",
      issuer: "International Security Foundation",
      description: "Professional certification for event security specialists",
      requirements: ["2+ years experience", "CPR certification", "Background check"],
      validity: "3 years",
      cost: 450,
      nextExam: "2024-03-15"
    }
  ]

  const staffProgress = [
    {
      id: "staff-1",
      name: "Maya Rodriguez",
      role: "Sound Engineer",
      coursesCompleted: 5,
      inProgress: 2,
      certifications: 3,
      skillLevel: 85
    }
  ]

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'intermediate': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'advanced': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Training & Development
          </h1>
          <p className="text-slate-400 mt-1">Enhance staff skills and track certifications</p>
        </div>
        <Button className="bg-gradient-to-r from-purple-500 to-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Training
        </Button>
      </div>

      <ComingSoonBanner
        title="Training platform coming soon"
        description="Course enrollment, certification tracking, and staff progress analytics are being built out. Sample data is shown below for preview."
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Courses", value: "12", icon: BookOpen, color: "from-blue-500 to-cyan-500" },
          { label: "Certifications", value: "8", icon: Award, color: "from-yellow-500 to-orange-500" },
          { label: "Enrolled Staff", value: "24", icon: Users, color: "from-green-500 to-emerald-500" },
          { label: "Completion Rate", value: "89%", icon: TrendingUp, color: "from-purple-500 to-pink-500" }
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
        <TabsList className="bg-slate-800/50 grid w-full grid-cols-3">
          <TabsTrigger value="courses">Training Courses</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="progress">Staff Progress</TabsTrigger>
        </TabsList>

        {/* Training Courses */}
        <TabsContent value="courses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {trainingCourses.map((course) => (
              <Card key={course.id} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{course.title}</h3>
                      <p className="text-slate-400 text-sm mb-2">{course.description}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                          {course.difficulty}
                        </Badge>
                        <Badge variant="outline" className="bg-slate-700/50 border-slate-600">
                          {course.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="text-yellow-400 font-medium">{course.rating}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-slate-300 text-sm">{course.duration}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-green-400" />
                      <span className="text-slate-300 text-sm">{course.enrolledCount} enrolled</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-slate-400 text-sm">Completion Rate</span>
                      <span className="text-white font-medium">{course.completionRate}%</span>
                    </div>
                    <Progress value={course.completionRate} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Instructor: {course.instructor}</span>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <Play className="h-4 w-4 mr-1" />
                      Enroll
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Certifications */}
        <TabsContent value="certifications" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {certifications.map((cert) => (
              <Card key={cert.id} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg">{cert.name}</h3>
                      <p className="text-slate-400 text-sm mb-2">Issued by: {cert.issuer}</p>
                      <p className="text-slate-300 text-sm mb-4">{cert.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-slate-400 text-xs mb-1">Requirements</div>
                          <ul className="text-slate-300 text-sm space-y-1">
                            {cert.requirements.map((req, i) => (
                              <li key={i} className="flex items-center space-x-2">
                                <CheckCircle className="h-3 w-3 text-green-400" />
                                <span>{req}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <div className="text-slate-400 text-xs mb-1">Details</div>
                          <div className="space-y-1 text-sm">
                            <div className="text-slate-300">Valid for: {cert.validity}</div>
                            <div className="text-green-400 font-medium">${cert.cost}</div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-slate-400 text-xs mb-1">Next Exam</div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-400" />
                            <span className="text-slate-300 text-sm">{cert.nextExam}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Button className="bg-yellow-600 hover:bg-yellow-700">
                      <Award className="h-4 w-4 mr-1" />
                      Register
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Staff Progress */}
        <TabsContent value="progress" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {staffProgress.map((staff) => (
              <Card key={staff.id} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                          {staff.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-white font-semibold">{staff.name}</h3>
                        <p className="text-slate-400 text-sm">{staff.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{staff.skillLevel}%</div>
                      <div className="text-slate-400 text-sm">Skill Level</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-white font-semibold text-xl">{staff.coursesCompleted}</div>
                      <div className="text-slate-400 text-sm">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-white font-semibold text-xl">{staff.inProgress}</div>
                      <div className="text-slate-400 text-sm">In Progress</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                      <div className="text-white font-semibold text-xl">{staff.certifications}</div>
                      <div className="text-slate-400 text-sm">Certifications</div>
                    </div>
                    <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                      <Progress value={staff.skillLevel} className="h-2 mb-2" />
                      <div className="text-slate-400 text-sm">Overall Progress</div>
                    </div>
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