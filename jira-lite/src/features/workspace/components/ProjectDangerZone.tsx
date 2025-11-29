'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Archive, ArchiveRestore, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { archiveProject, unarchiveProject, deleteProject } from '@/features/workspace/actions/project-actions'

interface ProjectDangerZoneProps {
  projectId: string
  teamId: string
  isArchived: boolean
  isOwner: boolean
}

export function ProjectDangerZone({
  projectId,
  teamId,
  isArchived,
  isOwner,
}: ProjectDangerZoneProps) {
  const router = useRouter()
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleArchive = async () => {
    if (!confirm(isArchived
      ? '프로젝트를 복원하시겠습니까?'
      : '프로젝트를 아카이브하시겠습니까? 아카이브된 프로젝트는 편집할 수 없습니다.'
    )) {
      return
    }

    setIsArchiving(true)
    setError(null)

    try {
      const result = isArchived
        ? await unarchiveProject(projectId)
        : await archiveProject(projectId)

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
      }
    } catch {
      setError('프로젝트 상태 변경에 실패했습니다.')
    } finally {
      setIsArchiving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') {
      setError('삭제를 확인하려면 DELETE를 입력하세요.')
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const result = await deleteProject(projectId)
      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/teams/${teamId}`)
      }
    } catch {
      setError('프로젝트 삭제에 실패했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 아카이브 */}
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            {isArchived ? (
              <ArchiveRestore className="h-5 w-5" />
            ) : (
              <Archive className="h-5 w-5" />
            )}
            {isArchived ? '프로젝트 복원' : '프로젝트 아카이브'}
          </CardTitle>
          <CardDescription>
            {isArchived
              ? '아카이브된 프로젝트를 복원하여 다시 편집할 수 있게 합니다.'
              : '프로젝트를 아카이브하면 더 이상 편집할 수 없지만, 내용은 보존됩니다.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleArchive}
            disabled={isArchiving}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
          >
            {isArchiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isArchived ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                복원하기
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                아카이브하기
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 삭제 (소유자만) */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              프로젝트 삭제
            </CardTitle>
            <CardDescription>
              프로젝트와 모든 이슈가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                삭제를 확인하려면 아래에 <strong>DELETE</strong>를 입력하세요.
              </p>
              <Input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="max-w-xs"
              />
            </div>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirm !== 'DELETE'}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              프로젝트 영구 삭제
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
