'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { updateTeam, deleteTeam, leaveTeam } from '@/features/workspace/actions/team-actions'
import { toast } from 'sonner'
import { Loader2, Trash2, LogOut } from 'lucide-react'

interface TeamSettingsFormProps {
  teamId: string
  teamName: string
  isOwner: boolean
}

export function TeamSettingsForm({ teamId, teamName, isOwner }: TeamSettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  async function handleUpdate(formData: FormData) {
    setLoading(true)
    try {
      const result = await updateTeam(teamId, formData)
      if (result.success) {
        toast.success('팀 정보가 수정되었습니다')
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setDeleteLoading(true)
    try {
      const result = await deleteTeam(teamId)
      if (!result.success && result.error) {
        toast.error(result.error)
      }
    } catch {
      // redirect
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleLeave() {
    setLeaveLoading(true)
    try {
      const result = await leaveTeam(teamId)
      if (!result.success && result.error) {
        toast.error(result.error)
      }
    } catch {
      // redirect
    } finally {
      setLeaveLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>팀 정보</CardTitle>
          <CardDescription>팀 이름을 수정할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">팀 이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                defaultValue={teamName}
                required
                disabled={loading}
                maxLength={50}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-600">위험 구역</CardTitle>
          <CardDescription>
            {isOwner
              ? '팀을 삭제하면 모든 프로젝트와 이슈가 함께 삭제됩니다'
              : '팀에서 탈퇴하면 더 이상 팀의 프로젝트에 접근할 수 없습니다'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isOwner ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  팀 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말로 팀을 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    이 작업은 되돌릴 수 없습니다. 팀과 관련된 모든 프로젝트, 이슈, 댓글이 삭제됩니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  팀 탈퇴
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>정말로 팀에서 탈퇴하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    탈퇴 후에는 팀의 프로젝트와 이슈에 접근할 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleLeave}
                    disabled={leaveLoading}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {leaveLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    탈퇴
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
