import { createClient } from '@/lib/supabase/server'

// AI 기능별 요청 제한 설정
export const AI_RATE_LIMITS = {
  summary: { requests: 10, windowMinutes: 60 },      // 시간당 10회
  suggestion: { requests: 20, windowMinutes: 60 },   // 시간당 20회
  labels: { requests: 15, windowMinutes: 60 },       // 시간당 15회
  duplicates: { requests: 10, windowMinutes: 60 },   // 시간당 10회
  comments: { requests: 15, windowMinutes: 60 },     // 시간당 15회
} as const

export type AIFeatureType = keyof typeof AI_RATE_LIMITS

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

// DB 기반 Rate Limiter (Serverless 호환)
export async function checkRateLimit(
  userId: string,
  feature: AIFeatureType
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const limit = AI_RATE_LIMITS[feature]
  const windowStart = new Date(Date.now() - limit.windowMinutes * 60 * 1000)

  // 최근 요청 수 조회
  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('feature', feature)
    .gte('created_at', windowStart.toISOString())

  const requestCount = count || 0
  const remaining = Math.max(0, limit.requests - requestCount)
  const allowed = remaining > 0

  return {
    allowed,
    remaining,
    resetAt: new Date(Date.now() + limit.windowMinutes * 60 * 1000),
  }
}

// 사용량 기록
export async function recordUsage(
  userId: string,
  feature: AIFeatureType,
  issueId?: string,
  tokensUsed?: number
): Promise<void> {
  const supabase = await createClient()

  await supabase.from('ai_usage_logs').insert({
    user_id: userId,
    feature,
    issue_id: issueId,
    tokens_used: tokensUsed || 0,
  })
}

// 사용량 통계 조회
export async function getUsageStats(userId: string): Promise<{
  today: number
  thisWeek: number
  thisMonth: number
}> {
  const supabase = await createClient()
  const now = new Date()

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [todayResult, weekResult, monthResult] = await Promise.all([
    supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekStart.toISOString()),
    supabase
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString()),
  ])

  return {
    today: todayResult.count || 0,
    thisWeek: weekResult.count || 0,
    thisMonth: monthResult.count || 0,
  }
}
