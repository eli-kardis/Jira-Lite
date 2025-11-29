import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { streamClaudeResponse } from '@/lib/ai/streaming'
import { checkRateLimit, recordUsage } from '@/lib/ai/rate-limiter'
import { getIssueSummaryPrompt } from '@/lib/ai/prompts'
import { getFromCache, setCache } from '@/lib/ai/cache'

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
    const rateLimit = await checkRateLimit(user.id, 'summary')
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

    // 캐시 확인 - 캐시된 경우 JSON 응답
    const cached = await getFromCache<string>('summary', issueId)
    if (cached) {
      return NextResponse.json({ summary: cached, cached: true })
    }

    // 디버깅 로그 시작
    console.log('[AI Summary Debug] ============')
    console.log('[AI Summary Debug] 1. Input issueId:', issueId)
    console.log('[AI Summary Debug] 2. issueId type:', typeof issueId)
    console.log('[AI Summary Debug] 3. UUID format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issueId))
    console.log('[AI Summary Debug] 4. Current user.id:', user.id)

    // 이슈 정보 조회 (comments 조인 없이 먼저 테스트)
    const { data: issue, error: queryError } = await supabase
      .from('issues')
      .select('id, title, description')
      .eq('id', issueId)
      .is('deleted_at', null)
      .single()

    console.log('[AI Summary Debug] 5. DB Query Result:')
    console.log('[AI Summary Debug]    - data:', issue ? { id: issue.id, title: issue.title } : null)
    console.log('[AI Summary Debug]    - error:', JSON.stringify(queryError, null, 2))

    // 댓글은 별도 조회
    let comments: { content: string; user: { name: string } | null }[] = []
    if (issue) {
      const { data: commentsData } = await supabase
        .from('comments')
        .select('content, user:profiles!comments_user_id_fkey (name)')
        .eq('issue_id', issueId)
        .is('deleted_at', null)

      comments = (commentsData || []) as typeof comments
      console.log('[AI Summary Debug]    - comments count:', comments.length)
    }

    if (!issue) {
      // soft delete 확인 (deleted_at 필터 없이 재조회)
      const { data: rawIssue, error: rawError } = await supabase
        .from('issues')
        .select('id, deleted_at, project_id')
        .eq('id', issueId)
        .single()

      console.log('[AI Summary Debug] 6. Without deleted_at filter:')
      console.log('[AI Summary Debug]    - rawIssue:', rawIssue)
      console.log('[AI Summary Debug]    - rawError:', rawError)
      if (rawIssue) {
        console.log('[AI Summary Debug]    - Soft deleted?:', rawIssue.deleted_at !== null)
      }
      console.log('[AI Summary Debug] ============')

      return NextResponse.json({ error: '이슈를 찾을 수 없습니다' }, { status: 404 })
    }

    console.log('[AI Summary Debug] ============')

    // 프롬프트 생성
    const promptData = {
      title: issue.title,
      description: issue.description,
      comments: comments?.map(c => ({
        content: c.content,
        author: c.user?.name || '알 수 없음'
      }))
    }
    const { system, user: userPrompt } = getIssueSummaryPrompt(promptData)

    // 사용량 기록 (스트리밍 전에 기록)
    await recordUsage(user.id, 'summary', issueId)

    // 스트리밍 응답
    return streamClaudeResponse(system, userPrompt, { maxTokens: 512 })
  } catch (error) {
    console.error('AI Summary Error:', error)
    return NextResponse.json(
      { error: 'AI 요약 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
