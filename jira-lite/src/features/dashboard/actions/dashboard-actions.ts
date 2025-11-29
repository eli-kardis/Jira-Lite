'use server'

import { createClient } from '@/lib/supabase/server'

// 프로젝트 대시보드 통계
export async function getProjectDashboard(projectId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // 이슈 통계
  const { data: issues } = await supabase
    .from('issues')
    .select(`
      id,
      status_id,
      priority,
      assignee_id,
      due_date,
      created_at,
      statuses:status_id (name)
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (!issues) return null

  // 상태별 통계
  const statusCounts: Record<string, { name: string; count: number }> = {}
  issues.forEach((issue) => {
    const statusName = (issue.statuses as { name: string } | null)?.name || '알 수 없음'
    if (!statusCounts[issue.status_id]) {
      statusCounts[issue.status_id] = { name: statusName, count: 0 }
    }
    statusCounts[issue.status_id].count++
  })

  // 우선순위별 통계
  const priorityCounts = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  }
  issues.forEach((issue) => {
    priorityCounts[issue.priority]++
  })

  // 담당자별 통계
  const assigneeCounts: Record<string, number> = {}
  issues.forEach((issue) => {
    const key = issue.assignee_id || 'unassigned'
    assigneeCounts[key] = (assigneeCounts[key] || 0) + 1
  })

  // 기간별 생성 추이 (최근 7일)
  const last7Days: Record<string, number> = {}
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]
    last7Days[key] = 0
  }
  issues.forEach((issue) => {
    const key = issue.created_at.split('T')[0]
    if (last7Days[key] !== undefined) {
      last7Days[key]++
    }
  })

  // 마감일 임박/초과 이슈
  const now = new Date()
  const dueSoon = issues.filter((issue) => {
    if (!issue.due_date) return false
    const dueDate = new Date(issue.due_date)
    const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 3
  })

  const overdue = issues.filter((issue) => {
    if (!issue.due_date) return false
    const dueDate = new Date(issue.due_date)
    return dueDate < now
  })

  return {
    totalIssues: issues.length,
    byStatus: Object.values(statusCounts),
    byPriority: priorityCounts,
    byAssignee: assigneeCounts,
    createdTrend: Object.entries(last7Days).map(([date, count]) => ({ date, count })),
    dueSoon: dueSoon.length,
    overdue: overdue.length,
  }
}

// 개인 대시보드 통계
export async function getPersonalDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // 내게 할당된 이슈
  const { data: myIssues } = await supabase
    .from('issues')
    .select(`
      id,
      title,
      status_id,
      priority,
      due_date,
      project_id,
      projects:project_id (name, team_id),
      statuses:status_id (name)
    `)
    .eq('assignee_id', user.id)
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(20)

  // 상태별 카운트
  const statusCounts: Record<string, number> = {}
  myIssues?.forEach((issue) => {
    const statusName = (issue.statuses as { name: string } | null)?.name || '알 수 없음'
    statusCounts[statusName] = (statusCounts[statusName] || 0) + 1
  })

  // 마감일 임박/초과
  const now = new Date()
  const dueSoon = myIssues?.filter((issue) => {
    if (!issue.due_date) return false
    const dueDate = new Date(issue.due_date)
    const diff = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 && diff <= 3
  }) || []

  const overdue = myIssues?.filter((issue) => {
    if (!issue.due_date) return false
    const dueDate = new Date(issue.due_date)
    return dueDate < now
  }) || []

  // 최근 활동 (최근 댓글)
  // 디버깅 로그
  console.log('[Dashboard Debug] Fetching recent comments for user:', user.id)

  const { data: recentComments, error: commentsError } = await supabase
    .from('comments')
    .select(`
      id,
      content,
      created_at,
      issue:issues!comments_issue_id_fkey (
        id,
        title,
        project_id,
        project:projects!issues_project_id_fkey (name, team_id)
      ),
      author:profiles!comments_user_id_fkey (id, name, email)
    `)
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10)

  console.log('[Dashboard Debug] Comments query result:', {
    count: recentComments?.length ?? 0,
    error: commentsError ? JSON.stringify(commentsError) : 'none',
    data: recentComments?.slice(0, 2) // 처음 2개만 로그
  })

  // RLS 문제 가능성 안내
  if (commentsError) {
    console.error('[Dashboard Debug] Comments RLS issue? Check if SELECT policy exists on comments table.')
    console.error('[Dashboard Debug] SQL: CREATE POLICY "Allow Select" ON comments FOR SELECT TO authenticated USING (true);')
  }

  return {
    totalAssigned: myIssues?.length || 0,
    myIssues: myIssues || [],
    statusCounts,
    dueSoon,
    overdue,
    recentComments: recentComments || [],
  }
}

// 팀 통계 (상태별 이슈 집계)
export async function getTeamStatistics(teamId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // 팀 멤버십 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return null

  // 팀의 모든 프로젝트 ID 조회
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('team_id', teamId)
    .is('deleted_at', null)

  const projectIds = projects?.map(p => p.id) || []

  if (projectIds.length === 0) {
    return {
      byStatus: [
        { name: 'Backlog', count: 0 },
        { name: '진행 중', count: 0 },
        { name: '완료', count: 0 },
      ],
      totalIssues: 0,
    }
  }

  // 상태 이름을 조인해서 카운트
  const { data: allIssues } = await supabase
    .from('issues')
    .select(`
      id,
      statuses:status_id (name)
    `)
    .in('project_id', projectIds)
    .is('deleted_at', null)

  const statusCounts: Record<string, number> = {
    'Backlog': 0,
    '진행 중': 0,
    '완료': 0,
  }

  allIssues?.forEach((issue) => {
    const statusName = (issue.statuses as { name: string } | null)?.name
    if (statusName && statusCounts[statusName] !== undefined) {
      statusCounts[statusName]++
    }
  })

  return {
    byStatus: [
      { name: 'Backlog', count: statusCounts['Backlog'] },
      { name: '진행 중', count: statusCounts['진행 중'] },
      { name: '완료', count: statusCounts['완료'] },
    ],
    totalIssues: allIssues?.length || 0,
  }
}

// 팀 대시보드 통계
export async function getTeamDashboard(teamId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // 팀 멤버십 확인
  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) return null

  // 팀 프로젝트 목록
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .eq('team_id', teamId)
    .is('deleted_at', null)
    .is('archived_at', null)

  const projectIds = projects?.map(p => p.id) || []

  // 팀 전체 이슈 통계
  const { data: teamIssues } = await supabase
    .from('issues')
    .select(`
      id,
      status_id,
      priority,
      assignee_id,
      created_at,
      project_id,
      statuses:status_id (name)
    `)
    .in('project_id', projectIds)
    .is('deleted_at', null)

  // 프로젝트별 이슈 수
  const projectIssueCounts: Record<string, { name: string; count: number }> = {}
  projects?.forEach(p => {
    projectIssueCounts[p.id] = { name: p.name, count: 0 }
  })
  teamIssues?.forEach((issue) => {
    if (projectIssueCounts[issue.project_id]) {
      projectIssueCounts[issue.project_id].count++
    }
  })

  // 멤버별 이슈 수
  const { data: teamMembers } = await supabase
    .from('team_members')
    .select(`
      user_id,
      profiles (name)
    `)
    .eq('team_id', teamId)

  const memberIssueCounts: { name: string; count: number }[] = []
  teamMembers?.forEach((member) => {
    const count = teamIssues?.filter(i => i.assignee_id === member.user_id).length || 0
    memberIssueCounts.push({
      name: (member.profiles as { name: string } | null)?.name || '알 수 없음',
      count,
    })
  })

  // 주간 생성 추이
  const last7Days: Record<string, number> = {}
  const today = new Date()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]
    last7Days[key] = 0
  }
  teamIssues?.forEach((issue) => {
    const key = issue.created_at.split('T')[0]
    if (last7Days[key] !== undefined) {
      last7Days[key]++
    }
  })

  return {
    totalProjects: projects?.length || 0,
    totalIssues: teamIssues?.length || 0,
    totalMembers: teamMembers?.length || 0,
    byProject: Object.values(projectIssueCounts),
    byMember: memberIssueCounts.sort((a, b) => b.count - a.count),
    createdTrend: Object.entries(last7Days).map(([date, count]) => ({ date, count })),
  }
}
