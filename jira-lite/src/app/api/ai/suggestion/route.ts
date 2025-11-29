import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, parseJSONResponse } from '@/lib/ai/claude-client'
import { checkRateLimit, recordUsage } from '@/lib/ai/rate-limiter'
import { getActionSuggestionPrompt } from '@/lib/ai/prompts'
import { getFromCache, setCache } from '@/lib/ai/cache'

interface SuggestionResponse {
  suggestions: {
    action: string
    reason: string
    priority: 'high' | 'medium' | 'low'
  }[]
  blockers: string[]
  estimatedEffort: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { issueId } = await request.json()

    if (!issueId) {
      return NextResponse.json({ error: '이슈 ID가 필요합니다' }, { status: 400 })
    }

    // Rate limit 확인
    const rateLimit = await checkRateLimit(user.id, 'suggestion')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          resetAt: rateLimit.resetAt,
          remaining: rateLimit.remaining
        },
        { status: 429 }
      )
    }

    // 캐시 확인
    const cached = await getFromCache<SuggestionResponse>('suggestion', issueId)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    // 이슈 정보 조회
    const { data: issue } = await supabase
      .from('issues')
      .select(`
        id, title, description, priority,
        statuses:status_id (name),
        subtasks (
          title, is_completed
        )
      `)
      .eq('id', issueId)
      .is('deleted_at', null)
      .single()

    if (!issue) {
      return NextResponse.json({ error: '이슈를 찾을 수 없습니다' }, { status: 404 })
    }

    // 프롬프트 생성
    const promptData = {
      title: issue.title,
      description: issue.description,
      status: (issue.statuses as { name: string } | null)?.name || '알 수 없음',
      priority: issue.priority,
      subtasks: (issue.subtasks as { title: string; is_completed: boolean }[]) || []
    }
    const { system, user: userPrompt } = getActionSuggestionPrompt(promptData)

    // Claude API 호출
    const response = await callClaude(system, userPrompt, { maxTokens: 1024 })
    const suggestions = parseJSONResponse<SuggestionResponse>(response)

    // 사용량 기록
    await recordUsage(user.id, 'suggestion', issueId)

    // 캐시 저장
    await setCache('suggestion', suggestions, issueId)

    return NextResponse.json({ ...suggestions, cached: false })
  } catch (error) {
    console.error('AI Suggestion Error:', error)
    return NextResponse.json(
      { error: 'AI 제안 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
