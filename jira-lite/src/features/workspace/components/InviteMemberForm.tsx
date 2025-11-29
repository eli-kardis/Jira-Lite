'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { inviteMember } from '@/features/workspace/actions/team-actions'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

interface InviteMemberFormProps {
  teamId: string
}

export function InviteMemberForm({ teamId }: InviteMemberFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      const result = await inviteMember(teamId, formData)
      if (result.success) {
        toast.success('초대를 발송했습니다')
        // 폼 리셋
        const form = document.getElementById('invite-form') as HTMLFormElement
        form?.reset()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          멤버 초대
        </CardTitle>
        <CardDescription>
          이메일 주소로 팀원을 초대하세요. 초대는 7일간 유효합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="invite-form" action={handleSubmit} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="email" className="sr-only">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="team@example.com"
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            초대
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
