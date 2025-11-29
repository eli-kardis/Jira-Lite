import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Settings, Tag, ListChecks, Archive, Trash2 } from 'lucide-react'
import { ProjectSettingsForm } from '@/features/workspace/components/ProjectSettingsForm'
import { StatusManager } from '@/features/workspace/components/StatusManager'
import { LabelManager } from '@/features/workspace/components/LabelManager'
import { ProjectDangerZone } from '@/features/workspace/components/ProjectDangerZone'
import { checkProjectAccess } from '@/lib/auth-check'

interface PageProps {
  params: Promise<{ teamId: string; projectId: string }>
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { teamId, projectId } = await params

  // 🛑 권한 검문 (통과 못하면 404)
  await checkProjectAccess(projectId)

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

  const project = projectData as {
    id: string
    name: string
    description: string | null
    owner_id: string
    archived_at: string | null
  } | null

  if (!project) {
    notFound()
  }

  // 팀 멤버십 확인 (role 정보 필요)
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

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)
  const isProjectOwner = project.owner_id === user.id
  const canManage = isOwnerOrAdmin || isProjectOwner

  if (!canManage) {
    redirect(`/teams/${teamId}/projects/${projectId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/teams/${teamId}/projects/${projectId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">프로젝트 설정</h1>
          <p className="text-sm text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">
            <Settings className="mr-2 h-4 w-4" />
            일반
          </TabsTrigger>
          <TabsTrigger value="statuses">
            <ListChecks className="mr-2 h-4 w-4" />
            상태
          </TabsTrigger>
          <TabsTrigger value="labels">
            <Tag className="mr-2 h-4 w-4" />
            라벨
          </TabsTrigger>
          <TabsTrigger value="danger">
            <Trash2 className="mr-2 h-4 w-4" />
            위험 구역
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>프로젝트 정보</CardTitle>
              <CardDescription>
                프로젝트의 기본 정보를 수정합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectSettingsForm
                projectId={projectId}
                teamId={teamId}
                initialData={{
                  name: project.name,
                  description: project.description || '',
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statuses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>이슈 상태 관리</CardTitle>
              <CardDescription>
                프로젝트에서 사용할 이슈 상태를 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusManager projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labels" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>라벨 관리</CardTitle>
              <CardDescription>
                이슈에 사용할 라벨을 관리합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabelManager projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-6">
          <ProjectDangerZone
            projectId={projectId}
            teamId={teamId}
            isArchived={!!project.archived_at}
            isOwner={isProjectOwner || membership.role === 'OWNER'}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
