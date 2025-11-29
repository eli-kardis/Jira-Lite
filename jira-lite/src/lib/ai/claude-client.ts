import Anthropic from '@anthropic-ai/sdk'

// Claude API 클라이언트 (싱글톤)
let claudeClient: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY가 설정되지 않았습니다')
    }
    claudeClient = new Anthropic({ apiKey })
  }
  return claudeClient
}

export interface AIResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// Claude API 호출 래퍼
export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): Promise<string> {
  const client = getClaudeClient()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('예상치 못한 응답 형식입니다')
  }

  return content.text
}

// JSON 응답 파싱 헬퍼
export function parseJSONResponse<T>(text: string): T {
  // JSON 블록 추출 (```json ... ``` 형태 처리)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim()

  try {
    return JSON.parse(jsonStr) as T
  } catch {
    throw new Error('JSON 파싱에 실패했습니다')
  }
}
