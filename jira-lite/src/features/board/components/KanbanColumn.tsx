'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'
import { cn } from '@/lib/utils'

interface Status {
  id: string
  name: string
  color: string | null
  position: number
  wip_limit: number | null
}

interface Issue {
  id: string
  title: string
  status_id: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  due_date: string | null
  position: number
  assignee: {
    id: string
    name: string
    profile_image: string | null
  } | null
  issue_labels: {
    label_id: string
    labels: {
      id: string
      name: string
      color: string
    } | null
  }[]
  subtasks: {
    id: string
    is_completed: boolean
  }[]
}

interface KanbanColumnProps {
  status: Status
  issues: Issue[]
  onIssueClick: (id: string) => void
  isArchived: boolean
}

export function KanbanColumn({ status, issues, onIssueClick, isArchived }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  })

  const issueCount = issues.length
  const isOverLimit = status.wip_limit !== null && issueCount > status.wip_limit

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 bg-slate-100 dark:bg-slate-800 rounded-lg',
        isOver && 'ring-2 ring-blue-500'
      )}
    >
      {/* 컬럼 헤더 */}
      <div
        className={cn(
          'p-3 border-b border-slate-200 dark:border-slate-700 rounded-t-lg',
          isOverLimit && 'bg-red-100 dark:bg-red-900/30'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: status.color }}
              />
            )}
            <h3 className="font-medium text-sm">{status.name}</h3>
          </div>
          <div className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            isOverLimit
              ? 'bg-red-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-muted-foreground'
          )}>
            {issueCount}
            {status.wip_limit !== null && `/${status.wip_limit}`}
          </div>
        </div>
        {isOverLimit && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            WIP 제한 초과
          </p>
        )}
      </div>

      {/* 이슈 목록 */}
      <div className="p-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        <SortableContext
          items={issues.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {issues.map((issue) => (
              <KanbanCard
                key={issue.id}
                issue={issue}
                onClick={() => onIssueClick(issue.id)}
                disabled={isArchived}
              />
            ))}
          </div>
        </SortableContext>

        {issues.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            이슈가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
