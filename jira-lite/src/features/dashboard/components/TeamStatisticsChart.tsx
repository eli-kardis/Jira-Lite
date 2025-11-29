'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CommonBarChart } from './CommonBarChart'
import { getTeamStatistics } from '../actions/dashboard-actions'
import { BarChart3 } from 'lucide-react'

interface TeamStatisticsChartProps {
  teamId: string
  teamName: string
}

const STATUS_COLORS = ['#6366f1', '#f59e0b', '#22c55e']

export function TeamStatisticsChart({ teamId, teamName }: TeamStatisticsChartProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeamStatistics>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getTeamStatistics(teamId)
      setData(result)
      setLoading(false)
    }
    load()
  }, [teamId])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-40 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  // Empty State: 이슈가 없을 때
  if (data.totalIssues === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            아직 팀에 등록된 이슈가 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <CommonBarChart
      data={data.byStatus}
      title={`${teamName} 팀 이슈 현황`}
      colors={STATUS_COLORS}
      height={200}
    />
  )
}
