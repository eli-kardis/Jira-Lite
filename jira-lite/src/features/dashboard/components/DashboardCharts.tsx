'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { BarChart3, PieChartIcon } from 'lucide-react'

interface DashboardChartsProps {
  statusCounts: Record<string, number>
  priorityCounts: {
    HIGH: number
    MEDIUM: number
    LOW: number
  }
}

const STATUS_COLORS: Record<string, string> = {
  'Backlog': '#94a3b8',
  '진행 중': '#3b82f6',
  '완료': '#22c55e',
  '검토 중': '#f59e0b',
  '보류': '#ef4444',
}

const PRIORITY_DATA_CONFIG = [
  { key: 'HIGH', name: '높음', color: '#ef4444' },
  { key: 'MEDIUM', name: '보통', color: '#f59e0b' },
  { key: 'LOW', name: '낮음', color: '#22c55e' },
]

export function DashboardCharts({ statusCounts, priorityCounts }: DashboardChartsProps) {
  // 상태별 데이터
  const statusData = Object.entries(statusCounts).map(([name, count]) => ({
    name,
    value: count,
    color: STATUS_COLORS[name] || '#94a3b8',
  }))

  // 우선순위별 데이터
  const priorityData = PRIORITY_DATA_CONFIG.map(({ key, name, color }) => ({
    name,
    count: priorityCounts[key as keyof typeof priorityCounts] || 0,
    color,
  }))

  const totalIssues = Object.values(statusCounts).reduce((a, b) => a + b, 0)
  const totalPriority = priorityData.reduce((a, b) => a + b.count, 0)

  // 데이터가 없으면 표시하지 않음
  if (totalIssues === 0 && totalPriority === 0) {
    return null
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* 상태별 분포 (파이 차트) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            상태별 이슈 분포
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalIssues === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터가 없습니다
            </p>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}개`, '이슈']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 우선순위별 분포 (바 차트) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            우선순위별 이슈
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalPriority === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터가 없습니다
            </p>
          ) : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} layout="vertical">
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={50}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}개`, '이슈']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
