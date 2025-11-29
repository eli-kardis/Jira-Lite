'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createTeam } from '@/features/workspace/actions/team-actions'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function NewTeamPage() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      const result = await createTeam(formData)
      if (!result.success && result.error) {
        toast.error(result.error)
      }
    } catch {
      // redirect는 에러를 throw함
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          대시보드로 돌아가기
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>새 팀 만들기</CardTitle>
          <CardDescription>
            팀을 만들어 프로젝트를 함께 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">팀 이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="예: 개발팀"
                required
                disabled={loading}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                팀 이름은 1~50자 사이로 입력해주세요
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                팀 만들기
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
