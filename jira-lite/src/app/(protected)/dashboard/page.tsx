import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Users, LayoutDashboard } from 'lucide-react'
import { PersonalDashboard } from '@/features/dashboard/components/PersonalDashboard'
import { TeamStatisticsChart } from '@/features/dashboard/components/TeamStatisticsChart'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 사용자 프로필
  const { data: profileData } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const profile = profileData as { name: string } | null

  // 사용자가 속한 팀 목록 가져오기
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select(`
      team_id,
      role,
      teams (
        id,
        name,
        created_at
      )
    `)
    .eq('user_id', user.id)

  type TeamMembershipRow = {
    team_id: string
    role: string
    teams: { id: string; name: string; created_at: string } | null
  }

  const teams = ((teamMemberships as TeamMembershipRow[] | null) || []).map(tm => {
    const teamData = tm.teams
    if (!teamData) return null
    return {
      id: teamData.id,
      name: teamData.name,
      created_at: teamData.created_at,
      role: tm.role
    }
  }).filter((t): t is NonNullable<typeof t> => t !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">대시보드</h1>
          <p className="text-muted-foreground">
            안녕하세요, {profile?.name || '사용자'}님!
          </p>
        </div>
        <Link href="/teams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            새 팀 만들기
          </Button>
        </Link>
      </div>

      {/* 팀 전체 통계 차트 */}
      {teams.length > 0 && (
        <TeamStatisticsChart
          teamId={teams[0].id}
          teamName={teams[0].name}
        />
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            내 활동
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Users className="mr-2 h-4 w-4" />
            팀 ({teams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <PersonalDashboard />
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          {teams.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">아직 참여한 팀이 없습니다</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  팀을 만들어 프로젝트를 시작하세요
                </p>
                <Link href="/teams/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    첫 번째 팀 만들기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Link key={team.id} href={`/teams/${team.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <CardDescription>
                            {team.role === 'OWNER' && '소유자'}
                            {team.role === 'ADMIN' && '관리자'}
                            {team.role === 'MEMBER' && '멤버'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
