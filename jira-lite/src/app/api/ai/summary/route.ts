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

    // 이슈 정보 조회
    const { data: issue } = await supabase
      .from('issues')
      .select(`
        id, title, description,
        comments (
          content,
          profiles:author_id (name)
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
      comments: (issue.comments as { content: string; profiles: { name: string } | null }[])?.map(c => ({
        content: c.content,
        author: c.profiles?.name || '알 수 없음'
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
