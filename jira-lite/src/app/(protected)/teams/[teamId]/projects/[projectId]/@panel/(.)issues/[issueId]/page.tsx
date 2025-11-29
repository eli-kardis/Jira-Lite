import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getProjectStatuses, getProjectLabels } from '@/features/workspace/actions/project-actions'
import { IssueDetailPanel } from '@/features/board/components/IssueDetailPanel'
import { checkProjectAccess } from '@/lib/auth-check'

interface PageProps {
  params: Promise<{ teamId: string; projectId: string; issueId: string }>
}

export default async function InterceptedIssuePage({ params }: PageProps) {
  const { teamId, projectId, issueId } = await params

  // 🛑 권한 검문 (통과 못하면 404)
  await checkProjectAccess(projectId)

  const supabase = await createClient()

  // 프로젝트 확인
  const { data: projectData } = await supabase
    .from('projects')
    .select('id, archived_at')
    .eq('id', projectId)
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .single()

  const project = projectData as { id: string; archived_at: string | null } | null

  if (!project) {
    notFound()
  }

  // 이슈 존재 여부 확인
  const { data: issue } = await supabase
    .from('issues')
    .select('id')
    .eq('id', issueId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .single()

  if (!issue) {
    notFound()
  }

  // 데이터 로드
  const statuses = await getProjectStatuses(projectId)
  const labels = await getProjectLabels(projectId)

  // 팀 멤버 목록
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select(`
      user_id,
      profiles (
        id,
        name,
        profile_image
      )
    `)
    .eq('team_id', teamId)

  const isArchived = !!project.archived_at

  return (
    <IssueDetailPanel
      issueId={issueId}
      projectId={projectId}
      teamId={teamId}
      labels={labels}
      teamMembers={teamMembers || []}
      statuses={statuses}
      isArchived={isArchived}
    />
  )
}
