'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateIssueDialog } from './CreateIssueDialog'
import { formatShortDate, getDaysUntil } from '@/lib/utils/date'
import { cn } from '@/lib/utils'
import { Plus, Search, AlertTriangle, AlertCircle, Calendar, CheckSquare } from 'lucide-react'

interface Status {
  id: string
  name: string
  color: string | null
}

interface Label {
  id: string
  name: string
  color: string
}

interface Issue {
  id: string
  title: string
  status_id: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  due_date: string | null
  position: number
  created_at: string
  assignee: {
    id: string
    name: string
    profile_image: string | null
  } | null
  issue_labels: {
    label_id: string
    labels: Label | null
  }[]
  subtasks: {
    id: string
    is_completed: boolean
  }[]
}

interface TeamMember {
  user_id: string
  profiles: {
    id: string
    name: string
    profile_image: string | null
  } | null
}

interface IssueListProps {
  projectId: string
  teamId: string
  statuses: Status[]
  issues: Issue[]
  labels: Label[]
  teamMembers: TeamMember[]
  isArchived: boolean
}

export function IssueList({
  projectId,
  teamId,
  statuses,
  issues,
  labels,
  teamMembers,
  isArchived,
}: IssueListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const handleIssueClick = (issueId: string) => {
    router.push(`/teams/${teamId}/projects/${projectId}/issues/${issueId}`, { scroll: false })
  }

  // 필터링
  let filteredIssues = issues.filter((issue) => {
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase())) {
      return false
    }
    if (filterStatus !== 'all' && issue.status_id !== filterStatus) {
      return false
    }
    if (filterPriority !== 'all' && issue.priority !== filterPriority) {
      return false
    }
    if (filterAssignee === 'unassigned' && issue.assignee) {
      return false
    }
    if (filterAssignee !== 'all' && filterAssignee !== 'unassigned' && issue.assignee?.id !== filterAssignee) {
      return false
    }
    return true
  })

  // 정렬
  filteredIssues = [...filteredIssues].sort((a, b) => {
    switch (sortBy) {
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'priority':
        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      case 'due_date':
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      default:
        return 0
    }
  })

  const getStatus = (statusId: string) => statuses.find((s) => s.id === statusId)

  const priorityConfig = {
    HIGH: { icon: AlertTriangle, color: 'text-red-500', label: '높음' },
    MEDIUM: { icon: AlertCircle, color: 'text-amber-500', label: '보통' },
    LOW: { icon: null, color: 'text-green-500', label: '낮음' },
  }

  return (
    <div className="space-y-4">
      {/* 필터 및 검색 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이슈 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.id} value={status.id}>
                {status.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="우선순위" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 우선순위</SelectItem>
            <SelectItem value="HIGH">높음</SelectItem>
            <SelectItem value="MEDIUM">보통</SelectItem>
            <SelectItem value="LOW">낮음</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="담당자" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 담당자</SelectItem>
            <SelectItem value="unassigned">담당자 없음</SelectItem>
            {teamMembers.map((member) =>
              member.profiles ? (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.profiles.name}
                </SelectItem>
              ) : null
            )}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="정렬" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created">생성일</SelectItem>
            <SelectItem value="priority">우선순위</SelectItem>
            <SelectItem value="due_date">마감일</SelectItem>
          </SelectContent>
        </Select>

        {!isArchived && (
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 이슈
          </Button>
        )}
      </div>

      {/* 이슈 목록 */}
      {filteredIssues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search || filterStatus !== 'all' || filterPriority !== 'all' || filterAssignee !== 'all'
            ? '조건에 맞는 이슈가 없습니다'
            : '아직 이슈가 없습니다'}
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredIssues.map((issue) => {
            const status = getStatus(issue.status_id)
            const priority = priorityConfig[issue.priority]
            const PriorityIcon = priority.icon
            const completedSubtasks = issue.subtasks.filter((s) => s.is_completed).length
            const daysUntil = issue.due_date ? getDaysUntil(issue.due_date) : null
            const isDueSoon = daysUntil !== null && daysUntil <= 1 && daysUntil >= 0
            const isOverdue = daysUntil !== null && daysUntil < 0

            return (
              <div
                key={issue.id}
                onClick={() => handleIssueClick(issue.id)}
                className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {PriorityIcon && (
                        <PriorityIcon className={cn('h-4 w-4 flex-shrink-0', priority.color)} />
                      )}
                      <h3 className="font-medium truncate">{issue.title}</h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {status && (
                        <Badge variant="outline" className="text-xs">
                          {status.color && (
                            <span
                              className="w-2 h-2 rounded-full mr-1"
                              style={{ backgroundColor: status.color }}
                            />
                          )}
                          {status.name}
                        </Badge>
                      )}

                      {issue.issue_labels.slice(0, 3).map((il) =>
                        il.labels ? (
                          <span
                            key={il.label_id}
                            className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: il.labels.color }}
                          >
                            {il.labels.name}
                          </span>
                        ) : null
                      )}

                      {issue.subtasks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {completedSubtasks}/{issue.subtasks.length}
                        </span>
                      )}

                      {issue.due_date && (
                        <span className={cn(
                          'flex items-center gap-1',
                          isOverdue && 'text-red-500',
                          isDueSoon && !isOverdue && 'text-amber-500'
                        )}>
                          <Calendar className="h-3 w-3" />
                          {formatShortDate(issue.due_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  {issue.assignee && (
                    <div className="flex-shrink-0" title={issue.assignee.name}>
                      {issue.assignee.profile_image ? (
                        <img
                          src={issue.assignee.profile_image}
                          alt={issue.assignee.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-[10px] font-medium">
                            {issue.assignee.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <CreateIssueDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={projectId}
        labels={labels}
        teamMembers={teamMembers}
      />
    </div>
  )
}
