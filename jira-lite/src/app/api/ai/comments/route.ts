import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callClaude, parseJSONResponse } from '@/lib/ai/claude-client'
import { checkRateLimit, recordUsage } from '@/lib/ai/rate-limiter'
import { getCommentSummaryPrompt } from '@/lib/ai/prompts'
import { getFromCache, setCache } from '@/lib/ai/cache'

interface CommentSummaryResponse {
  summary: string
  keyPoints: string[]
  decisions: string[]
  openQuestions: string[]
  participants: string[]
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
    const rateLimit = await checkRateLimit(user.id, 'comments')
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
    const cached = await getFromCache<CommentSummaryResponse>('comments', issueId)
    if (cached) {
      return NextResponse.json({ ...cached, cached: true })
    }

    // 댓글 목록 조회
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        content,
        created_at,
        profiles:author_id (name)
      `)
      .eq('issue_id', issueId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (!comments || comments.length === 0) {
      return NextResponse.json({
        summary: '댓글이 없습니다',
        keyPoints: [],
        decisions: [],
        openQuestions: [],
        participants: [],
        cached: false
      })
    }

    if (comments.length < 3) {
      return NextResponse.json({
        summary: '댓글이 3개 미만이어서 요약이 필요하지 않습니다',
        keyPoints: [],
        decisions: [],
        openQuestions: [],
        participants: comments.map(c => (c.profiles as { name: string } | null)?.name || '알 수 없음'),
        cached: false
      })
    }

    // 프롬프트 생성
    const commentData = comments.map(c => ({
      author: (c.profiles as { name: string } | null)?.name || '알 수 없음',
      content: c.content,
      created_at: new Date(c.created_at).toLocaleString('ko-KR')
    }))
    const { system, user: userPrompt } = getCommentSummaryPrompt(commentData)

    // Claude API 호출
    const response = await callClaude(system, userPrompt, { maxTokens: 1024 })
    const result = parseJSONResponse<CommentSummaryResponse>(response)

    // 사용량 기록
    await recordUsage(user.id, 'comments', issueId)

    // 캐시 저장
    await setCache('comments', result, issueId)

    return NextResponse.json({ ...result, cached: false })
  } catch (error) {
    console.error('AI Comments Error:', error)
    return NextResponse.json(
      { error: 'AI 댓글 요약에 실패했습니다' },
      { status: 500 }
    )
  }
}
