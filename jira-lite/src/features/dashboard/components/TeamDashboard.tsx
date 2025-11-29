'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from './StatCard'
import { getTeamDashboard } from '../actions/dashboard-actions'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { FolderKanban, ListTodo, Users } from 'lucide-react'

interface TeamDashboardProps {
  teamId: string
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#06b6d4']

export function TeamDashboard({ teamId }: TeamDashboardProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeamDashboard>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getTeamDashboard(teamId)
      setData(result)
      setLoading(false)
    }
    load()
  }, [teamId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (!data) {
    return <p className="text-muted-foreground">데이터를 불러올 수 없습니다</p>
  }

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="프로젝트"
          value={data.totalProjects}
          icon={FolderKanban}
        />
        <StatCard
          title="전체 이슈"
          value={data.totalIssues}
          icon={ListTodo}
        />
        <StatCard
          title="팀원"
          value={data.totalMembers}
          icon={Users}
        />
      </div>

      {/* 차트 섹션 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 프로젝트별 이슈 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">프로젝트별 이슈</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byProject.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                프로젝트가 없습니다
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byProject} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={12}
                    width={100}
                    tickFormatter={(value) =>
                      value.length > 12 ? `${value.substring(0, 12)}...` : value
                    }
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 멤버별 할당 이슈 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">멤버별 할당 이슈</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byMember.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                팀원이 없습니다
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byMember.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    fontSize={12}
                    width={80}
                    tickFormatter={(value) =>
                      value.length > 8 ? `${value.substring(0, 8)}...` : value
                    }
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 주간 생성 추이 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">최근 7일 이슈 생성 추이</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.createdTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  fontSize={12}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}/${date.getDate()}`
                  }}
                />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value)
                    return `${date.getMonth() + 1}월 ${date.getDate()}일`
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
