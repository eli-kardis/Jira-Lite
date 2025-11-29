'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateIssueStatus } from '@/features/board/actions/issue-actions'
import { queryKeys } from '@/lib/query/keys'
import { toast } from 'sonner'

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

interface UpdateIssueStatusParams {
  issueId: string
  statusId: string
  position: number
}

interface MutationContext {
  previousIssues: Issue[] | undefined
  projectId: string
}

export function useUpdateIssueStatus(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ issueId, statusId, position }: UpdateIssueStatusParams) => {
      const result = await updateIssueStatus(issueId, statusId, position)
      if (!result.success) {
        throw new Error(result.error || '이슈 상태 변경에 실패했습니다')
      }
      return result
    },

    // 낙관적 업데이트: 서버 응답 전에 UI 먼저 업데이트
    onMutate: async ({ issueId, statusId, position }): Promise<MutationContext> => {
      // 진행 중인 쿼리 취소 (캐시 덮어쓰기 방지)
      await queryClient.cancelQueries({
        queryKey: queryKeys.issues.byProject(projectId),
      })

      // 이전 값 스냅샷
      const previousIssues = queryClient.getQueryData<Issue[]>(
        queryKeys.issues.byProject(projectId)
      )

      // 낙관적으로 캐시 업데이트
      queryClient.setQueryData<Issue[]>(
        queryKeys.issues.byProject(projectId),
        (old) => {
          if (!old) return old
          return old.map((issue) =>
            issue.id === issueId
              ? { ...issue, status_id: statusId, position }
              : issue
          )
        }
      )

      // 롤백을 위한 컨텍스트 반환
      return { previousIssues, projectId }
    },

    // 에러 발생 시 롤백
    onError: (err, _variables, context) => {
      if (context?.previousIssues) {
        queryClient.setQueryData(
          queryKeys.issues.byProject(context.projectId),
          context.previousIssues
        )
      }
      toast.error(err instanceof Error ? err.message : '이슈 이동에 실패했습니다')
    },

    // 성공/실패 관계없이 캐시 무효화
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.issues.byProject(projectId),
      })
    },
  })
}
