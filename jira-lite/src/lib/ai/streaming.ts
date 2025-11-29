import { getClaudeClient } from './claude-client'

// 스트리밍 Claude 응답 생성
export async function streamClaudeResponse(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
) {
  const client = getClaudeClient()

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  // ReadableStream 생성
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            // Vercel AI SDK 호환 형식으로 인코딩
            const text = event.delta.text
            const encoded = new TextEncoder().encode(`0:${JSON.stringify(text)}\n`)
            controller.enqueue(encoded)
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
