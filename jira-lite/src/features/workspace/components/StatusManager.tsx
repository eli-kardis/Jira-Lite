'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react'
import {
  getProjectStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  reorderStatuses,
} from '@/features/workspace/actions/project-actions'

interface Status {
  id: string
  name: string
  color: string
  position: number
  is_default: boolean
}

interface StatusManagerProps {
  projectId: string
}

const PRESET_COLORS = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
]

export function StatusManager({ projectId }: StatusManagerProps) {
  const [statuses, setStatuses] = useState<Status[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newStatusName, setNewStatusName] = useState('')
  const [newStatusColor, setNewStatusColor] = useState(PRESET_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStatuses()
  }, [projectId])

  const loadStatuses = async () => {
    setIsLoading(true)
    try {
      const data = await getProjectStatuses(projectId)
      setStatuses(data)
    } catch {
      setError('상태 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddStatus = async () => {
    if (!newStatusName.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const result = await createStatus(projectId, {
        name: newStatusName.trim(),
        color: newStatusColor,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.status) {
        setStatuses([...statuses, result.status])
        setNewStatusName('')
        setNewStatusColor(PRESET_COLORS[0])
      }
    } catch {
      setError('상태 추가에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, updates: Partial<Status>) => {
    setError(null)

    try {
      const result = await updateStatus(id, updates)
      if (result.error) {
        setError(result.error)
      } else {
        setStatuses(statuses.map(s => s.id === id ? { ...s, ...updates } : s))
      }
    } catch {
      setError('상태 수정에 실패했습니다.')
    }
  }

  const handleDeleteStatus = async (id: string) => {
    const status = statuses.find(s => s.id === id)
    if (status?.is_default) {
      setError('기본 상태는 삭제할 수 없습니다.')
      return
    }

    if (!confirm('이 상태를 삭제하시겠습니까? 해당 상태의 이슈는 첫 번째 상태로 이동됩니다.')) {
      return
    }

    setError(null)

    try {
      const result = await deleteStatus(id)
      if (result.error) {
        setError(result.error)
      } else {
        setStatuses(statuses.filter(s => s.id !== id))
      }
    } catch {
      setError('상태 삭제에 실패했습니다.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 기존 상태 목록 */}
      <div className="space-y-2">
        {statuses.map((status) => (
          <div
            key={status.id}
            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

            <div
              className="h-4 w-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: status.color }}
            />

            <Input
              value={status.name}
              onChange={(e) => handleUpdateStatus(status.id, { name: e.target.value })}
              className="flex-1"
            />

            <div className="flex gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleUpdateStatus(status.id, { color })}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${
                    status.color === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteStatus(status.id)}
              disabled={status.is_default}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* 새 상태 추가 */}
      <div className="border-t pt-4">
        <Label className="text-sm font-medium mb-2 block">새 상태 추가</Label>
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: newStatusColor }}
          />

          <Input
            value={newStatusName}
            onChange={(e) => setNewStatusName(e.target.value)}
            placeholder="상태 이름"
            className="flex-1"
          />

          <div className="flex gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewStatusColor(color)}
                className={`h-5 w-5 rounded-full border-2 transition-all ${
                  newStatusColor === color
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <Button
            onClick={handleAddStatus}
            disabled={!newStatusName.trim() || isSaving}
            size="sm"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
