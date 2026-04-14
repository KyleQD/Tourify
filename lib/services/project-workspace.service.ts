import { supabase } from '@/lib/supabase'

// =============================================================================
// PROJECT WORKSPACE SERVICE
// =============================================================================

export interface CollaborationProject {
  id: string
  name: string
  description: string
  type: 'album' | 'single' | 'ep' | 'collaboration' | 'live_show' | 'tour'
  genre: string[]
  
  // Ownership
  owner_id: string
  
  // Status & Timeline
  status: 'planning' | 'in_progress' | 'recording' | 'mixing' | 'mastering' | 'completed'
  start_date?: string
  target_completion?: string
  
  // Settings
  privacy: 'private' | 'collaborators_only' | 'public'
  
  // Integration
  communication_channel_id?: string
  
  // Metadata
  created_at: string
  updated_at: string
  
  // Computed fields
  collaborators?: ProjectCollaborator[]
  files?: ProjectFile[]
  tasks?: ProjectTask[]
  recent_activity?: ProjectActivity[]
}

export interface ProjectCollaborator {
  id: string
  project_id: string
  user_id: string
  
  // Role & Permissions
  role: 'owner' | 'admin' | 'collaborator' | 'viewer'
  specific_role?: string // 'songwriter', 'producer', 'vocalist', etc.
  permissions: {
    can_edit: boolean
    can_invite: boolean
    can_manage_files: boolean
    can_post_in_channel: boolean
  }
  
  // Status
  status: 'invited' | 'active' | 'inactive'
  
  // Timestamps
  joined_at: string
  invited_by?: string
  
  // User info (populated from existing profiles)
  user_name?: string
  user_avatar?: string
  user_skills?: string[]
}

export interface ProjectFile {
  id: string
  project_id: string
  
  // File Info
  file_name: string
  file_path: string
  file_type: 'demo' | 'stem' | 'master' | 'reference' | 'document'
  mime_type: string
  file_size: number
  
  // Project Context
  track_name?: string
  version_number: number
  description?: string
  
  // Organization
  folder: string
  tags: string[]
  
  // Attribution
  uploaded_by: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // File metadata
  duration_seconds?: number
  waveform_data?: any
  
  // Uploader info
  uploader_name?: string
  uploader_avatar?: string
}

export interface ProjectTask {
  id: string
  project_id: string
  
  // Task Details
  title: string
  description?: string
  type: 'songwriting' | 'recording' | 'mixing' | 'feedback' | 'general'
  
  // Assignment
  assigned_to?: string
  assigned_by: string
  
  // Status & Priority
  status: 'todo' | 'in_progress' | 'review' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  
  // Timeline
  due_date?: string
  completed_at?: string
  
  // Integration
  related_file_id?: string
  discussion_message_id?: string
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // User info
  assigned_user_name?: string
  assigned_user_avatar?: string
  creator_name?: string
}

export interface ProjectActivity {
  id: string
  project_id: string
  user_id: string
  activity_type: 'file_upload' | 'task_created' | 'task_completed' | 'collaborator_added' | 'comment_added'
  description: string
  metadata: Record<string, any>
  created_at: string
  
  // User info
  user_name?: string
  user_avatar?: string
}

export interface CreateProjectData {
  name: string
  description?: string
  type: CollaborationProject['type']
  genre?: string[]
  privacy?: CollaborationProject['privacy']
  start_date?: string
  target_completion?: string
}

export interface CreateTaskData {
  title: string
  description?: string
  type?: ProjectTask['type']
  assigned_to?: string
  priority?: ProjectTask['priority']
  due_date?: string
  related_file_id?: string
}

export interface InviteCollaboratorData {
  user_id: string
  role: ProjectCollaborator['role']
  specific_role?: string
  permissions?: Partial<ProjectCollaborator['permissions']>
  invitation_message?: string
}

export class ProjectWorkspaceService {
  // =============================================================================
  // PROJECT MANAGEMENT
  // =============================================================================

  static async createProject(data: CreateProjectData, userId: string): Promise<CollaborationProject> {
    try {
      // 1. Create the project
      const { data: project, error: projectError } = await supabase
        .from('collaboration_projects')
        .insert({
          ...data,
          owner_id: userId,
          status: 'planning'
        })
        .select('*')
        .single()

      if (projectError) throw projectError

      // 2. Add owner as collaborator
      const { error: collaboratorError } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: project.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
          permissions: {
            can_edit: true,
            can_invite: true,
            can_manage_files: true,
            can_post_in_channel: true
          }
        })

      if (collaboratorError) throw collaboratorError

      // 3. Create communication channel (disabled for now - communication system not available)
      // const { data: channel, error: channelError } = await supabase
      //   .from('communication_channels')
      //   .insert({
      //     name: `${project.name} - Project Chat`,
      //     description: `Main communication channel for ${project.name}`,
      //     type: 'project',
      //     project_id: project.id,
      //     created_by: userId,
      //     settings: {
      //       allow_file_sharing: true,
      //       allow_voice_messages: true,
      //       auto_archive: false
      //     }
      //   })
      //   .select('id')
      //   .single()

      // if (channelError) throw channelError

      // 4. Link channel to project (disabled for now - communication system not available)
      // await supabase
      //   .from('collaboration_projects')
      //   .update({ communication_channel_id: channel.id })
      //   .eq('id', project.id)

      // 5. Log activity
      await this.logActivity({
        project_id: project.id,
        user_id: userId,
        activity_type: 'task_created',
        description: `Created project "${project.name}"`,
        metadata: { project_type: project.type }
      })

      return project as CollaborationProject
    } catch (error) {
      console.error('Error creating project:', error)
      throw new Error('Failed to create project')
    }
  }

  static async getProject(projectId: string, userId: string): Promise<CollaborationProject | null> {
    try {
      // Check if user has access to this project
      const { data: access } = await supabase
        .from('project_collaborators')
        .select('role, status')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .single()

      if (!access || access.status !== 'active') {
        throw new Error('Access denied to this project')
      }

      // Get project details
      const { data: project, error } = await supabase
        .from('collaboration_projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) throw error

      // Get collaborators with user info
      const { data: collaborators } = await supabase
        .from('project_collaborators')
        .select(`
          *,
          profiles!inner(full_name, avatar_url),
          artist_profiles(genres, primary_skills)
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')

      // Get recent files
      const { data: files } = await supabase
        .from('project_files')
        .select(`
          *,
          profiles!inner(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)

      // Get active tasks
      const { data: tasks } = await supabase
        .from('project_tasks')
        .select(`
          *,
          assigned_user:profiles!project_tasks_assigned_to_fkey(full_name, avatar_url),
          creator:profiles!project_tasks_assigned_by_fkey(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })

      // Get recent activity
      const { data: activity } = await supabase
        .from('project_activity')
        .select(`
          *,
          profiles!inner(full_name, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(10)

      return {
        ...project,
        collaborators: collaborators?.map(this.formatCollaborator) || [],
        files: files?.map(this.formatProjectFile) || [],
        tasks: tasks?.map(this.formatProjectTask) || [],
        recent_activity: activity?.map(this.formatActivity) || []
      } as CollaborationProject
    } catch (error) {
      console.error('Error fetching project:', error)
      return null
    }
  }

  static async updateProject(
    projectId: string, 
    updates: Partial<CreateProjectData>, 
    userId: string
  ): Promise<CollaborationProject> {
    try {
      // Verify permissions
      await this.verifyProjectPermission(projectId, userId, 'can_edit')

      const { data, error } = await supabase
        .from('collaboration_projects')
        .update(updates)
        .eq('id', projectId)
        .select('*')
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity({
        project_id: projectId,
        user_id: userId,
        activity_type: 'task_created',
        description: 'Updated project details',
        metadata: updates
      })

      return data as CollaborationProject
    } catch (error) {
      console.error('Error updating project:', error)
      throw new Error('Failed to update project')
    }
  }

  static async getUserProjects(userId: string): Promise<CollaborationProject[]> {
    try {
      const { data, error } = await supabase
        .from('project_collaborators')
        .select(`
          collaboration_projects(
            *,
            collaborator_count:project_collaborators(count),
            file_count:project_files(count)
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })

      if (error) throw error

      return (data?.map(item => item.collaboration_projects).filter(Boolean).flat() as CollaborationProject[]) || []
    } catch (error) {
      console.error('Error fetching user projects:', error)
      return []
    }
  }

  // =============================================================================
  // COLLABORATOR MANAGEMENT
  // =============================================================================

  static async inviteCollaborator(
    projectId: string, 
    inviteData: InviteCollaboratorData, 
    inviterId: string
  ): Promise<void> {
    try {
      // Verify inviter permissions
      await this.verifyProjectPermission(projectId, inviterId, 'can_invite')

      // Create invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('collaboration_invitations')
        .insert({
          from_user_id: inviterId,
          to_user_id: inviteData.user_id,
          project_id: projectId,
          invitation_message: inviteData.invitation_message || '',
          proposed_role: inviteData.specific_role || inviteData.role,
          status: 'pending'
        })
        .select('*')
        .single()

      if (invitationError) throw invitationError

      // Send notification (integrate with existing notification system)
      await this.sendCollaborationInvitation(invitation.id)

      // Log activity
      await this.logActivity({
        project_id: projectId,
        user_id: inviterId,
        activity_type: 'collaborator_added',
        description: `Invited a new collaborator`,
        metadata: { invited_user_id: inviteData.user_id, role: inviteData.role }
      })
    } catch (error) {
      console.error('Error inviting collaborator:', error)
      throw new Error('Failed to invite collaborator')
    }
  }

  static async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      // Get invitation details
      const { data: invitation, error: invitationError } = await supabase
        .from('collaboration_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .single()

      if (invitationError || !invitation) {
        throw new Error('Invalid or expired invitation')
      }

      // Add as collaborator
      const { error: collaboratorError } = await supabase
        .from('project_collaborators')
        .insert({
          project_id: invitation.project_id,
          user_id: userId,
          role: 'collaborator',
          specific_role: invitation.proposed_role,
          status: 'active',
          invited_by: invitation.from_user_id,
          permissions: {
            can_edit: true,
            can_invite: false,
            can_manage_files: true,
            can_post_in_channel: true
          }
        })

      if (collaboratorError) throw collaboratorError

      // Update invitation status
      await supabase
        .from('collaboration_invitations')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', invitationId)

      // Add to communication channel
      await supabase
        .from('channel_participants')
        .insert({
          channel_id: (await this.getProjectChannelId(invitation.project_id)),
          user_id: userId,
          role: 'member',
          status: 'active'
        })

      // Log activity
      await this.logActivity({
        project_id: invitation.project_id,
        user_id: userId,
        activity_type: 'collaborator_added',
        description: 'Joined the project',
        metadata: { invitation_id: invitationId }
      })
    } catch (error) {
      console.error('Error accepting invitation:', error)
      throw new Error('Failed to accept invitation')
    }
  }

  // =============================================================================
  // FILE MANAGEMENT
  // =============================================================================

  static async uploadProjectFile(
    projectId: string,
    file: File,
    metadata: {
      file_type: ProjectFile['file_type']
      track_name?: string
      description?: string
      folder?: string
      tags?: string[]
    },
    userId: string
  ): Promise<ProjectFile> {
    try {
      // Verify permissions
      await this.verifyProjectPermission(projectId, userId, 'can_manage_files')

      // Upload file using existing upload service
      const fileExtension = file.name.split('.').pop()
      const fileName = `${Date.now()}-${file.name}`
      const filePath = `projects/${projectId}/${metadata.folder || 'general'}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath)

      // Create database record
      const { data: projectFile, error: dbError } = await supabase
        .from('project_files')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_path: filePath,
          file_type: metadata.file_type,
          mime_type: file.type,
          file_size: file.size,
          track_name: metadata.track_name,
          description: metadata.description,
          folder: metadata.folder || 'general',
          tags: metadata.tags || [],
          uploaded_by: userId,
          version_number: 1
        })
        .select('*')
        .single()

      if (dbError) throw dbError

      // Process audio files for waveform generation (async)
      if (file.type.startsWith('audio/')) {
        this.processAudioFileAsync(projectFile.id, urlData.publicUrl)
      }

      // Log activity
      await this.logActivity({
        project_id: projectId,
        user_id: userId,
        activity_type: 'file_upload',
        description: `Uploaded ${file.name}`,
        metadata: { file_type: metadata.file_type, file_size: file.size }
      })

      return projectFile as ProjectFile
    } catch (error) {
      console.error('Error uploading project file:', error)
      throw new Error('Failed to upload file')
    }
  }

  static async getProjectFiles(
    projectId: string, 
    userId: string,
    filters?: {
      file_type?: ProjectFile['file_type']
      folder?: string
      track_name?: string
    }
  ): Promise<ProjectFile[]> {
    try {
      // Verify access
      await this.verifyProjectAccess(projectId, userId)

      let query = supabase
        .from('project_files')
        .select(`
          *,
          profiles!inner(full_name, avatar_url)
        `)
        .eq('project_id', projectId)

      if (filters?.file_type) {
        query = query.eq('file_type', filters.file_type)
      }
      if (filters?.folder) {
        query = query.eq('folder', filters.folder)
      }
      if (filters?.track_name) {
        query = query.eq('track_name', filters.track_name)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      return data?.map(this.formatProjectFile) || []
    } catch (error) {
      console.error('Error fetching project files:', error)
      return []
    }
  }

  // =============================================================================
  // TASK MANAGEMENT
  // =============================================================================

  static async createTask(
    projectId: string,
    taskData: CreateTaskData,
    userId: string
  ): Promise<ProjectTask> {
    try {
      // Verify permissions
      await this.verifyProjectPermission(projectId, userId, 'can_edit')

      const { data, error } = await supabase
        .from('project_tasks')
        .insert({
          project_id: projectId,
          title: taskData.title,
          description: taskData.description,
          type: taskData.type || 'general',
          assigned_to: taskData.assigned_to,
          assigned_by: userId,
          priority: taskData.priority || 'medium',
          due_date: taskData.due_date,
          related_file_id: taskData.related_file_id,
          status: 'todo'
        })
        .select(`
          *,
          assigned_user:profiles!project_tasks_assigned_to_fkey(full_name, avatar_url),
          creator:profiles!project_tasks_assigned_by_fkey(full_name, avatar_url)
        `)
        .single()

      if (error) throw error

      // Send notification to assigned user
      if (taskData.assigned_to && taskData.assigned_to !== userId) {
        await this.sendTaskAssignmentNotification(data.id)
      }

      // Log activity
      await this.logActivity({
        project_id: projectId,
        user_id: userId,
        activity_type: 'task_created',
        description: `Created task: ${taskData.title}`,
        metadata: { task_id: data.id, assigned_to: taskData.assigned_to }
      })

      return this.formatProjectTask(data) as ProjectTask
    } catch (error) {
      console.error('Error creating task:', error)
      throw new Error('Failed to create task')
    }
  }

  static async updateTaskStatus(
    taskId: string,
    status: ProjectTask['status'],
    userId: string
  ): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('project_tasks')
        .update({
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId)
        .select('project_id, title')
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity({
        project_id: data.project_id,
        user_id: userId,
        activity_type: status === 'completed' ? 'task_completed' : 'task_created',
        description: `${status === 'completed' ? 'Completed' : 'Updated'} task: ${data.title}`,
        metadata: { task_id: taskId, new_status: status }
      })
    } catch (error) {
      console.error('Error updating task status:', error)
      throw new Error('Failed to update task')
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private static async verifyProjectAccess(projectId: string, userId: string): Promise<void> {
    const { data, error } = await supabase
      .from('project_collaborators')
      .select('status')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (error || !data || data.status !== 'active') {
      throw new Error('Access denied to this project')
    }
  }

  private static async verifyProjectPermission(
    projectId: string, 
    userId: string, 
    permission: keyof ProjectCollaborator['permissions']
  ): Promise<void> {
    const { data, error } = await supabase
      .from('project_collaborators')
      .select('permissions, role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      throw new Error('Access denied to this project')
    }

    if (data.role === 'owner' || data.permissions[permission]) {
      return // Permission granted
    }

    throw new Error(`Permission denied: ${permission}`)
  }

  private static async getProjectChannelId(projectId: string): Promise<string> {
    const { data, error } = await supabase
      .from('collaboration_projects')
      .select('communication_channel_id')
      .eq('id', projectId)
      .single()

    if (error || !data?.communication_channel_id) {
      throw new Error('Project communication channel not found')
    }

    return data.communication_channel_id
  }

  private static async logActivity(activity: {
    project_id: string
    user_id: string
    activity_type: ProjectActivity['activity_type']
    description: string
    metadata: Record<string, any>
  }): Promise<void> {
    await supabase
      .from('project_activity')
      .insert(activity)
  }

  private static async processAudioFileAsync(fileId: string, audioUrl: string): Promise<void> {
    // Implement async audio processing for waveform generation
    // This would integrate with existing audio processing utilities
    console.log('Processing audio file:', fileId, audioUrl)
  }

  private static async sendCollaborationInvitation(invitationId: string): Promise<void> {
    // Integrate with existing notification system
    console.log('Sending collaboration invitation:', invitationId)
  }

  private static async sendTaskAssignmentNotification(taskId: string): Promise<void> {
    // Integrate with existing notification system
    console.log('Sending task assignment notification:', taskId)
  }

  private static formatCollaborator(data: any): ProjectCollaborator {
    return {
      ...data,
      user_name: data.profiles?.full_name,
      user_avatar: data.profiles?.avatar_url,
      user_skills: data.artist_profiles?.primary_skills || []
    }
  }

  private static formatProjectFile(data: any): ProjectFile {
    return {
      ...data,
      uploader_name: data.profiles?.full_name,
      uploader_avatar: data.profiles?.avatar_url
    }
  }

  private static formatProjectTask(data: any): ProjectTask {
    return {
      ...data,
      assigned_user_name: data.assigned_user?.full_name,
      assigned_user_avatar: data.assigned_user?.avatar_url,
      creator_name: data.creator?.full_name
    }
  }

  private static formatActivity(data: any): ProjectActivity {
    return {
      ...data,
      user_name: data.profiles?.full_name,
      user_avatar: data.profiles?.avatar_url
    }
  }
}