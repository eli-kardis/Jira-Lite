'use server'

import { createClient } from '@/lib/supabase/server'
import { createIssueSchema, updateIssueSchema, createCommentSchema, updateCommentSchema, createSubtaskSchema, updateSubtaskSchema } from '@/lib/utils/validation'
import { revalidatePath } from 'next/cache'
import { softDelete } from '@/services/common-service'

export type ActionResult = {
  success: boolean
  error?: string
  data?: unknown
}

// FR-030: 이슈 생성
export async function createIssue(projectId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 프로젝트 확인 및 아카이브 상태 확인
  const { data: project } = await supabase
    .from('projects')
    .select('team_id, archived_at')
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (!project) {
    return { success: false, error: '프로젝트를 찾을 수 없습니다' }
  }

  if (project.archived_at) {
    return { success: false, error: '아카이브된 프로젝트에는 이슈를 생성할 수 없습니다' }
  }

  // 팀 멤버십 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return { success: false, error: '팀 멤버가 아닙니다' }
  }

  // 이슈 개수 확인 (최대 200개)
  const { count } = await supabase
    .from('issues')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (count !== null && count >= 200) {
    return { success: false, error: '프로젝트당 최대 이슈 수(200개)에 도달했습니다' }
  }

  const labelIds = formData.getAll('label_ids') as string[]

  const rawData = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || undefined,
    assignee_id: formData.get('assignee_id') as string || null,
    due_date: formData.get('due_date') as string || null,
    priority: (formData.get('priority') as string) || 'MEDIUM',
    label_ids: labelIds,
  }

  const result = createIssueSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  // Backlog 상태 가져오기
  const { data: backlogStatus } = await supabase
    .from('project_statuses')
    .select('id')
    .eq('project_id', projectId)
    .eq('name', 'Backlog')
    .single()

  if (!backlogStatus) {
    return { success: false, error: '기본 상태를 찾을 수 없습니다' }
  }

  // 다음 position 계산
  const { data: lastIssue } = await supabase
    .from('issues')
    .select('position')
    .eq('project_id', projectId)
    .eq('status_id', backlogStatus.id)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (lastIssue?.position ?? -1) + 1

  const { data: issue, error } = await supabase
    .from('issues')
    .insert({
      project_id: projectId,
      status_id: backlogStatus.id,
      title: result.data.title,
      description: result.data.description || null,
      assignee_id: result.data.assignee_id || null,
      due_date: result.data.due_date || null,
      priority: result.data.priority as 'HIGH' | 'MEDIUM' | 'LOW',
      owner_id: user.id,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) {
    console.error('Create issue error:', error)
    return { success: false, error: '이슈 생성에 실패했습니다' }
  }

  // 라벨 연결
  if (result.data.label_ids && result.data.label_ids.length > 0) {
    const labelInserts = result.data.label_ids.map(labelId => ({
      issue_id: issue.id,
      label_id: labelId,
    }))

    await supabase.from('issue_labels').insert(labelInserts)
  }

  // 담당자에게 알림 (본인이 아닌 경우)
  if (result.data.assignee_id && result.data.assignee_id !== user.id) {
    await supabase.rpc('create_notification', {
      p_user_id: result.data.assignee_id,
      p_type: 'ISSUE_ASSIGNED',
      p_title: '새 이슈가 배정되었습니다',
      p_message: result.data.title,
      p_link: `/teams/${project.team_id}/projects/${projectId}?issue=${issue.id}`,
    })
  }

  revalidatePath('/')
  return { success: true, data: issue }
}

// FR-032: 이슈 수정
export async function updateIssue(issueId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 이슈 정보 가져오기
  const { data: issue } = await supabase
    .from('issues')
    .select('*, projects(team_id, archived_at)')
    .eq('id', issueId)
    .is('deleted_at', null)
    .single()

  if (!issue) {
    return { success: false, error: '이슈를 찾을 수 없습니다' }
  }

  if (issue.projects?.archived_at) {
    return { success: false, error: '아카이브된 프로젝트의 이슈는 수정할 수 없습니다' }
  }

  const labelIds = formData.getAll('label_ids') as string[]

  const rawData = {
    title: formData.get('title') as string || undefined,
    description: formData.get('description') as string ?? undefined,
    status_id: formData.get('status_id') as string || undefined,
    assignee_id: formData.get('assignee_id') as string ?? undefined,
    due_date: formData.get('due_date') as string ?? undefined,
    priority: formData.get('priority') as string || undefined,
    label_ids: labelIds.length > 0 ? labelIds : undefined,
  }

  const result = updateIssueSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const updateData: Record<string, unknown> = {}
  if (result.data.title) updateData.title = result.data.title
  if (result.data.description !== undefined) updateData.description = result.data.description
  if (result.data.status_id) updateData.status_id = result.data.status_id
  if (result.data.assignee_id !== undefined) updateData.assignee_id = result.data.assignee_id || null
  if (result.data.due_date !== undefined) updateData.due_date = result.data.due_date || null
  if (result.data.priority) updateData.priority = result.data.priority

  if (Object.keys(updateData).length > 0) {
    const { error } = await supabase
      .from('issues')
      .update(updateData)
      .eq('id', issueId)

    if (error) {
      return { success: false, error: '이슈 수정에 실패했습니다' }
    }
  }

  // 라벨 업데이트
  if (result.data.label_ids !== undefined) {
    // 기존 라벨 삭제
    await supabase
      .from('issue_labels')
      .delete()
      .eq('issue_id', issueId)

    // 새 라벨 추가
    if (result.data.label_ids.length > 0) {
      const labelInserts = result.data.label_ids.map(labelId => ({
        issue_id: issueId,
        label_id: labelId,
      }))
      await supabase.from('issue_labels').insert(labelInserts)
    }
  }

  // 담당자 변경 알림
  if (result.data.assignee_id && result.data.assignee_id !== issue.assignee_id && result.data.assignee_id !== user.id) {
    await supabase.rpc('create_notification', {
      p_user_id: result.data.assignee_id,
      p_type: 'ISSUE_ASSIGNED',
      p_title: '이슈가 배정되었습니다',
      p_message: issue.title,
      p_link: `/teams/${issue.projects?.team_id}/projects/${issue.project_id}?issue=${issueId}`,
    })
  }

  revalidatePath('/')
  return { success: true }
}

// FR-033, FR-051: 이슈 상태 변경 (드래그 앤 드롭)
export async function updateIssueStatus(
  issueId: string,
  statusId: string,
  newPosition: number
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const { error } = await supabase
    .from('issues')
    .update({
      status_id: statusId,
      position: newPosition,
    })
    .eq('id', issueId)

  if (error) {
    return { success: false, error: '이슈 상태 변경에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}

// FR-052: 이슈 순서 변경
export async function updateIssuePosition(issueId: string, newPosition: number): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('issues')
    .update({ position: newPosition })
    .eq('id', issueId)

  if (error) {
    return { success: false, error: '이슈 순서 변경에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}

// FR-035: 이슈 삭제
export async function deleteIssue(issueId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 이슈 정보 가져오기
  const { data: issue } = await supabase
    .from('issues')
    .select('owner_id, projects(team_id, owner_id)')
    .eq('id', issueId)
    .is('deleted_at', null)
    .single()

  if (!issue) {
    return { success: false, error: '이슈를 찾을 수 없습니다' }
  }

  // 권한 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', issue.projects?.team_id)
    .eq('user_id', user.id)
    .single()

  const isIssueOwner = issue.owner_id === user.id
  const isProjectOwner = issue.projects?.owner_id === user.id
  const isOwnerOrAdmin = membership && ['OWNER', 'ADMIN'].includes(membership.role)

  if (!isIssueOwner && !isProjectOwner && !isOwnerOrAdmin) {
    return { success: false, error: '이슈를 삭제할 권한이 없습니다' }
  }

  // Soft Delete via common service
  try {
    await softDelete('issues', issueId)
  } catch (error) {
    return { success: false, error: '이슈 삭제에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}

// FR-039: 이슈 변경 히스토리 조회
export async function getIssueHistory(issueId: string) {
  const supabase = await createClient()

  const { data: history } = await supabase
    .from('issue_history')
    .select(`
      *,
      user:profiles!issue_history_user_id_fkey (
        id,
        name,
        profile_image
      )
    `)
    .eq('issue_id', issueId)
    .order('created_at', { ascending: false })

  return history || []
}

// FR-039-2: 서브태스크 생성
export async function createSubtask(issueId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  // 서브태스크 개수 확인 (최대 20개)
  const { count } = await supabase
    .from('subtasks')
    .select('id', { count: 'exact', head: true })
    .eq('issue_id', issueId)

  if (count !== null && count >= 20) {
    return { success: false, error: '이슈당 최대 서브태스크 수(20개)에 도달했습니다' }
  }

  const rawData = {
    title: formData.get('title') as string,
  }

  const result = createSubtaskSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  // 다음 position 계산
  const { data: lastSubtask } = await supabase
    .from('subtasks')
    .select('position')
    .eq('issue_id', issueId)
    .order('position', { ascending: false })
    .limit(1)
    .single()

  const nextPosition = (lastSubtask?.position ?? -1) + 1

  const { data: subtask, error } = await supabase
    .from('subtasks')
    .insert({
      issue_id: issueId,
      title: result.data.title,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: '서브태스크 생성에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true, data: subtask }
}

// 서브태스크 수정 (완료 토글 포함)
export async function updateSubtask(subtaskId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const rawData = {
    title: formData.get('title') as string || undefined,
    is_completed: formData.get('is_completed') === 'true' ? true : formData.get('is_completed') === 'false' ? false : undefined,
  }

  const result = updateSubtaskSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const updateData: Record<string, unknown> = {}
  if (result.data.title) updateData.title = result.data.title
  if (result.data.is_completed !== undefined) updateData.is_completed = result.data.is_completed

  const { error } = await supabase
    .from('subtasks')
    .update(updateData)
    .eq('id', subtaskId)

  if (error) {
    return { success: false, error: '서브태스크 수정에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}

// 서브태스크 삭제 (Soft Delete via common service)
export async function deleteSubtask(subtaskId: string): Promise<ActionResult> {
  try {
    await softDelete('subtasks', subtaskId)
  } catch (error) {
    return { success: false, error: '서브태스크 삭제에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}

// FR-060: 댓글 작성
export async function createComment(issueId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  const rawData = {
    content: formData.get('content') as string,
  }

  const result = createCommentSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      issue_id: issueId,
      user_id: user.id,
      content: result.data.content,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: '댓글 작성에 실패했습니다' }
  }

  // 이슈 소유자와 담당자에게 알림
  const { data: issue } = await supabase
    .from('issues')
    .select('owner_id, assignee_id, title, projects(team_id)')
    .eq('id', issueId)
    .single()

  if (issue) {
    const notifyUsers = new Set<string>()
    if (issue.owner_id && issue.owner_id !== user.id) {
      notifyUsers.add(issue.owner_id)
    }
    if (issue.assignee_id && issue.assignee_id !== user.id) {
      notifyUsers.add(issue.assignee_id)
    }

    for (const userId of notifyUsers) {
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'COMMENT',
        p_title: '새 댓글이 달렸습니다',
        p_message: `${issue.title}: ${result.data.content.substring(0, 50)}...`,
        p_link: `/teams/${issue.projects?.team_id}/projects/${issue.project_id}?issue=${issueId}`,
      })
    }
  }

  revalidatePath('/')
  return { success: true, data: comment }
}

// FR-061: 댓글 조회
export async function getComments(issueId: string, limit = 20, offset = 0) {
  const supabase = await createClient()

  const { data: comments } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!comments_user_id_fkey (
        id,
        name,
        profile_image
      )
    `)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  return comments || []
}

// FR-062: 댓글 수정
export async function updateComment(commentId: string, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 본인 댓글인지 확인
  const { data: comment } = await supabase
    .from('comments')
    .select('user_id')
    .eq('id', commentId)
    .is('deleted_at', null)
    .single()

  if (!comment || comment.user_id !== user.id) {
    return { success: false, error: '댓글을 수정할 권한이 없습니다' }
  }

  const rawData = {
    content: formData.get('content') as string,
  }

  const result = updateCommentSchema.safeParse(rawData)
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  const { error } = await supabase
    .from('comments')
    .update({ content: result.data.content })
    .eq('id', commentId)

  if (error) {
    return { success: false, error: '댓글 수정에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}

// FR-063: 댓글 삭제
export async function deleteComment(commentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '로그인이 필요합니다' }
  }

  // 댓글 정보 가져오기
  const { data: comment } = await supabase
    .from('comments')
    .select(`
      user_id,
      issues (
        owner_id,
        projects (
          team_id,
          owner_id
        )
      )
    `)
    .eq('id', commentId)
    .is('deleted_at', null)
    .single()

  if (!comment) {
    return { success: false, error: '댓글을 찾을 수 없습니다' }
  }

  // 권한 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', comment.issues?.projects?.team_id)
    .eq('user_id', user.id)
    .single()

  const isCommentOwner = comment.user_id === user.id
  const isIssueOwner = comment.issues?.owner_id === user.id
  const isProjectOwner = comment.issues?.projects?.owner_id === user.id
  const isOwnerOrAdmin = membership && ['OWNER', 'ADMIN'].includes(membership.role)

  if (!isCommentOwner && !isIssueOwner && !isProjectOwner && !isOwnerOrAdmin) {
    return { success: false, error: '댓글을 삭제할 권한이 없습니다' }
  }

  // Soft Delete via common service
  try {
    await softDelete('comments', commentId)
  } catch (error) {
    return { success: false, error: '댓글 삭제에 실패했습니다' }
  }

  revalidatePath('/')
  return { success: true }
}
