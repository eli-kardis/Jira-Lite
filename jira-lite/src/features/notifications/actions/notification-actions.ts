'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// 알림 목록 조회
export async function getNotifications(limit = 20, offset = 0) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return data || []
}

// 읽지 않은 알림 수 조회
export async function getUnreadCount() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return 0
  }

  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return count || 0
}

// 알림 읽음 처리
export async function markAsRead(notificationId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

// 모든 알림 읽음 처리
export async function markAllAsRead() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다' }
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  return { success: true }
}

// 알림 설정 조회
export async function getNotificationSettings() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return data
}

// 알림 설정 업데이트
export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '인증이 필요합니다' }
  }

  const settings = {
    email_enabled: formData.get('email_enabled') === 'true',
    push_enabled: formData.get('push_enabled') === 'true',
    issue_assigned: formData.get('issue_assigned') === 'true',
    issue_mentioned: formData.get('issue_mentioned') === 'true',
    issue_status_changed: formData.get('issue_status_changed') === 'true',
    issue_comment: formData.get('issue_comment') === 'true',
    issue_due_soon: formData.get('issue_due_soon') === 'true',
    team_invited: formData.get('team_invited') === 'true',
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('notification_settings')
    .upsert({
      user_id: user.id,
      ...settings,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/profile')
  return { success: true }
}

// 알림 생성 (서버 사이드에서 호출)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient()

  const { error } = await supabase.rpc('create_notification', {
    p_user_id: userId,
    p_type: type,
    p_title: title,
    p_message: message,
    p_link: link || null,
    p_metadata: metadata || null,
  })

  if (error) {
    console.error('Failed to create notification:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

// 이슈 담당자 변경 시 알림 생성
export async function notifyIssueAssigned(
  assigneeId: string,
  issueTitle: string,
  projectName: string,
  issueLink: string
) {
  return createNotification(
    assigneeId,
    'ISSUE_ASSIGNED',
    '새 이슈가 할당되었습니다',
    `[${projectName}] ${issueTitle}`,
    issueLink,
    { issueTitle, projectName }
  )
}

// 이슈 상태 변경 시 알림 생성
export async function notifyIssueStatusChanged(
  ownerId: string,
  issueTitle: string,
  oldStatus: string,
  newStatus: string,
  issueLink: string
) {
  return createNotification(
    ownerId,
    'ISSUE_STATUS_CHANGED',
    '이슈 상태가 변경되었습니다',
    `${issueTitle}: ${oldStatus} → ${newStatus}`,
    issueLink,
    { issueTitle, oldStatus, newStatus }
  )
}

// 댓글 알림 생성
export async function notifyIssueComment(
  userId: string,
  commenterName: string,
  issueTitle: string,
  issueLink: string
) {
  return createNotification(
    userId,
    'ISSUE_COMMENT',
    '새 댓글이 달렸습니다',
    `${commenterName}님이 [${issueTitle}]에 댓글을 남겼습니다`,
    issueLink,
    { commenterName, issueTitle }
  )
}

// 팀 초대 알림 생성
export async function notifyTeamInvited(
  userId: string,
  teamName: string,
  teamLink: string
) {
  return createNotification(
    userId,
    'TEAM_INVITED',
    '팀에 초대되었습니다',
    `${teamName} 팀에 초대되었습니다`,
    teamLink,
    { teamName }
  )
}
