'use server'

import { createClient } from '@/lib/supabase/server'
import { createTeamSchema, updateTeamSchema, inviteMemberSchema, changeRoleSchema } from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { TeamRole } from '@/lib/supabase/types'
import { softDelete, checkTeamMember, requireTeamAdmin, requireTeamOwner } from '@/services/common-service'

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// FR-010: 팀 생성
export async function createTeam(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const rawData = {
    name: formData.get('name') as string,
  }

  const result = createTeamSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { name } = result.data

  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      name,
      owner_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create team error:', error)
    return { success: false, error: '팀 생성에 실패했습니다' }
  }

  redirect(`/teams/${team.id}`)
}

// FR-011: 팀 정보 수정
export async function updateTeam(teamId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 권한 확인 (OWNER, ADMIN) via common service
  try {
    await requireTeamAdmin(teamId, user.id)
  } catch {
    return { success: false, error: '팀 정보를 수정할 권한이 없습니다' }
  }

  const rawData = {
    name: formData.get('name') as string,
  }

  const result = updateTeamSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('teams')
    .update({ name: result.data.name })
    .eq('id', teamId)
    .is('deleted_at', null)

  if (error) {
    return { success: false, error: '팀 정보 수정에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: teamId,
    p_activity_type: 'TEAM_UPDATED',
    p_metadata: { name: result.data.name },
  })

  revalidatePath(`/teams/${teamId}`)
  return { success: true }
}

// FR-012: 팀 삭제
export async function deleteTeam(teamId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 권한 확인 (OWNER만) via common service
  try {
    await requireTeamOwner(teamId, user.id)
  } catch {
    return { success: false, error: '팀을 삭제할 권한이 없습니다' }
  }

  // Soft Delete via common service
  try {
    await softDelete('teams', teamId)
  } catch {
    return { success: false, error: '팀 삭제에 실패했습니다' }
  }

  redirect('/dashboard')
}

// FR-013: 팀 멤버 초대
export async function inviteMember(teamId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 권한 확인 (OWNER, ADMIN) via common service
  try {
    await requireTeamAdmin(teamId, user.id)
  } catch {
    return { success: false, error: '멤버를 초대할 권한이 없습니다' }
  }

  const rawData = {
    email: formData.get('email') as string,
  }

  const result = inviteMemberSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { email } = result.data

  // Step 1: 이메일로 사용자 찾기
  const { data: targetUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  // 가입되지 않은 사용자 -> 초대 메일 발송 로직으로 진행
  if (!targetUser) {
    // 기존 PENDING 초대가 있는지 확인
    const { data: existingInvitation } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', email)
      .eq('status', 'PENDING')
      .maybeSingle()

    if (existingInvitation) {
      // 기존 초대 만료일 갱신
      await supabase
        .from('team_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingInvitation.id)
    } else {
      // 새 초대 생성
      const { error } = await supabase
        .from('team_invitations')
        .insert({
          team_id: teamId,
          email,
          invited_by: user.id,
        })

      if (error) {
        return { success: false, error: '초대 발송에 실패했습니다' }
      }
    }

    revalidatePath(`/teams/${teamId}/settings`)
    return { success: true }
  }

  // Step 2: 이미 가입된 사용자 -> 멤버십 확인 (user_id + team_id 둘 다 조건)
  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id, deleted_at')
    .eq('team_id', teamId)
    .eq('user_id', targetUser.id)
    .maybeSingle()

  // Step 3: 결과 처리
  if (existingMember) {
    if (existingMember.deleted_at === null) {
      return { success: false, error: '이미 팀 멤버입니다' }
    }
    // deleted_at이 있으면 -> 복구 (UPDATE)
    const { error } = await supabase
      .from('team_members')
      .update({ deleted_at: null, role: 'MEMBER' })
      .eq('id', existingMember.id)

    if (error) {
      return { success: false, error: '멤버 복구에 실패했습니다' }
    }

    revalidatePath(`/teams/${teamId}/settings`)
    return { success: true }
  }

  // existingMember가 없으면 -> 새 멤버로 추가 (INSERT)
  const { error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: targetUser.id,
      role: 'MEMBER',
    })

  if (error) {
    return { success: false, error: '멤버 추가에 실패했습니다' }
  }

  revalidatePath(`/teams/${teamId}/settings`)
  return { success: true }
}

// 초대 수락
export async function acceptInvitation(invitationId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 사용자 프로필 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { success: false, error: '사용자 정보를 찾을 수 없습니다' }
  }

  // 초대 정보 가져오기
  const { data: invitation } = await supabase
    .from('team_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('email', profile.email)
    .eq('status', 'PENDING')
    .single()

  if (!invitation) {
    return { success: false, error: '유효하지 않은 초대입니다' }
  }

  // 만료 확인
  if (new Date(invitation.expires_at) < new Date()) {
    await supabase
      .from('team_invitations')
      .update({ status: 'EXPIRED' })
      .eq('id', invitationId)

    return { success: false, error: '만료된 초대입니다' }
  }

  // 팀 멤버로 추가
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: invitation.team_id,
      user_id: user.id,
      role: 'MEMBER',
    })

  if (memberError) {
    return { success: false, error: '팀 참여에 실패했습니다' }
  }

  // 초대 상태 업데이트
  await supabase
    .from('team_invitations')
    .update({ status: 'ACCEPTED' })
    .eq('id', invitationId)

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: invitation.team_id,
    p_activity_type: 'MEMBER_JOINED',
    p_target_user_id: user.id,
  })

  revalidatePath('/dashboard')
  return { success: true, data: { teamId: invitation.team_id } }
}

// FR-015: 멤버 강제 퇴장
export async function removeMember(teamId: string, memberId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 현재 사용자 권한 확인 via common service
  const { role: currentRole } = await checkTeamMember(teamId, user.id)
  if (!currentRole || !['OWNER', 'ADMIN'].includes(currentRole)) {
    return { success: false, error: '멤버를 강제 퇴장시킬 권한이 없습니다' }
  }

  // 대상 멤버 정보 확인
  const { data: targetMember } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .single()

  if (!targetMember) {
    return { success: false, error: '멤버를 찾을 수 없습니다' }
  }

  // 본인 강제 퇴장 불가
  if (targetMember.user_id === user.id) {
    return { success: false, error: '본인은 강제 퇴장시킬 수 없습니다' }
  }

  // OWNER는 강퇴 불가
  if (targetMember.role === 'OWNER') {
    return { success: false, error: '팀 소유자는 강제 퇴장시킬 수 없습니다' }
  }

  // ADMIN은 MEMBER만 강퇴 가능
  if (currentRole === 'ADMIN' && targetMember.role !== 'MEMBER') {
    return { success: false, error: '관리자는 일반 멤버만 강제 퇴장시킬 수 있습니다' }
  }

  // Soft Delete via common service
  try {
    await softDelete('team_members', memberId)
  } catch {
    return { success: false, error: '멤버 강제 퇴장에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: teamId,
    p_activity_type: 'MEMBER_REMOVED',
    p_target_user_id: targetMember.user_id,
  })

  revalidatePath(`/teams/${teamId}/settings`)
  return { success: true }
}

// FR-016: 팀 탈퇴
export async function leaveTeam(teamId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 현재 사용자 정보 확인 via common service
  const { isMember, role } = await checkTeamMember(teamId, user.id)
  if (!isMember) {
    return { success: false, error: '팀 멤버가 아닙니다' }
  }

  // OWNER는 탈퇴 불가
  if (role === 'OWNER') {
    return { success: false, error: '팀 소유자는 탈퇴할 수 없습니다. 팀을 삭제하거나 소유권을 이전해주세요.' }
  }

  // 멤버 ID 조회 (softDelete에 필요)
  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!member) {
    return { success: false, error: '멤버 정보를 찾을 수 없습니다' }
  }

  // Soft Delete via common service
  try {
    await softDelete('team_members', member.id)
  } catch {
    return { success: false, error: '팀 탈퇴에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: teamId,
    p_activity_type: 'MEMBER_LEFT',
    p_target_user_id: user.id,
  })

  redirect('/dashboard')
}

// FR-018: 역할 변경
export async function changeMemberRole(
  teamId: string,
  memberId: string,
  newRole: 'ADMIN' | 'MEMBER'
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 현재 사용자 권한 확인 (OWNER만) via common service
  try {
    await requireTeamOwner(teamId, user.id)
  } catch {
    return { success: false, error: '역할을 변경할 권한이 없습니다' }
  }

  // 대상 멤버 확인
  const { data: targetMember } = await supabase
    .from('team_members')
    .select('user_id, role')
    .eq('id', memberId)
    .eq('team_id', teamId)
    .single()

  if (!targetMember) {
    return { success: false, error: '멤버를 찾을 수 없습니다' }
  }

  if (targetMember.role === 'OWNER') {
    return { success: false, error: '소유자의 역할은 변경할 수 없습니다' }
  }

  const { error } = await supabase
    .from('team_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) {
    return { success: false, error: '역할 변경에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: teamId,
    p_activity_type: 'ROLE_CHANGED',
    p_target_user_id: targetMember.user_id,
    p_metadata: { old_role: targetMember.role, new_role: newRole },
  })

  // 알림 생성
  await supabase.rpc('create_notification', {
    p_user_id: targetMember.user_id,
    p_type: 'ROLE_CHANGED',
    p_title: '역할이 변경되었습니다',
    p_message: `팀에서 ${newRole === 'ADMIN' ? '관리자' : '멤버'}로 역할이 변경되었습니다`,
    p_link: `/teams/${teamId}`,
  })

  revalidatePath(`/teams/${teamId}/settings`)
  return { success: true }
}

// OWNER 권한 이전
export async function transferOwnership(teamId: string, newOwnerId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 현재 사용자가 OWNER인지 확인 via common service
  try {
    await requireTeamOwner(teamId, user.id)
  } catch {
    return { success: false, error: '소유권을 이전할 권한이 없습니다' }
  }

  // 현재 사용자 멤버 ID 조회
  const { data: currentMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!currentMember) {
    return { success: false, error: '멤버 정보를 찾을 수 없습니다' }
  }

  // 새 소유자 확인
  const { data: newOwnerMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', newOwnerId)
    .single()

  if (!newOwnerMember) {
    return { success: false, error: '대상 사용자가 팀 멤버가 아닙니다' }
  }

  // 트랜잭션: 새 OWNER 설정, 기존 OWNER를 ADMIN으로
  const { error: error1 } = await supabase
    .from('team_members')
    .update({ role: 'OWNER' })
    .eq('id', newOwnerMember.id)

  if (error1) {
    return { success: false, error: '소유권 이전에 실패했습니다' }
  }

  const { error: error2 } = await supabase
    .from('team_members')
    .update({ role: 'ADMIN' })
    .eq('id', currentMember.id)

  if (error2) {
    // 롤백
    await supabase
      .from('team_members')
      .update({ role: 'MEMBER' })
      .eq('id', newOwnerMember.id)

    return { success: false, error: '소유권 이전에 실패했습니다' }
  }

  // 팀 owner_id 업데이트
  await supabase
    .from('teams')
    .update({ owner_id: newOwnerId })
    .eq('id', teamId)

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: teamId,
    p_activity_type: 'ROLE_CHANGED',
    p_target_user_id: newOwnerId,
    p_metadata: { old_role: 'MEMBER', new_role: 'OWNER', transferred_from: user.id },
  })

  revalidatePath(`/teams/${teamId}/settings`)
  return { success: true }
}

// FR-014: 팀 멤버 조회 (서버 함수)
export async function getTeamMembers(teamId: string) {
  const supabase = await createClient()

  const { data: members, error } = await supabase
    .from('team_members')
    .select(`
      id,
      role,
      joined_at,
      profiles (
        id,
        name,
        email,
        profile_image
      )
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Get team members error:', error)
    return []
  }

  return members
}

// FR-019: 팀 활동 로그 조회
export async function getTeamActivityLogs(teamId: string, limit = 20, offset = 0) {
  const supabase = await createClient()

  const { data: logs, error } = await supabase
    .from('team_activity_logs')
    .select(`
      id,
      activity_type,
      metadata,
      created_at,
      user:profiles!team_activity_logs_user_id_fkey (
        id,
        name,
        profile_image
      ),
      target_user:profiles!team_activity_logs_target_user_id_fkey (
        id,
        name
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Get activity logs error:', error)
    return []
  }

  return logs
}

// 사용자가 속한 모든 팀 목록 조회
export async function getUserTeams() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data: teamMemberships, error } = await supabase
    .from('team_members')
    .select(`
      team_id,
      role,
      teams (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)

  if (error) {
    console.error('Get user teams error:', error)
    return []
  }

  type TeamMembershipRow = {
    team_id: string
    role: string
    teams: { id: string; name: string } | null
  }

  return ((teamMemberships as TeamMembershipRow[] | null) || [])
    .filter(tm => tm.teams !== null)
    .map(tm => ({
      id: tm.teams!.id,
      name: tm.teams!.name,
      role: tm.role as 'OWNER' | 'ADMIN' | 'MEMBER'
    }))
}
