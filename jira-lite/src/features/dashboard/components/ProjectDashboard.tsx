'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from './StatCard'
import { getProjectDashboard } from '../actions/dashboard-actions'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { ListTodo, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

interface ProjectDashboardProps {
  projectId: string
}

const PRIORITY_COLORS = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
}

const STATUS_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#f43f5e',
  '#14b8a6',
  '#06b6d4',
]

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getProjectDashboard>>>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getProjectDashboard(projectId)
      setData(result)
      setLoading(false)
    }
    load()
  }, [projectId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
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

  const priorityData = [
    { name: '높음', value: data.byPriority.HIGH, color: PRIORITY_COLORS.HIGH },
    { name: '보통', value: data.byPriority.MEDIUM, color: PRIORITY_COLORS.MEDIUM },
    { name: '낮음', value: data.byPriority.LOW, color: PRIORITY_COLORS.LOW },
  ]

  return (
    <div className="space-y-6">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="전체 이슈"
          value={data.totalIssues}
          icon={ListTodo}
        />
        <StatCard
          title="완료됨"
          value={data.byStatus.find(s => s.name === '완료')?.count || 0}
          icon={CheckCircle}
        />
        <StatCard
          title="마감 임박"
          value={data.dueSoon}
          description="3일 이내"
          icon={Clock}
        />
        <StatCard
          title="기한 초과"
          value={data.overdue}
          icon={AlertTriangle}
          className={data.overdue > 0 ? 'border-red-500' : undefined}
        />
      </div>

      {/* 차트 섹션 */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* 상태별 이슈 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">상태별 이슈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {data.byStatus.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 우선순위별 이슈 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">우선순위별 이슈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={priorityData.filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 생성 추이 */}
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
