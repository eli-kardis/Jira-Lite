'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import {
  getProjectLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} from '@/features/workspace/actions/project-actions'

interface LabelItem {
  id: string
  name: string
  color: string
}

interface LabelManagerProps {
  projectId: string
}

const PRESET_COLORS = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
]

export function LabelManager({ projectId }: LabelManagerProps) {
  const [labels, setLabels] = useState<LabelItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLabels()
  }, [projectId])

  const loadLabels = async () => {
    setIsLoading(true)
    try {
      const data = await getProjectLabels(projectId)
      setLabels(data)
    } catch {
      setError('라벨 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return

    setIsSaving(true)
    setError(null)

    try {
      const result = await createLabel(projectId, {
        name: newLabelName.trim(),
        color: newLabelColor,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.label) {
        setLabels([...labels, result.label])
        setNewLabelName('')
        setNewLabelColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)])
      }
    } catch {
      setError('라벨 추가에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateLabel = async (id: string, updates: Partial<LabelItem>) => {
    setError(null)

    try {
      const result = await updateLabel(id, updates)
      if (result.error) {
        setError(result.error)
      } else {
        setLabels(labels.map(l => l.id === id ? { ...l, ...updates } : l))
      }
    } catch {
      setError('라벨 수정에 실패했습니다.')
    }
  }

  const handleDeleteLabel = async (id: string) => {
    if (!confirm('이 라벨을 삭제하시겠습니까?')) {
      return
    }

    setError(null)

    try {
      const result = await deleteLabel(id)
      if (result.error) {
        setError(result.error)
      } else {
        setLabels(labels.filter(l => l.id !== id))
      }
    } catch {
      setError('라벨 삭제에 실패했습니다.')
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
      {/* 기존 라벨 목록 */}
      <div className="space-y-2">
        {labels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            아직 생성된 라벨이 없습니다.
          </p>
        ) : (
          labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              <div
                className="h-4 w-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: label.color }}
              />

              <Input
                value={label.name}
                onChange={(e) => handleUpdateLabel(label.id, { name: e.target.value })}
                className="flex-1"
              />

              <div className="flex gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleUpdateLabel(label.id, { color })}
                    className={`h-5 w-5 rounded-full border-2 transition-all ${
                      label.color === color
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
                onClick={() => handleDeleteLabel(label.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* 새 라벨 추가 */}
      <div className="border-t pt-4">
        <Label className="text-sm font-medium mb-2 block">새 라벨 추가</Label>
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: newLabelColor }}
          />

          <Input
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="라벨 이름"
            className="flex-1"
          />

          <div className="flex gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewLabelColor(color)}
                className={`h-5 w-5 rounded-full border-2 transition-all ${
                  newLabelColor === color
                    ? 'border-foreground scale-110'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <Button
            onClick={handleAddLabel}
            disabled={!newLabelName.trim() || isSaving}
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
