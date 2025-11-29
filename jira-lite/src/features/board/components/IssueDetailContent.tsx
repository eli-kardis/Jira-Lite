'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  updateIssue,
  deleteIssue,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  createComment,
  updateComment,
  deleteComment,
  getComments,
  getIssueHistory,
} from '@/features/board/actions/issue-actions'
import { toast } from 'sonner'
import { CalendarIcon, Trash2, Plus, X, Edit2, CheckSquare, MessageSquare } from 'lucide-react'
import { IssueDetailSkeleton } from './IssueDetailSkeleton'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase/client'
import { AIAssistant } from './AIAssistant'

interface Status {
  id: string
  name: string
  color: string | null
}

interface LabelType {
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

export interface IssueDetailContentProps {
  issueId: string
  projectId: string
  teamId: string
  labels: LabelType[]
  teamMembers: TeamMember[]
  statuses: Status[]
  isArchived: boolean
  onClose: () => void
  onDelete?: () => void
}

interface IssueData {
  id: string
  title: string
  description: string | null
  status_id: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  due_date: string | null
  assignee_id: string | null
  owner_id: string
  issue_labels: { label_id: string }[]
  subtasks: {
    id: string
    title: string
    is_completed: boolean
    position: number
  }[]
}

interface Comment {
  id: string
  content: string
  created_at: string
  updated_at: string
  user: {
    id: string
    name: string
    profile_image: string | null
  }
}

interface HistoryItem {
  id: string
  field_name: string
  old_value: string | null
  new_value: string | null
  created_at: string
  user: {
    id: string
    name: string
    profile_image: string | null
  }
}

export function IssueDetailContent({
  issueId,
  projectId,
  labels,
  teamMembers,
  statuses,
  isArchived,
  onClose,
  onDelete,
}: IssueDetailContentProps) {
  const [issue, setIssue] = useState<IssueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editedComment, setEditedComment] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>()
  const [selectedLabels, setSelectedLabels] = useState<string[]>([])

  const loadIssue = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data } = await supabase
      .from('issues')
      .select(`
        *,
        issue_labels (label_id),
        subtasks (id, title, is_completed, position)
      `)
      .eq('id', issueId)
      .single()

    if (data) {
      setIssue(data)
      setDueDate(data.due_date ? new Date(data.due_date) : undefined)
      setSelectedLabels(data.issue_labels.map((il: { label_id: string }) => il.label_id))
    }
    setLoading(false)
  }, [issueId])

  const loadComments = useCallback(async () => {
    const data = await getComments(issueId)
    setComments(data)
  }, [issueId])

  const loadHistory = useCallback(async () => {
    const data = await getIssueHistory(issueId)
    setHistory(data)
  }, [issueId])

  useEffect(() => {
    if (issueId) {
      loadIssue()
      loadComments()
      loadHistory()
    }
  }, [issueId, loadIssue, loadComments, loadHistory])

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isArchived) return

    setSaving(true)
    const formData = new FormData(e.currentTarget)

    if (dueDate) {
      formData.set('due_date', dueDate.toISOString().split('T')[0])
    } else {
      formData.set('due_date', '')
    }

    selectedLabels.forEach((labelId) => {
      formData.append('label_ids', labelId)
    })

    try {
      const result = await updateIssue(issueId, formData)
      if (result.success) {
        toast.success('이슈가 수정되었습니다')
        loadIssue()
        loadHistory()
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch {
      toast.error('이슈 수정에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const result = await deleteIssue(issueId)
    if (result.success) {
      toast.success('이슈가 삭제되었습니다')
      onDelete?.()
      onClose()
    } else if (result.error) {
      toast.error(result.error)
    }
  }

  async function handleAddSubtask() {
    if (!newSubtask.trim()) return

    const formData = new FormData()
    formData.set('title', newSubtask)

    const result = await createSubtask(issueId, formData)
    if (result.success) {
      setNewSubtask('')
      loadIssue()
    } else if (result.error) {
      toast.error(result.error)
    }
  }

  async function handleToggleSubtask(subtaskId: string, isCompleted: boolean) {
    const formData = new FormData()
    formData.set('is_completed', String(!isCompleted))

    await updateSubtask(subtaskId, formData)
    loadIssue()
  }

  async function handleDeleteSubtask(subtaskId: string) {
    await deleteSubtask(subtaskId)
    loadIssue()
  }

  async function handleAddComment() {
    if (!newComment.trim()) return

    const formData = new FormData()
    formData.set('content', newComment)

    const result = await createComment(issueId, formData)
    if (result.success) {
      setNewComment('')
      loadComments()
    } else if (result.error) {
      toast.error(result.error)
    }
  }

  async function handleUpdateComment(commentId: string) {
    if (!editedComment.trim()) return

    const formData = new FormData()
    formData.set('content', editedComment)

    const result = await updateComment(commentId, formData)
    if (result.success) {
      setEditingCommentId(null)
      loadComments()
    } else if (result.error) {
      toast.error(result.error)
    }
  }

  async function handleDeleteComment(commentId: string) {
    const result = await deleteComment(commentId)
    if (result.success) {
      loadComments()
    } else if (result.error) {
      toast.error(result.error)
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

  const fieldLabels: Record<string, string> = {
    title: '제목',
    status_id: '상태',
    assignee_id: '담당자',
    priority: '우선순위',
    due_date: '마감일',
  }

  if (loading) {
    return <IssueDetailSkeleton />
  }

  if (!issue) {
    return (
      <div className="flex items-center justify-center py-12 h-full">
        <p className="text-muted-foreground">이슈를 찾을 수 없습니다</p>
      </div>
    )
  }

  const sortedSubtasks = [...issue.subtasks].sort((a, b) => a.position - b.position)
  const completedCount = issue.subtasks.filter(s => s.is_completed).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">이슈 상세</h2>
          {isArchived && (
            <Badge variant="secondary" className="text-amber-600">읽기 전용</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <Tabs defaultValue="details" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 px-6 mt-4">
          <TabsTrigger value="details">상세</TabsTrigger>
          <TabsTrigger value="comments">
            댓글 ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="history">히스토리</TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1 px-6">
          <TabsContent value="details" className="mt-4 pb-6">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={issue.title}
                  disabled={isArchived || saving}
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={issue.description || ''}
                  disabled={isArchived || saving}
                  rows={4}
                  maxLength={5000}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>상태</Label>
                  <Select name="status_id" defaultValue={issue.status_id} disabled={isArchived}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>우선순위</Label>
                  <Select name="priority" defaultValue={issue.priority} disabled={isArchived}>
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
                  <Label>담당자</Label>
                  <Select name="assignee_id" defaultValue={issue.assignee_id || ''} disabled={isArchived}>
                    <SelectTrigger>
                      <SelectValue placeholder="담당자 없음" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">담당자 없음</SelectItem>
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
                        disabled={isArchived}
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
              </div>

              {labels.length > 0 && (
                <div className="space-y-2">
                  <Label>라벨</Label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => !isArchived && toggleLabel(label.id)}
                        disabled={isArchived}
                        className={cn(
                          'text-xs px-2 py-1 rounded-full border-2 transition-colors',
                          selectedLabels.includes(label.id)
                            ? 'border-current'
                            : 'border-transparent',
                          isArchived && 'opacity-50 cursor-not-allowed'
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

              <Separator />

              {/* AI 어시스턴트 */}
              <AIAssistant
                issueId={issueId}
                projectId={projectId}
                hasComments={comments.length > 0}
              />

              <Separator />

              {/* 서브태스크 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" />
                    서브태스크
                    {issue.subtasks.length > 0 && (
                      <span className="text-muted-foreground">
                        ({completedCount}/{issue.subtasks.length})
                      </span>
                    )}
                  </Label>
                </div>

                <div className="space-y-2">
                  {sortedSubtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 group">
                      <Checkbox
                        checked={subtask.is_completed}
                        onCheckedChange={() => handleToggleSubtask(subtask.id, subtask.is_completed)}
                        disabled={isArchived}
                      />
                      <span className={cn(
                        'flex-1 text-sm',
                        subtask.is_completed && 'line-through text-muted-foreground'
                      )}>
                        {subtask.title}
                      </span>
                      {!isArchived && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {!isArchived && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="새 서브태스크"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                      maxLength={200}
                    />
                    <Button type="button" size="icon" onClick={handleAddSubtask}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {!isArchived && (
                <div className="flex justify-between pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        삭제
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>이슈를 삭제하시겠습니까?</AlertDialogTitle>
                        <AlertDialogDescription>
                          이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                          삭제
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    저장
                  </Button>
                </div>
              )}
            </form>
          </TabsContent>

          <TabsContent value="comments" className="mt-4 pb-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                아직 댓글이 없습니다
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    {comment.user?.profile_image ? (
                      <img
                        src={comment.user.profile_image}
                        alt={comment.user.name}
                        className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">
                          {comment.user?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.user?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      {editingCommentId === comment.id ? (
                        <div className="mt-1 space-y-2">
                          <Textarea
                            value={editedComment}
                            onChange={(e) => setEditedComment(e.target.value)}
                            rows={2}
                            maxLength={1000}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                              저장
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingCommentId(null)}
                            >
                              취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                      )}
                    </div>
                    {!isArchived && editingCommentId !== comment.id && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingCommentId(comment.id)
                            setEditedComment(comment.content)
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isArchived && (
              <div className="flex gap-2 pt-4 border-t">
                <Textarea
                  placeholder="댓글 작성..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  maxLength={1000}
                />
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 pb-6">
            {history.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                변경 기록이 없습니다
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="flex gap-3 text-sm">
                    {item.user?.profile_image ? (
                      <img
                        src={item.user.profile_image}
                        alt={item.user.name}
                        className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-medium">
                          {item.user?.name?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div>
                      <p>
                        <span className="font-medium">{item.user?.name}</span>
                        {' '}
                        <span className="text-muted-foreground">
                          {fieldLabels[item.field_name] || item.field_name}을(를) 변경함
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.old_value || '없음'} → {item.new_value || '없음'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  )
}
