import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getTeamMembers, getTeamActivityLogs } from '@/features/workspace/actions/team-actions'
import { TeamSettingsForm } from '@/features/workspace/components/TeamSettingsForm'
import { MemberList } from '@/features/workspace/components/MemberList'
import { InviteMemberForm } from '@/features/workspace/components/InviteMemberForm'
import { ActivityLogList } from '@/features/workspace/components/ActivityLogList'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface PageProps {
  params: Promise<{ teamId: string }>
}

export default async function TeamSettingsPage({ params }: PageProps) {
  const { teamId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 팀 정보 가져오기
  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .is('deleted_at', null)
    .single()

  if (!team) {
    notFound()
  }

  // 멤버십 및 권한 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
    redirect(`/teams/${teamId}`)
  }

  // 멤버 목록 가져오기
  const members = await getTeamMembers(teamId)

  // 활동 로그 가져오기
  const activityLogs = await getTeamActivityLogs(teamId)

  // 대기 중인 초대 가져오기
  const { data: pendingInvitations } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('team_id', teamId)
    .eq('status', 'PENDING')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const isOwner = membership.role === 'OWNER'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/teams/${teamId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">팀 설정</h1>
          <p className="text-muted-foreground">{team.name}</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">일반</TabsTrigger>
          <TabsTrigger value="members">멤버</TabsTrigger>
          <TabsTrigger value="activity">활동 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <TeamSettingsForm
            teamId={teamId}
            teamName={team.name}
            isOwner={isOwner}
          />
        </TabsContent>

        <TabsContent value="members" className="mt-6 space-y-6">
          <InviteMemberForm teamId={teamId} />

          {pendingInvitations && pendingInvitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">대기 중인 초대</h3>
              <div className="space-y-2">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                  >
                    <span className="text-sm">{invitation.email}</span>
                    <span className="text-xs text-muted-foreground">대기 중</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <MemberList
            teamId={teamId}
            members={members}
            currentUserRole={membership.role}
            currentUserId={user.id}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLogList teamId={teamId} initialLogs={activityLogs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
