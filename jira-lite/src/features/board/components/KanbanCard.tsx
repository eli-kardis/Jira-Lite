'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatShortDate, getDaysUntil } from '@/lib/utils/date'
import { Calendar, CheckSquare, AlertTriangle, AlertCircle } from 'lucide-react'

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

interface KanbanCardProps {
  issue: Issue
  onClick?: () => void
  isDragging?: boolean
  disabled?: boolean
}

export function KanbanCard({ issue, onClick, isDragging, disabled }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: issue.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityConfig = {
    HIGH: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
    MEDIUM: { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    LOW: { icon: null, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
  }

  const priority = priorityConfig[issue.priority]
  const PriorityIcon = priority.icon

  const completedSubtasks = issue.subtasks.filter((s) => s.completed).length
  const totalSubtasks = issue.subtasks.length

  const daysUntil = issue.due_date ? getDaysUntil(issue.due_date) : null
  const isDueSoon = daysUntil !== null && daysUntil <= 1 && daysUntil >= 0
  const isOverdue = daysUntil !== null && daysUntil < 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-slate-900 rounded-md p-3 shadow-sm border cursor-pointer',
        'hover:shadow-md transition-shadow duration-150',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg',
        disabled && 'opacity-60 cursor-not-allowed'
      )}
    >
      {/* 라벨 */}
      {issue.issue_labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
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
          {issue.issue_labels.length > 3 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-muted-foreground">
              +{issue.issue_labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 제목 */}
      <p className="text-sm font-medium line-clamp-2 mb-2">{issue.title}</p>

      {/* 메타 정보 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {/* 우선순위 */}
          {PriorityIcon && (
            <PriorityIcon className={cn('h-3.5 w-3.5', priority.color)} />
          )}

          {/* 서브태스크 */}
          {totalSubtasks > 0 && (
            <div className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              <span>{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}

          {/* 마감일 */}
          {issue.due_date && (
            <div className={cn(
              'flex items-center gap-1',
              isOverdue && 'text-red-500',
              isDueSoon && !isOverdue && 'text-amber-500'
            )}>
              <Calendar className="h-3 w-3" />
              <span>{formatShortDate(issue.due_date)}</span>
            </div>
          )}
        </div>

        {/* 담당자 */}
        {issue.assignee && (
          issue.assignee.profile_image ? (
            <img
              src={issue.assignee.profile_image}
              alt={issue.assignee.name}
              className="h-5 w-5 rounded-full object-cover"
              title={issue.assignee.name}
            />
          ) : (
            <div
              className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center"
              title={issue.assignee.name}
            >
              <span className="text-[10px] font-medium">
                {issue.assignee.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
