'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'
import { createIssue } from '@/features/board/actions/issue-actions'
import { toast } from 'sonner'
import { Loader2, CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Label {
  id: string
  name: string
  color: string
}

interface TeamMember {
  user_id: string
  profiles: {
    id: string
    name: string
    profile_image: string | null
  } | null
}

interface CreateIssueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  labels: Label[]
  teamMembers: TeamMember[]
}

export function CreateIssueDialog({
  open,
  onOpenChange,
  projectId,
  labels,
  teamMembers,
}: CreateIssueDialogProps) {
  const [loading, setLoading] = useState(false)
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    if (dueDate) {
      formData.set('due_date', dueDate.toISOString().split('T')[0])
    }

    selectedLabels.forEach((labelId) => {
      formData.append('label_ids', labelId)
    })

    try {
      const result = await createIssue(projectId, formData)
      if (result.success) {
        toast.success('이슈가 생성되었습니다')
        onOpenChange(false)
        setDueDate(undefined)
        setSelectedLabels([])
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('이슈 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  function toggleLabel(labelId: string) {
    setSelectedLabels((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : prev.length < 5
          ? [...prev, labelId]
          : prev
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 이슈 만들기</DialogTitle>
          <DialogDescription>
            이슈를 생성하여 작업을 추적하세요
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              name="title"
              placeholder="이슈 제목"
              required
              maxLength={200}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="이슈에 대한 상세 설명"
              rows={4}
              maxLength={5000}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">우선순위</Label>
              <Select name="priority" defaultValue="MEDIUM">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">높음</SelectItem>
                  <SelectItem value="MEDIUM">보통</SelectItem>
                  <SelectItem value="LOW">낮음</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">담당자</Label>
              <Select name="assignee_id">
                <SelectTrigger>
                  <SelectValue placeholder="담당자 선택" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) =>
                    member.profiles ? (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.profiles.name}
                      </SelectItem>
                    ) : null
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>마감일</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !dueDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP', { locale: ko }) : '날짜 선택'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  locale={ko}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {labels.length > 0 && (
            <div className="space-y-2">
              <Label>라벨 (최대 5개)</Label>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => toggleLabel(label.id)}
                    className={cn(
                      'text-xs px-2 py-1 rounded-full border-2 transition-colors',
                      selectedLabels.includes(label.id)
                        ? 'border-current'
                        : 'border-transparent'
                    )}
                    style={{
                      backgroundColor: selectedLabels.includes(label.id)
                        ? label.color
                        : `${label.color}40`,
                      color: selectedLabels.includes(label.id)
                        ? 'white'
                        : label.color,
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
