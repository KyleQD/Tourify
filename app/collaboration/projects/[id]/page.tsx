import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ProjectWorkspaceDashboard from '@/components/collaboration/project-workspace-dashboard'

export default async function ProjectWorkspacePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  // Get current user
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    notFound()
  }

  // Verify user has access to this project
  const { data: project, error: projectError } = await supabase
    .from('collaboration_projects')
    .select('id, name')
    .eq('id', id)
    .single()

  if (projectError || !project) {
    notFound()
  }

  // Check if user is a collaborator
  const { data: collaborator, error: collabError } = await supabase
    .from('project_collaborators')
    .select('role')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single()

  if (collabError || !collaborator) {
    notFound()
  }

  return (
    <ProjectWorkspaceDashboard 
      projectId={id}
      userId={user.id}
    />
  )
}