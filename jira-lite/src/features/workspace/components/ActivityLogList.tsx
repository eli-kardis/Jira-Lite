'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils/date'
import { getTeamActivityLogs } from '@/features/workspace/actions/team-actions'
import { Loader2, Activity } from 'lucide-react'
import type { ActivityLogType, Json } from '@/lib/supabase/types'

interface ActivityLog {
  id: string
  activity_type: ActivityLogType
  metadata: Json
  created_at: string
  user: {
    id: string
    name: string
    profile_image: string | null
  } | null
  target_user: {
    id: string
    name: string
  } | null
}

interface ActivityLogListProps {
  teamId: string
  initialLogs: ActivityLog[]
}

const activityMessages: Record<ActivityLogType, (log: ActivityLog) => string> = {
  MEMBER_JOINED: (log) => `${log.target_user?.name || '멤버'}님이 팀에 참여했습니다`,
  MEMBER_LEFT: (log) => `${log.target_user?.name || '멤버'}님이 팀에서 탈퇴했습니다`,
  MEMBER_REMOVED: (log) => `${log.target_user?.name || '멤버'}님이 팀에서 제거되었습니다`,
  ROLE_CHANGED: (log) => {
    const metadata = log.metadata as { old_role?: string; new_role?: string } | null
    const newRoleLabel = metadata?.new_role === 'ADMIN' ? '관리자' : metadata?.new_role === 'OWNER' ? '소유자' : '멤버'
    return `${log.target_user?.name || '멤버'}님의 역할이 ${newRoleLabel}로 변경되었습니다`
  },
  PROJECT_CREATED: (log) => {
    const metadata = log.metadata as { project_name?: string } | null
    return `프로젝트 "${metadata?.project_name || '새 프로젝트'}"가 생성되었습니다`
  },
  PROJECT_DELETED: (log) => {
    const metadata = log.metadata as { project_name?: string } | null
    return `프로젝트 "${metadata?.project_name || '프로젝트'}"가 삭제되었습니다`
  },
  PROJECT_ARCHIVED: (log) => {
    const metadata = log.metadata as { project_name?: string } | null
    return `프로젝트 "${metadata?.project_name || '프로젝트'}"가 아카이브되었습니다`
  },
  TEAM_UPDATED: (log) => {
    const metadata = log.metadata as { name?: string } | null
    return `팀 정보가 수정되었습니다${metadata?.name ? ` (${metadata.name})` : ''}`
  },
}

export function ActivityLogList({ teamId, initialLogs }: ActivityLogListProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialLogs.length >= 20)

  async function loadMore() {
    setLoading(true)
    try {
      const newLogs = await getTeamActivityLogs(teamId, 20, logs.length)
      setLogs([...logs, ...newLogs])
      if (newLogs.length < 20) {
        setHasMore(false)
      }
    } catch {
      // error handling
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          활동 로그
        </CardTitle>
        <CardDescription>
          팀의 최근 활동 내역입니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            아직 활동 로그가 없습니다
          </p>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3">
                {log.user?.profile_image ? (
                  <img
                    src={log.user.profile_image}
                    alt={log.user.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">
                      {log.user?.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{log.user?.name || '알 수 없음'}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {activityMessages[log.activity_type](log)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(log.created_at)}
                  </p>
                </div>
              </div>
            ))}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={loadMore} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  더 보기
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
