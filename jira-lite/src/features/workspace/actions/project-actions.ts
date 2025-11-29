'use server'

import { createClient } from '@/lib/supabase/server'
import { createProjectSchema, updateProjectSchema, createLabelSchema, updateLabelSchema, createStatusSchema, updateStatusSchema } from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// FR-020: 프로젝트 생성
export async function createProject(teamId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 팀 멤버인지 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { success: false, error: '팀 멤버가 아닙니다' }
  }

  // 팀당 프로젝트 개수 확인 (최대 15개)
  const { count } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .is('deleted_at', null)

  if (count !== null && count >= 15) {
    return { success: false, error: '팀당 최대 프로젝트 수(15개)에 도달했습니다' }
  }

  const rawData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string || undefined,
  }

  const result = createProjectSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { name, description } = result.data

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      team_id: teamId,
      name,
      description: description || null,
      owner_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create project error:', error)
    return { success: false, error: '프로젝트 생성에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: teamId,
    p_activity_type: 'PROJECT_CREATED',
    p_target_project_id: project.id,
    p_metadata: { project_name: name },
  })

  redirect(`/teams/${teamId}/projects/${project.id}`)
}

// FR-021, FR-022: 프로젝트 조회
export async function getProject(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      teams (
        id,
        name
      )
    `)
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (error || !project) {
    return null
  }

  // 팀 멤버십 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return null
  }

  return { project, membership }
}

// FR-023: 프로젝트 수정
export async function updateProject(projectId: string, data: { name: string; description: string }): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 프로젝트 정보 가져오기
  const { data: project } = await supabase
    .from('projects')
    .select('team_id, owner_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다' }
  }

  // 권한 확인 (OWNER, ADMIN, 프로젝트 소유자)
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { success: false, error: '권한이 없습니다' }
  }

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)
  const isProjectOwner = project.owner_id === user.id

  if (!isOwnerOrAdmin && !isProjectOwner) {
    return { success: false, error: '프로젝트를 수정할 권한이 없습니다' }
  }

  const result = updateProjectSchema.safeParse(data)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('projects')
    .update({
      name: result.data.name,
      description: result.data.description || null,
    })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: '프로젝트 수정에 실패했습니다' }
  }

  revalidatePath(`/teams/${project.team_id}/projects/${projectId}`)
  return { success: true }
}

// FR-024: 프로젝트 삭제
export async function deleteProject(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 프로젝트 정보 가져오기
  const { data: project } = await supabase
    .from('projects')
    .select('team_id, owner_id, name')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다' }
  }

  // 권한 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { success: false, error: '권한이 없습니다' }
  }

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)
  const isProjectOwner = project.owner_id === user.id

  if (!isOwnerOrAdmin && !isProjectOwner) {
    return { success: false, error: '프로젝트를 삭제할 권한이 없습니다' }
  }

  // Soft Delete
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: '프로젝트 삭제에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: project.team_id,
    p_activity_type: 'PROJECT_DELETED',
    p_target_project_id: projectId,
    p_metadata: { project_name: project.name },
  })

  redirect(`/teams/${project.team_id}`)
}

// FR-026: 프로젝트 아카이브
export async function archiveProject(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 프로젝트 정보 가져오기
  const { data: project } = await supabase
    .from('projects')
    .select('team_id, owner_id, name')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다' }
  }

  // 권한 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { success: false, error: '권한이 없습니다' }
  }

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)
  const isProjectOwner = project.owner_id === user.id

  if (!isOwnerOrAdmin && !isProjectOwner) {
    return { success: false, error: '프로젝트를 아카이브할 권한이 없습니다' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: '프로젝트 아카이브에 실패했습니다' }
  }

  // 활동 로그 기록
  await supabase.rpc('log_team_activity', {
    p_team_id: project.team_id,
    p_activity_type: 'PROJECT_ARCHIVED',
    p_target_project_id: projectId,
    p_metadata: { project_name: project.name },
  })

  revalidatePath(`/teams/${project.team_id}/projects/${projectId}`)
  return { success: true }
}

// FR-026: 프로젝트 복원 (unarchiveProject 별칭)
export async function unarchiveProject(projectId: string): Promise<ActionResult> {
  return restoreProject(projectId)
}

export async function restoreProject(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('team_id, owner_id')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다' }
  }

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { success: false, error: '권한이 없습니다' }
  }

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(membership.role)
  const isProjectOwner = project.owner_id === user.id

  if (!isOwnerOrAdmin && !isProjectOwner) {
    return { success: false, error: '프로젝트를 복원할 권한이 없습니다' }
  }

  const { error } = await supabase
    .from('projects')
    .update({ archived_at: null })
    .eq('id', projectId)

  if (error) {
    return { success: false, error: '프로젝트 복원에 실패했습니다' }
  }

  revalidatePath(`/teams/${project.team_id}/projects/${projectId}`)
  return { success: true }
}

// FR-027: 프로젝트 즐겨찾기 토글
export async function toggleFavorite(projectId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 기존 즐겨찾기 확인
  const { data: existing } = await supabase
    .from('project_favorites')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // 즐겨찾기 해제
    await supabase
      .from('project_favorites')
      .delete()
      .eq('id', existing.id)
  } else {
    // 즐겨찾기 추가
    await supabase
      .from('project_favorites')
      .insert({
        project_id: projectId,
        user_id: user.id,
      })
  }

  revalidatePath('/')
  return { success: true, data: { isFavorite: !existing } }
}

// 프로젝트 상태 목록 조회
export async function getProjectStatuses(projectId: string) {
  const supabase = await createClient()

  const { data: statuses } = await supabase
    .from('project_statuses')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  return statuses || []
}

// FR-053: 커스텀 상태 추가
export async function createStatus(
  projectId: string,
  data: { name: string; color: string; wip_limit?: number | null }
): Promise<{ error?: string; status?: { id: string; name: string; color: string; position: number; is_default: boolean } }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: '로그인이 필요합니다' }
  }

  // 상태 개수 확인 (최대 8개)
  const { count } = await supabase
    .from('project_statuses')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if (count !== null && count >= 8) {
    return { error: '프로젝트당 최대 상태 수(8개)에 도달했습니다' }
  }

  const result = createStatusSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  // 다음 position 계산
  const { data: lastStatus } = await supabase
    .from('project_statuses')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (lastStatus?.position ?? -1) + 1

  const { data: newStatus, error } = await supabase
    .from('project_statuses')
    .insert({
      project_id: projectId,
      name: result.data.name,
      color: result.data.color || null,
      wip_limit: result.data.wip_limit,
      position: nextPosition,
      is_default: false,
    })
    .select()
    .single()

  if (error) {
    return { error: '상태 추가에 실패했습니다' }
  }

  revalidatePath(`/`)
  return { status: newStatus }
}

// 상태 수정
export async function updateStatus(
  statusId: string,
  data: { name?: string; color?: string; wip_limit?: number | null }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const result = updateStatusSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('project_statuses')
    .update({
      name: result.data.name,
      color: result.data.color,
      wip_limit: result.data.wip_limit,
    })
    .eq('id', statusId)

  if (error) {
    return { error: '상태 수정에 실패했습니다' }
  }

  revalidatePath('/')
  return {}
}

// 상태 삭제 (기본 상태는 삭제 불가)
export async function deleteStatus(statusId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: status } = await supabase
    .from('project_statuses')
    .select('is_default')
    .eq('id', statusId)
    .single()

  if (status?.is_default) {
    return { error: '기본 상태는 삭제할 수 없습니다' }
  }

  const { error } = await supabase
    .from('project_statuses')
    .delete()
    .eq('id', statusId)

  if (error) {
    return { error: '상태 삭제에 실패했습니다' }
  }

  revalidatePath('/')
  return {}
}

// 상태 순서 변경
export async function reorderStatuses(projectId: string, statusIds: string[]): Promise<{ error?: string }> {
  const supabase = await createClient()

  // 각 상태의 position 업데이트
  for (let i = 0; i < statusIds.length; i++) {
    const { error } = await supabase
      .from('project_statuses')
      .update({ position: i })
      .eq('id', statusIds[i])
      .eq('project_id', projectId)

    if (error) {
      return { error: '상태 순서 변경에 실패했습니다' }
    }
  }

  revalidatePath('/')
  return {}
}

// 프로젝트 라벨 목록 조회
export async function getProjectLabels(projectId: string) {
  const supabase = await createClient()

  const { data: labels } = await supabase
    .from('labels')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  return labels || []
}

// FR-038: 라벨 생성
export async function createLabel(
  projectId: string,
  data: { name: string; color: string }
): Promise<{ error?: string; label?: { id: string; name: string; color: string } }> {
  const supabase = await createClient()

  // 라벨 개수 확인 (최대 20개)
  const { count } = await supabase
    .from('labels')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if (count !== null && count >= 20) {
    return { error: '프로젝트당 최대 라벨 수(20개)에 도달했습니다' }
  }

  const result = createLabelSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { data: newLabel, error } = await supabase
    .from('labels')
    .insert({
      project_id: projectId,
      name: result.data.name,
      color: result.data.color,
    })
    .select()
    .single()

  if (error) {
    return { error: '라벨 생성에 실패했습니다' }
  }

  revalidatePath('/')
  return { label: newLabel }
}

// 라벨 수정
export async function updateLabel(
  labelId: string,
  data: { name?: string; color?: string }
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const result = updateLabelSchema.safeParse(data)
  if (!result.success) {
    return { error: result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('labels')
    .update({
      name: result.data.name,
      color: result.data.color,
    })
    .eq('id', labelId)

  if (error) {
    return { error: '라벨 수정에 실패했습니다' }
  }

  revalidatePath('/')
  return {}
}

// 라벨 삭제
export async function deleteLabel(labelId: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('labels')
    .delete()
    .eq('id', labelId)

  if (error) {
    return { error: '라벨 삭제에 실패했습니다' }
  }

  revalidatePath('/')
  return {}
}
