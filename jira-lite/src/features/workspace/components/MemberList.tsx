'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { removeMember, changeMemberRole, transferOwnership } from '@/features/workspace/actions/team-actions'
import { toast } from 'sonner'
import { Loader2, UserMinus, Crown } from 'lucide-react'
import type { TeamRole } from '@/lib/supabase/types'

interface Member {
  id: string
  role: TeamRole
  joined_at: string
  profiles: {
    id: string
    name: string
    email: string
    profile_image: string | null
  } | null
}

interface MemberListProps {
  teamId: string
  members: Member[]
  currentUserRole: TeamRole
  currentUserId: string
}

export function MemberList({ teamId, members, currentUserRole, currentUserId }: MemberListProps) {
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null)
  const isOwner = currentUserRole === 'OWNER'

  async function handleRemoveMember(memberId: string) {
    setLoadingMemberId(memberId)
    try {
      const result = await removeMember(teamId, memberId)
      if (result.success) {
        toast.success('멤버가 팀에서 제거되었습니다')
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoadingMemberId(null)
    }
  }

  async function handleRoleChange(memberId: string, newRole: 'ADMIN' | 'MEMBER') {
    setLoadingMemberId(memberId)
    try {
      const result = await changeMemberRole(teamId, memberId, newRole)
      if (result.success) {
        toast.success('역할이 변경되었습니다')
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoadingMemberId(null)
    }
  }

  async function handleTransferOwnership(userId: string) {
    setLoadingMemberId(userId)
    try {
      const result = await transferOwnership(teamId, userId)
      if (result.success) {
        toast.success('소유권이 이전되었습니다')
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoadingMemberId(null)
    }
  }

  const roleLabel = (role: TeamRole) => {
    switch (role) {
      case 'OWNER':
        return { label: '소유자', variant: 'default' as const }
      case 'ADMIN':
        return { label: '관리자', variant: 'secondary' as const }
      case 'MEMBER':
        return { label: '멤버', variant: 'outline' as const }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>팀 멤버</CardTitle>
        <CardDescription>
          {members.length}명의 멤버
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.map((member) => {
            const profile = member.profiles
            if (!profile) return null

            const isCurrentUser = profile.id === currentUserId
            const isMemberOwner = member.role === 'OWNER'
            const canManage = isOwner && !isCurrentUser && !isMemberOwner
            const canRemove =
              (!isCurrentUser && isOwner) ||
              (currentUserRole === 'ADMIN' && member.role === 'MEMBER' && !isCurrentUser)

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {profile.profile_image ? (
                    <img
                      src={profile.profile_image}
                      alt={profile.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.name}</p>
                      {isCurrentUser && (
                        <span className="text-xs text-muted-foreground">(나)</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && !isCurrentUser && !isMemberOwner ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.id, value as 'ADMIN' | 'MEMBER')}
                      disabled={loadingMemberId === member.id}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">관리자</SelectItem>
                        <SelectItem value="MEMBER">멤버</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={roleLabel(member.role).variant}>
                      {roleLabel(member.role).label}
                    </Badge>
                  )}

                  {isOwner && !isCurrentUser && !isMemberOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="소유권 이전">
                          <Crown className="h-4 w-4 text-amber-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>소유권을 이전하시겠습니까?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {profile.name}님에게 팀 소유권을 이전합니다.
                            이전 후 본인은 관리자 역할로 변경됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleTransferOwnership(profile.id)}
                            disabled={loadingMemberId === profile.id}
                          >
                            {loadingMemberId === profile.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            이전
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {canRemove && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="강제 퇴장">
                          <UserMinus className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>멤버를 강제 퇴장시키시겠습니까?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {profile.name}님을 팀에서 제거합니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={loadingMemberId === member.id}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            {loadingMemberId === member.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            퇴장
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
