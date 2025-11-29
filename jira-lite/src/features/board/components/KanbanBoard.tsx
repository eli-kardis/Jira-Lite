'use client'

import { useState, useMemo, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { CreateIssueDialog } from './CreateIssueDialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { queryKeys } from '@/lib/query/keys'
import { useUpdateIssueStatus } from '@/features/board/hooks/use-update-issue-status'

interface Status {
  id: string
  name: string
  color: string | null
  position: number
  wip_limit: number | null
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

interface KanbanBoardProps {
  projectId: string
  teamId: string
  statuses: Status[]
  issues: Issue[]
  labels: Label[]
  teamMembers: TeamMember[]
  isArchived: boolean
}

export function KanbanBoard({
  projectId,
  teamId,
  statuses,
  issues: initialIssues,
  labels,
  teamMembers,
  isArchived,
}: KanbanBoardProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const dndContextId = useId()

  // React Query로 이슈 관리 - 초기 데이터로 캐시 초기화
  const { data: issues = initialIssues } = useQuery({
    queryKey: queryKeys.issues.byProject(projectId),
    queryFn: () => initialIssues,
    initialData: initialIssues,
    staleTime: Infinity, // SSR 데이터 우선 사용
  })

  // initialIssues가 변경되면 캐시 업데이트 (서버 데이터 반영)
  useEffect(() => {
    queryClient.setQueryData(queryKeys.issues.byProject(projectId), initialIssues)
  }, [initialIssues, projectId, queryClient])

  // useMutation 훅 사용
  const updateStatusMutation = useUpdateIssueStatus(projectId)

  const handleIssueClick = (issueId: string) => {
    router.push(`/teams/${teamId}/projects/${projectId}/issues/${issueId}`, { scroll: false })
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const issuesByStatus = useMemo(() => {
    const grouped: Record<string, Issue[]> = {}
    statuses.forEach((status) => {
      grouped[status.id] = issues
        .filter((issue) => issue.status_id === status.id)
        .sort((a, b) => a.position - b.position)
    })
    return grouped
  }, [issues, statuses])

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const issue = issues.find((i) => i.id === active.id)
    setActiveIssue(issue || null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveIssue(null)

    if (!over) return

    const draggedIssue = issues.find((i) => i.id === active.id)
    if (!draggedIssue) return

    const overId = over.id as string

    // 컬럼(상태)으로 드롭된 경우
    const targetStatus = statuses.find((s) => s.id === overId)
    // 다른 이슈 위에 드롭된 경우
    const overIssue = issues.find((i) => i.id === overId)
    const targetStatusId = targetStatus?.id || overIssue?.status_id

    if (!targetStatusId) return

    const targetStatusIssues = issuesByStatus[targetStatusId] || []
    let newPosition: number

    if (overIssue) {
      // 다른 이슈 위에 드롭
      const overIndex = targetStatusIssues.findIndex((i) => i.id === overIssue.id)
      newPosition = overIndex
    } else {
      // 컬럼 자체에 드롭 (맨 아래로)
      newPosition = targetStatusIssues.length
    }

    // useMutation 호출 (낙관적 업데이트 자동 적용)
    updateStatusMutation.mutate({
      issueId: draggedIssue.id,
      statusId: targetStatusId,
      position: newPosition,
    })
  }

  return (
    <div className="space-y-4">
      {!isArchived && (
        <div className="flex justify-end">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            새 이슈
          </Button>
        </div>
      )}

      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {statuses.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              issues={issuesByStatus[status.id] || []}
              onIssueClick={handleIssueClick}
              isArchived={isArchived}
            />
          ))}
        </div>

        <DragOverlay>
          {activeIssue ? (
            <KanbanCard issue={activeIssue} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

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
