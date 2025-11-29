'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toggleFavorite } from '@/features/workspace/actions/project-actions'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  projectId: string
  isFavorite: boolean
}

export function FavoriteButton({ projectId, isFavorite: initialFavorite }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite)
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    setIsFavorite(!isFavorite) // 낙관적 업데이트

    try {
      const result = await toggleFavorite(projectId)
      if (!result.success) {
        setIsFavorite(isFavorite) // 롤백
      }
    } catch {
      setIsFavorite(isFavorite) // 롤백
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      className="h-8 w-8"
    >
      <Star
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorite ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'
        )}
      />
    </Button>
  )
}
