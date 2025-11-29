import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, FolderOpen, Settings, Star, BarChart3 } from 'lucide-react'
import { TeamDashboard } from '@/features/dashboard/components/TeamDashboard'

interface PageProps {
  params: Promise<{ teamId: string }>
}

export default async function TeamPage({ params }: PageProps) {
  const { teamId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 팀 정보 및 멤버십 확인
  const { data: teamData } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .is('deleted_at', null)
    .single()

  const team = teamData as { id: string; name: string } | null

  if (!team) {
    notFound()
  }

  // 팀 멤버인지 확인
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

  // 프로젝트 목록 가져오기
  const { data: projectsData } = await supabase
    .from('projects')
    .select(`
      *,
      project_favorites (id)
    `)
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  type ProjectRow = {
    id: string
    name: string
    description: string | null
    archived_at: string | null
    created_at: string
  }

  const projects = projectsData as ProjectRow[] | null

  // 즐겨찾기 여부 확인
  const { data: favoritesData } = await supabase
    .from('project_favorites')
    .select('project_id')
    .eq('user_id', user.id)

  const favorites = favoritesData as { project_id: string }[] | null
  const favoriteIds = new Set(favorites?.map(f => f.project_id) || [])

  // 정렬: 즐겨찾기 우선, 그 다음 생성일 역순
  const sortedProjects = [...(projects || [])].sort((a, b) => {
    const aFav = favoriteIds.has(a.id)
    const bFav = favoriteIds.has(b.id)
    if (aFav && !bFav) return -1
    if (!aFav && bFav) return 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">
            {membership.role === 'OWNER' && '소유자'}
            {membership.role === 'ADMIN' && '관리자'}
            {membership.role === 'MEMBER' && '멤버'}
          </p>
        </div>
        <div className="flex gap-2">
          {isOwnerOrAdmin && (
            <Link href={`/teams/${teamId}/settings`}>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                팀 설정
              </Button>
            </Link>
          )}
          <Link href={`/teams/${teamId}/projects/new`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              새 프로젝트
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList>
          <TabsTrigger value="projects">
            <FolderOpen className="mr-2 h-4 w-4" />
            프로젝트
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            통계
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
          {sortedProjects.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">아직 프로젝트가 없습니다</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  첫 번째 프로젝트를 만들어 이슈를 관리하세요
                </p>
                <Link href={`/teams/${teamId}/projects/new`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    첫 번째 프로젝트 만들기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedProjects.map((project) => (
                <Link key={project.id} href={`/teams/${teamId}/projects/${project.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                            {project.archived_at && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                아카이브됨
                              </span>
                            )}
                          </div>
                        </div>
                        {favoriteIds.has(project.id) && (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        )}
                      </div>
                      {project.description && (
                        <CardDescription className="line-clamp-2 mt-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <TeamDashboard teamId={teamId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
