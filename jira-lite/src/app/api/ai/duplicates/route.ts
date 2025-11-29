import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, parseJSONResponse } from '@/lib/ai/claude-client'
import { checkRateLimit, recordUsage } from '@/lib/ai/rate-limiter'
import { getDuplicateDetectionPrompt } from '@/lib/ai/prompts'

interface DuplicateResponse {
  duplicates: {
    id: string
    title: string
    similarity: number
    reason: string
  }[]
  isLikelyDuplicate: boolean
  recommendation: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { title, description, projectId, excludeIssueId } = await request.json()

    if (!title || !projectId) {
      return NextResponse.json({ error: '제목과 프로젝트 ID가 필요합니다' }, { status: 400 })
    }

    // Rate limit 확인
    const rateLimit = await checkRateLimit(user.id, 'duplicates')
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

    // 기존 이슈 목록 조회 (최근 100개)
    let query = supabase
      .from('issues')
      .select('id, title, description')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (excludeIssueId) {
      query = query.neq('id', excludeIssueId)
    }

    const { data: existingIssues } = await query

    if (!existingIssues || existingIssues.length === 0) {
      return NextResponse.json({
        duplicates: [],
        isLikelyDuplicate: false,
        recommendation: '비교할 기존 이슈가 없습니다'
      })
    }

    // 프롬프트 생성
    const { system, user: userPrompt } = getDuplicateDetectionPrompt(
      { title, description },
      existingIssues
    )

    // Claude API 호출
    const response = await callClaude(system, userPrompt, { maxTokens: 1024 })
    const result = parseJSONResponse<DuplicateResponse>(response)

    // 존재하는 이슈만 필터링
    const validIssueIds = new Set(existingIssues.map(i => i.id))
    result.duplicates = result.duplicates.filter(d => validIssueIds.has(d.id))

    // 사용량 기록
    await recordUsage(user.id, 'duplicates')

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI Duplicates Error:', error)
    return NextResponse.json(
      { error: 'AI 중복 감지에 실패했습니다' },
      { status: 500 }
    )
  }
}
