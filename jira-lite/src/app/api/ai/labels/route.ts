import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, parseJSONResponse } from '@/lib/ai/claude-client'
import { checkRateLimit, recordUsage } from '@/lib/ai/rate-limiter'
import { getLabelSuggestionPrompt } from '@/lib/ai/prompts'
import { getFromCache, setCache } from '@/lib/ai/cache'

interface LabelSuggestionResponse {
  suggestedLabels: {
    id: string
    name: string
    confidence: number
  }[]
  reasoning: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { issueId, projectId } = await request.json()

    if (!issueId || !projectId) {
      return NextResponse.json({ error: '이슈 ID와 프로젝트 ID가 필요합니다' }, { status: 400 })
    }

    // Rate limit 확인
    const rateLimit = await checkRateLimit(user.id, 'labels')
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
    const cached = await getFromCache<LabelSuggestionResponse>('labels', issueId)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    // 이슈 정보 조회
    const { data: issue } = await supabase
      .from('issues')
      .select('id, title, description')
      .eq('id', issueId)
      .is('deleted_at', null)
      .single()

    if (!issue) {
      return NextResponse.json({ error: '이슈를 찾을 수 없습니다' }, { status: 404 })
    }

    // 프로젝트 라벨 목록 조회
    const { data: labels } = await supabase
      .from('labels')
      .select('id, name, color')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (!labels || labels.length === 0) {
      return NextResponse.json({
        suggestedLabels: [],
        reasoning: '프로젝트에 사용 가능한 라벨이 없습니다',
        cached: false
      })
    }

    // 프롬프트 생성
    const { system, user: userPrompt } = getLabelSuggestionPrompt(
      { title: issue.title, description: issue.description },
      labels
    )

    // Claude API 호출
    const response = await callClaude(system, userPrompt, { maxTokens: 512 })
    const suggestions = parseJSONResponse<LabelSuggestionResponse>(response)

    // 존재하는 라벨만 필터링
    const validLabelIds = new Set(labels.map(l => l.id))
    suggestions.suggestedLabels = suggestions.suggestedLabels.filter(
      s => validLabelIds.has(s.id)
    )

    // 사용량 기록
    await recordUsage(user.id, 'labels', issueId)

    // 캐시 저장
    await setCache('labels', suggestions, issueId)

    return NextResponse.json({ ...suggestions, cached: false })
  } catch (error) {
    console.error('AI Labels Error:', error)
    return NextResponse.json(
      { error: 'AI 라벨 추천에 실패했습니다' },
      { status: 500 }
    )
  }
}
