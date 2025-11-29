'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from './StatCard'
import { getPersonalDashboard } from '../actions/dashboard-actions'
import { cn } from '@/lib/utils'
import { formatShortDate, getDaysUntil } from '@/lib/utils/date'
import {
  ListTodo,
  AlertTriangle,
  Clock,
  Calendar,
  MessageSquare,
} from 'lucide-react'

const PRIORITY_STYLES = {
  HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  LOW: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const PRIORITY_LABELS = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}

export function PersonalDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getPersonalDashboard>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getPersonalDashboard()
      setData(result)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) {
    return <p className="text-muted-foreground">데이터를 불러올 수 없습니다</p>
  }

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="할당된 이슈"
          value={data.totalAssigned}
          icon={ListTodo}
        />
        <StatCard
          title="진행 중"
          value={data.statusCounts['진행 중'] || 0}
          icon={Clock}
        />
        <StatCard
          title="마감 임박"
          value={data.dueSoon.length}
          description="3일 이내"
          icon={Calendar}
        />
        <StatCard
          title="기한 초과"
          value={data.overdue.length}
          icon={AlertTriangle}
          className={data.overdue.length > 0 ? 'border-red-500' : undefined}
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 내 이슈 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">내 이슈</CardTitle>
          </CardHeader>
          <CardContent>
            {data.myIssues.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                할당된 이슈가 없습니다
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {data.myIssues.slice(0, 10).map((issue) => {
                  const daysUntil = issue.due_date ? getDaysUntil(issue.due_date) : null
                  const isOverdue = daysUntil !== null && daysUntil < 0
                  const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3
                  const project = issue.projects as { name: string; team_id: string } | null
                  const issueUrl = project?.team_id
                    ? `/teams/${project.team_id}/projects/${issue.project_id}/issues/${issue.id}`
                    : '#'

                  return (
                    <Link
                      key={issue.id}
                      href={issueUrl}
                      className="block"
                    >
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{issue.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {project?.name}
                            </Badge>
                            <Badge className={cn('text-xs', PRIORITY_STYLES[issue.priority])}>
                              {PRIORITY_LABELS[issue.priority]}
                            </Badge>
                            {issue.due_date && (
                              <span className={cn(
                                'text-xs flex items-center gap-1',
                                isOverdue && 'text-red-500',
                                isDueSoon && !isOverdue && 'text-amber-500'
                              )}>
                                <Calendar className="h-3 w-3" />
                                {formatShortDate(issue.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기한 초과 이슈 */}
        <Card className={data.overdue.length > 0 ? 'border-red-300 dark:border-red-700' : ''}>
          <CardHeader>
            <CardTitle className={cn(
              'text-sm font-medium flex items-center gap-2',
              data.overdue.length > 0 && 'text-red-600'
            )}>
              <AlertTriangle className="h-4 w-4" />
              기한 초과 이슈
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                기한 초과 이슈가 없습니다
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {data.overdue.map((issue) => {
                  const project = issue.projects as { name: string; team_id: string } | null
                  const issueUrl = project?.team_id
                    ? `/teams/${project.team_id}/projects/${issue.project_id}/issues/${issue.id}`
                    : '#'

                  return (
                    <Link key={issue.id} href={issueUrl} className="block">
                      <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{issue.title}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {project?.name}
                            </Badge>
                            <Badge className={cn('text-xs', PRIORITY_STYLES[issue.priority])}>
                              {PRIORITY_LABELS[issue.priority]}
                            </Badge>
                            <span className="text-xs text-red-600 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatShortDate(issue.due_date!)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 댓글 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              최근 댓글
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentComments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                최근 활동이 없습니다
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {data.recentComments.map((comment) => {
                  const issue = comment.issue as {
                    id: string
                    title: string
                    project_id: string
                    project: { name: string; team_id: string } | null
                  } | null
                  const issueUrl = issue?.project?.team_id
                    ? `/teams/${issue.project.team_id}/projects/${issue.project_id}/issues/${issue.id}`
                    : '#'

                  return (
                    <Link key={comment.id} href={issueUrl} className="block">
                      <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer">
                        <p className="text-sm line-clamp-2">{comment.content}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{issue?.title}</span>
                          <span>·</span>
                          <span>{issue?.project?.name}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
