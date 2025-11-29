import { anthropic } from '@ai-sdk/anthropic'
import { streamText, generateObject } from 'ai'
import { z } from 'zod'

// ============================================
// AI Service Layer
// Vercel AI SDK + Claude API
// ============================================

const model = anthropic('claude-3-5-sonnet-20241022')

/**
 * 이슈 내용을 요약하여 스트리밍 반환
 */
export async function generateSummaryStream(text: string) {
  try {
    const result = streamText({
      model,
      system: '당신은 이슈 관리 시스템의 요약 전문가입니다. 주어진 이슈 내용을 간결하고 명확하게 요약해주세요.',
      prompt: `다음 이슈 내용을 3줄 이내로 요약해주세요:\n\n${text}`,
    })
    return result
  } catch (error) {
    console.error('[AI Service] generateSummaryStream error:', error)
    return null
  }
}

/**
 * 이슈에 대한 해결 방안을 제안하여 스트리밍 반환
 */
export async function suggestSolutionStream(text: string) {
  try {
    const result = streamText({
      model,
      system: '당신은 소프트웨어 개발 문제 해결 전문가입니다. 주어진 이슈에 대해 실용적인 해결 방안을 제안해주세요.',
      prompt: `다음 이슈에 대한 해결 방안을 제안해주세요:\n\n${text}`,
    })
    return result
  } catch (error) {
    console.error('[AI Service] suggestSolutionStream error:', error)
    return null
  }
}

/**
 * 이슈 제목을 기반으로 자동 라벨 추천
 */
export async function getAutoLabels(title: string): Promise<string[]> {
  try {
    const { object } = await generateObject({
      model,
      schema: z.object({
        labels: z.array(z.string()).describe('이슈에 적합한 라벨 목록 (최대 3개)'),
      }),
      system: '당신은 이슈 분류 전문가입니다. 이슈 제목을 분석하여 적절한 라벨을 추천해주세요.',
      prompt: `다음 이슈 제목에 적합한 라벨을 최대 3개까지 추천해주세요. 가능한 라벨: bug, feature, enhancement, documentation, refactor, test, performance, security, ui, api\n\n제목: ${title}`,
    })
    return object.labels
  } catch (error) {
    console.error('[AI Service] getAutoLabels error:', error)
    return []
  }
}
