'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Users, 
  Music, 
  MessageCircle, 
  CheckSquare, 
  Activity,
  Upload,
  Plus,
  Calendar,
  Play,
  Pause,
  FileAudio,
  FileText,
  FileImage,
  MoreVertical,
  Edit,
  Download,
  Share
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  CollaborationProject, 
  ProjectFile, 
  ProjectTask, 
  ProjectActivity,
  ProjectWorkspaceService 
} from '@/lib/services/project-workspace.service'

interface ProjectWorkspaceDashboardProps {
  projectId: string
  userId: string
}

export default function ProjectWorkspaceDashboard({
  projectId,
  userId
}: ProjectWorkspaceDashboardProps) {
  const [project, setProject] = useState<CollaborationProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProject()
  }, [projectId])

  useEffect(() => {
    if (activeTab === 'files') {
      loadProjectFiles()
    }
  }, [activeTab, projectId, userId])

  const loadProject = async () => {
    setIsLoading(true)
    try {
      const data = await ProjectWorkspaceService.getProject(projectId, userId)
      setProject(data)
      setProjectFiles(data?.files || [])
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjectFiles = async () => {
    try {
      const files = await ProjectWorkspaceService.getProjectFiles(projectId, userId)
      setProjectFiles(files)
    } catch (error) {
      console.error('Error loading project files:', error)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await ProjectWorkspaceService.uploadProjectFile(
        projectId,
        file,
        { file_type: 'demo', folder: 'general' },
        userId
      )
      await loadProjectFiles()
      await loadProject()
    } catch (error) {
      console.error('Error uploading file:', error)
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const handleCreateTask = async () => {
    const title = window.prompt('Task title')
    if (!title?.trim()) return

    setIsCreatingTask(true)
    try {
      await ProjectWorkspaceService.createTask(
        projectId,
        { title: title.trim(), type: 'general', priority: 'medium' },
        userId
      )
      await loadProject()
    } catch (error) {
      console.error('Error creating task:', error)
    } finally {
      setIsCreatingTask(false)
    }
  }

  const handleTaskStatusToggle = async (task: ProjectTask) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed'
    try {
      await ProjectWorkspaceService.updateTaskStatus(task.id, nextStatus, userId)
      await loadProject()
    } catch (error) {
      console.error('Error updating task status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'recording': return 'bg-purple-500'
      case 'mixing': return 'bg-orange-500'
      case 'mastering': return 'bg-pink-500'
      case 'completed': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('audio/')) return FileAudio
    if (mimeType.startsWith('image/')) return FileImage
    return FileText
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  const handleFilePlay = (fileId: string) => {
    if (isPlaying === fileId) {
      setIsPlaying(null)
    } else {
      setIsPlaying(fileId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading project workspace...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-400">Project not found or access denied.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{project.name}</h1>
              <p className="text-slate-400 mb-4 max-w-2xl">{project.description}</p>
              
              <div className="flex items-center gap-4">
                <Badge className={cn("text-white", getStatusColor(project.status))}>
                  {project.status.replace('_', ' ')}
                </Badge>
                
                {project.genre && project.genre.length > 0 && (
                  <div className="flex gap-2">
                    {project.genre.slice(0, 3).map((genre) => (
                      <Badge key={genre} variant="outline">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center gap-1 text-slate-400 text-sm">
                  <Users className="h-4 w-4" />
                  <span>{project.collaborators?.length} collaborators</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline">
                <MessageCircle className="h-4 w-4 mr-2" />
                Open Chat
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Invite Collaborator
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/30 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Project Stats */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Files */}
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Music className="h-5 w-5" />
                      Recent Files
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.files?.slice(0, 5).map((file) => {
                        const IconComponent = getFileIcon(file.mime_type)
                        return (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-600/50 rounded">
                                <IconComponent className="h-4 w-4 text-slate-300" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{file.file_name}</p>
                                <p className="text-sm text-slate-400">
                                  {file.track_name && `${file.track_name} • `}
                                  {formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {file.mime_type.startsWith('audio/') && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleFilePlay(file.id)}
                                >
                                  {isPlaying === file.id ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                      
                      {(!project.files || project.files.length === 0) && (
                        <div className="text-center py-8">
                          <Music className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-400">No files uploaded yet</p>
                          <Button className="mt-4" variant="outline">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload First File
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Active Tasks */}
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <CheckSquare className="h-5 w-5" />
                      Active Tasks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.tasks?.slice(0, 5).map((task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'in_progress' ? 'bg-yellow-500' :
                              'bg-slate-400'
                            )} />
                            <div>
                              <p className="font-medium text-white">{task.title}</p>
                              <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className={getPriorityColor(task.priority)}>
                                  {task.priority}
                                </span>
                                {task.assigned_user_name && (
                                  <>
                                    <span>•</span>
                                    <span>Assigned to {task.assigned_user_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {task.due_date && (
                            <div className="text-sm text-slate-400">
                              <Calendar className="h-4 w-4 inline mr-1" />
                              {format(new Date(task.due_date), 'MMM d')}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      
                      {(!project.tasks || project.tasks.length === 0) && (
                        <div className="text-center py-8">
                          <CheckSquare className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-400">No active tasks</p>
                          <Button className="mt-4" variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Task
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Project Collaborators */}
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Users className="h-5 w-5" />
                      Collaborators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.collaborators?.map((collaborator) => (
                        <div key={collaborator.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={collaborator.user_avatar} />
                            <AvatarFallback>
                              {collaborator.user_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-white text-sm">
                              {collaborator.user_name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {collaborator.specific_role || collaborator.role}
                            </p>
                          </div>
                          {collaborator.role === 'owner' && (
                            <Badge variant="secondary" className="text-xs">
                              Owner
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Activity className="h-5 w-5" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {project.recent_activity?.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={activity.user_avatar} />
                            <AvatarFallback className="text-xs">
                              {activity.user_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm text-slate-300">
                              <span className="font-medium">{activity.user_name}</span>{' '}
                              {activity.description}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))}
                      
                      {(!project.recent_activity || project.recent_activity.length === 0) && (
                        <p className="text-sm text-slate-400 text-center py-4">
                          No recent activity
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="files">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Project Files</CardTitle>
                  <Button onClick={handleUploadClick} disabled={isUploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : 'Upload Files'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelected}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {projectFiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projectFiles.map(file => {
                      const FileIcon = getFileIcon(file.mime_type)
                      return (
                        <div key={file.id} className="flex items-center gap-3 rounded-xl border border-slate-700/50 p-4">
                          <FileIcon className="h-5 w-5 text-purple-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{file.file_name}</p>
                            <p className="text-xs text-slate-400">{file.file_type} · v{file.version_number}</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedFile(file)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No files uploaded yet.</p>
                    <Button className="mt-4" variant="outline" onClick={handleUploadClick}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload First File
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Project Tasks</CardTitle>
                  <Button onClick={handleCreateTask} disabled={isCreatingTask}>
                    <Plus className="h-4 w-4 mr-2" />
                    {isCreatingTask ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.tasks && project.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {project.tasks.map(task => (
                      <div key={task.id} className="flex items-start justify-between rounded-xl border border-slate-700/50 p-4">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => handleTaskStatusToggle(task)}
                            className={cn(
                              "mt-1 h-3 w-3 rounded-full shrink-0",
                              task.status === 'completed' ? 'bg-green-500' :
                              task.status === 'in_progress' ? 'bg-yellow-500' :
                              'bg-slate-400'
                            )}
                            aria-label={`Mark ${task.title} as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
                          />
                          <div>
                            <p className="font-medium text-white">{task.title}</p>
                            {task.description && (
                              <p className="mt-1 text-sm text-slate-400">{task.description}</p>
                            )}
                            <p className={`mt-2 text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority} · {task.status}
                            </p>
                          </div>
                        </div>
                        {task.due_date && (
                          <span className="text-xs text-slate-500">
                            Due {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No active tasks yet.</p>
                    <Button className="mt-4" variant="outline" onClick={handleCreateTask}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Task
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborators">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">Project Collaborators</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Invite Collaborator
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {project.collaborators && project.collaborators.length > 0 ? (
                  <div className="space-y-3">
                    {project.collaborators.map(collaborator => (
                      <div key={collaborator.id} className="flex items-center justify-between rounded-xl border border-slate-700/50 p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={collaborator.user_avatar} />
                            <AvatarFallback>{collaborator.user_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-white">{collaborator.user_name}</p>
                            <p className="text-xs text-slate-400 capitalize">{collaborator.role}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{collaborator.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No collaborators yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="bg-slate-800/50 backdrop-blur-xl border-slate-700/30">
              <CardHeader>
                <CardTitle className="text-white">Project Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {project.recent_activity && project.recent_activity.length > 0 ? (
                  <div className="space-y-4">
                    {project.recent_activity.map(activity => (
                      <div key={activity.id} className="flex items-start gap-3 border-b border-slate-700/30 pb-4 last:border-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={activity.user_avatar} />
                          <AvatarFallback>{activity.user_name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm text-slate-300">
                            <span className="font-medium">{activity.user_name}</span> {activity.description}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-400">No activity recorded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}