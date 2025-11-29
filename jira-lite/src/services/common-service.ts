import { createClient } from '@/lib/supabase/server'
import { TeamRole } from '@/lib/supabase/types'

// Soft Delete 대상 테이블
type SoftDeletableTable =
  | 'profiles'
  | 'teams'
  | 'team_members'
  | 'projects'
  | 'issues'
  | 'comments'
  | 'subtasks'

/**
 * 범용 Soft Delete
 * RLS에서 DELETE 차단되므로 반드시 이 함수 사용
 */
export async function softDelete(
  table: SoftDeletableTable,
  id: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', id)

  if (error) throw new Error(`Soft delete failed: ${error.message}`)
}

/**
 * 팀 멤버 Soft Delete (복합키)
 */
export async function softDeleteTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('team_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('user_id', userId)

  if (error) throw new Error(`Soft delete failed: ${error.message}`)
}

/**
 * 권한 확인 - 팀 멤버 여부
 */
export async function checkTeamMember(
  teamId: string,
  userId: string
): Promise<{ isMember: boolean; role: TeamRole | null }> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single()

  return {
    isMember: !!data,
    role: data?.role ?? null,
  }
}

/**
 * 권한 확인 - 프로젝트 접근
 */
export async function checkProjectAccess(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', projectId)
    .single()

  if (!project) return false

  const { isMember } = await checkTeamMember(project.team_id, userId)
  return isMember
}

/**
 * 권한 확인 - 팀 OWNER/ADMIN 여부
 */
export async function requireTeamAdmin(
  teamId: string,
  userId: string
): Promise<void> {
  const { role } = await checkTeamMember(teamId, userId)
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new Error('Permission denied: Admin access required')
  }
}

/**
 * 권한 확인 - 팀 OWNER 여부
 */
export async function requireTeamOwner(
  teamId: string,
  userId: string
): Promise<void> {
  const { role } = await checkTeamMember(teamId, userId)
  if (role !== 'OWNER') {
    throw new Error('Permission denied: Owner access required')
  }
}
