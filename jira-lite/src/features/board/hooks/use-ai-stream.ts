'use client'

import { useState, useCallback, useRef } from 'react'

interface UseAIStreamOptions {
  onComplete?: (result: string) => void
  onError?: (error: Error) => void
}

export function useAIStream(options?: UseAIStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamedText, setStreamedText] = useState('')
  const [error, setError] = useState<Error | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const startStream = useCallback(async (
    endpoint: string,
    body: object
  ) => {
    setIsStreaming(true)
    setStreamedText('')
    setError(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'AI 요청 실패')
      }

      // 캐시된 JSON 응답인 경우
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        const text = data.summary || data.suggestion || ''
        setStreamedText(text)
        setIsStreaming(false)
        optionsRef.current?.onComplete?.(text)
        return
      }

      // 스트리밍 응답 처리
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('Stream not available')

      let fullText = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        // Vercel AI SDK data stream 형식 파싱
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2))
              fullText += text
              setStreamedText(fullText)
            } catch {
              // JSON 파싱 실패 시 무시
            }
          }
        }
      }

      setIsStreaming(false)
      optionsRef.current?.onComplete?.(fullText)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      setIsStreaming(false)
      optionsRef.current?.onError?.(error)
    }
  }, [])

  const reset = useCallback(() => {
    setStreamedText('')
    setError(null)
  }, [])

  return {
    isStreaming,
    streamedText,
    error,
    startStream,
    reset,
  }
}
