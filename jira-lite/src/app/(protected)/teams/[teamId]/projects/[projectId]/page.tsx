import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Star, ArrowLeft, Archive, Plus, BarChart3 } from 'lucide-react'
import { getProjectStatuses, getProjectLabels } from '@/features/workspace/actions/project-actions'
import { KanbanBoard } from '@/features/board/components/KanbanBoard'
import { IssueList } from '@/features/board/components/IssueList'
import { FavoriteButton } from '@/features/workspace/components/FavoriteButton'
import { ProjectDashboard } from '@/features/dashboard/components/ProjectDashboard'

interface PageProps {
  params: Promise<{ teamId: string; projectId: string }>
}

export default async function ProjectPage({ params }: PageProps) {
  const { teamId, projectId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 프로젝트 정보 가져오기
  const { data: projectData } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .single()

  const project = projectData as { id: string; name: string; description: string | null; owner_id: string; archived_at: string | null } | null

  if (!project) {
    notFound()
  }

  // 팀 멤버십 확인
  const { data: membershipData } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  const membership = membershipData as { role: string } | null

  if (!membership) {
    notFound()
  }

  // 상태 및 이슈 가져오기
  const statuses = await getProjectStatuses(projectId)
  const labels = await getProjectLabels(projectId)

  // 이슈 가져오기
  const { data: issues } = await supabase
    .from('issues')
    .select(`
      *,
      assignee:profiles!issues_assignee_id_fkey (
        id,
        name,
        profile_image
      ),
      issue_labels (
        label_id,
        labels (
          id,
          name,
          color
        )
      ),
      subtasks (
        id,
        is_completed
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position', { ascending: true })

  // 팀 멤버 목록 (담당자 지정용)
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

  // 즐겨찾기 여부 확인
  const { data: favorite } = await supabase
    .from('project_favorites')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)
  const isProjectOwner = project.owner_id === user.id
  const canManage = isOwnerOrAdmin || isProjectOwner
  const isArchived = !!project.archived_at

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/teams/${teamId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <FavoriteButton projectId={projectId} isFavorite={!!favorite} />
              {isArchived && (
                <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                  <Archive className="inline h-3 w-3 mr-1" />
                  아카이브됨
                </span>
              )}
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link href={`/teams/${teamId}/projects/${projectId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                설정
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="kanban" className="w-full">
        <TabsList>
          <TabsTrigger value="kanban">칸반 보드</TabsTrigger>
          <TabsTrigger value="list">이슈 목록</TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="mr-1 h-4 w-4" />
            통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="mt-4">
          <KanbanBoard
            projectId={projectId}
            teamId={teamId}
            statuses={statuses}
            issues={issues || []}
            labels={labels}
            teamMembers={teamMembers || []}
            isArchived={isArchived}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <IssueList
            projectId={projectId}
            teamId={teamId}
            statuses={statuses}
            issues={issues || []}
            labels={labels}
            teamMembers={teamMembers || []}
            isArchived={isArchived}
          />
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <ProjectDashboard projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
