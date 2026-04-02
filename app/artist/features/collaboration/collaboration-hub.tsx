"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { MessageSquare, Users, FileText, Calendar as CalendarIcon, Share2, Download } from "lucide-react"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface Project {
  id: string
  title: string
  description: string
  status: "planning" | "in-progress" | "completed"
  collaborators: Collaborator[]
  files: ProjectFile[]
  tasks: Task[]
  dueDate?: string
}

interface Collaborator {
  id: string
  name: string
  role: string
  avatar?: string
  email: string
}

interface ProjectFile {
  id: string
  name: string
  type: string
  size: number
  uploadedBy: string
  uploadedAt: string
  url: string
}

interface Task {
  id: string
  title: string
  description: string
  status: "todo" | "in-progress" | "completed"
  assignedTo: string
  dueDate?: string
}

export function CollaborationHub() {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState("projects")

  const createProject = (project: Omit<Project, "id">) => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      ...project
    }
    setProjects([...projects, newProject])
  }

  const addCollaborator = (projectId: string, collaborator: Omit<Collaborator, "id">) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        const newCollaborator: Collaborator = {
          id: Math.random().toString(36).substr(2, 9),
          ...collaborator
        }
        return {
          ...project,
          collaborators: [...project.collaborators, newCollaborator]
        }
      }
      return project
    }))
  }

  const addTask = (projectId: string, task: Omit<Task, "id">) => {
    setProjects(projects.map(project => {
      if (project.id === projectId) {
        const newTask: Task = {
          id: Math.random().toString(36).substr(2, 9),
          ...task
        }
        return {
          ...project,
          tasks: [...project.tasks, newTask]
        }
      }
      return project
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Collaboration Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 gap-4">
              <TabsTrigger value="projects">
                <FileText className="w-4 h-4 mr-2" />
                Projects
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="w-4 h-4 mr-2" />
                Team
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <CalendarIcon className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="files">
                <Share2 className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Active Projects</h3>
                <Button variant="outline" size="sm">
                  New Project
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(project => (
                  <Card key={project.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{project.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                          <div className="flex items-center mt-2 space-x-2">
                            <Badge variant={
                              project.status === "completed" ? "default" :
                              project.status === "in-progress" ? "secondary" : "outline"
                            }>
                              {project.status.toUpperCase()}
                            </Badge>
                            {project.dueDate && (
                              <span className="text-sm text-gray-500">
                                Due: {formatSafeDate(project.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {project.collaborators.slice(0, 3).map(collaborator => (
                            <Avatar key={collaborator.id} className="border-2 border-background">
                              <AvatarImage src={collaborator.avatar} />
                              <AvatarFallback>{collaborator.name[0]}</AvatarFallback>
                            </Avatar>
                          ))}
                          {project.collaborators.length > 3 && (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                              +{project.collaborators.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Tasks</h5>
                        <div className="space-y-2">
                          {project.tasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between">
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={task.status === "completed"}
                                  className="mr-2"
                                  onChange={() => {
                                    // TODO: Implement task status update
                                  }}
                                />
                                <span className={task.status === "completed" ? "line-through" : ""}>
                                  {task.title}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {task.assignedTo}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="team" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Team Members</h3>
                <Button variant="outline" size="sm">
                  Invite Member
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {projects.flatMap(project => project.collaborators).map(collaborator => (
                  <Card key={collaborator.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={collaborator.avatar} />
                          <AvatarFallback>{collaborator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{collaborator.name}</h4>
                          <p className="text-sm text-gray-500">{collaborator.role}</p>
                          <p className="text-sm text-gray-500">{collaborator.email}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Calendar
                      mode="single"
                      className="rounded-md border"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {projects
                        .filter(project => project.dueDate)
                        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                        .map(project => (
                          <div key={project.id} className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{project.title}</h4>
                              <p className="text-sm text-gray-500">
                                Due: {formatSafeDate(project.dueDate!)}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {project.status.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Shared Files</h3>
                <Button variant="outline" size="sm">
                  Upload File
                </Button>
              </div>
              <div className="space-y-4">
                {projects.flatMap(project => project.files).map(file => (
                  <Card key={file.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <FileText className="w-8 h-8 text-gray-400" />
                          <div>
                            <h4 className="font-medium">{file.name}</h4>
                            <p className="text-sm text-gray-500">
                              {formatSafeDate(file.uploadedAt)} • {file.size} bytes
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
} 