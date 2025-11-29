'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { IssueDetailContent, IssueDetailContentProps } from './IssueDetailContent'

interface IssueDetailPanelProps extends Omit<IssueDetailContentProps, 'onClose' | 'onDelete'> {
  teamId: string
  projectId: string
}

export function IssueDetailPanel({
  issueId,
  projectId,
  teamId,
  labels,
  teamMembers,
  statuses,
  isArchived,
}: IssueDetailPanelProps) {
  const router = useRouter()

  const handleClose = useCallback(() => {
    router.push(`/teams/${teamId}/projects/${projectId}`, { scroll: false })
  }, [router, teamId, projectId])

  const handleDelete = useCallback(() => {
    router.push(`/teams/${teamId}/projects/${projectId}`, { scroll: false })
    router.refresh()
  }, [router, teamId, projectId])

  // ESC 키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  // 스크롤 잠금
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 사이드 패널 */}
      <aside
        className="fixed right-0 top-0 h-full w-[600px] max-w-[90vw] bg-background z-50 shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-label="이슈 상세"
      >
        <IssueDetailContent
          issueId={issueId}
          projectId={projectId}
          teamId={teamId}
          labels={labels}
          teamMembers={teamMembers}
          statuses={statuses}
          isArchived={isArchived}
          onClose={handleClose}
          onDelete={handleDelete}
        />
      </aside>
    </>
  )
}
