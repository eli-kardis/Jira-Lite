'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createProject } from '@/features/workspace/actions/project-actions'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ teamId: string }>
}

export default function NewProjectPage({ params }: PageProps) {
  const { teamId } = use(params)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      const result = await createProject(teamId, formData)
      if (!result.success && result.error) {
        toast.error(result.error)
      }
    } catch {
      // redirect
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/teams/${teamId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          팀으로 돌아가기
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>새 프로젝트 만들기</CardTitle>
          <CardDescription>
            프로젝트를 만들어 이슈를 관리하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">프로젝트 이름</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="예: 웹사이트 리뉴얼"
                required
                disabled={loading}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="프로젝트에 대한 간단한 설명"
                disabled={loading}
                maxLength={2000}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                최대 2000자
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              프로젝트 만들기
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
