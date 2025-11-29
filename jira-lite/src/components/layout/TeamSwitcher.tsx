'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserTeams } from '@/features/workspace/actions/team-actions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Users, ChevronDown, Plus, Check } from 'lucide-react'

type Team = {
  id: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
}

export function TeamSwitcher() {
  const params = useParams()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  const currentTeamId = params.teamId as string | undefined

  useEffect(() => {
    async function loadTeams() {
      try {
        const userTeams = await getUserTeams()
        setTeams(userTeams)
      } catch (error) {
        console.error('Failed to load teams:', error)
      } finally {
        setLoading(false)
      }
    }
    loadTeams()
  }, [])

  const currentTeam = teams.find(t => t.id === currentTeamId)

  const handleTeamSelect = (teamId: string) => {
    router.push(`/teams/${teamId}`)
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-2">
        <Users className="h-4 w-4" />
        <span className="hidden sm:inline">로딩...</span>
      </Button>
    )
  }

  if (teams.length === 0) {
    return (
      <Link href="/teams/new">
        <Button variant="ghost" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">팀 만들기</span>
        </Button>
      </Link>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline max-w-[120px] truncate">
            {currentTeam?.name || '팀 선택'}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-xs font-medium text-muted-foreground">내 팀</p>
        </div>
        {teams.map((team) => (
          <DropdownMenuItem
            key={team.id}
            onClick={() => handleTeamSelect(team.id)}
            className="cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="truncate max-w-[140px]">{team.name}</span>
            </div>
            {team.id === currentTeamId && (
              <Check className="h-4 w-4 text-blue-600" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/teams/new" className="cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            새 팀 만들기
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            대시보드
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
