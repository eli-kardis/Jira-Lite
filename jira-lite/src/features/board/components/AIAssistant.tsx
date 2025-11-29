'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sparkles,
  FileText,
  Lightbulb,
  Tags,
  MessageSquare,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAIStream } from '../hooks/use-ai-stream'
import { toast } from 'sonner'

interface AIAssistantProps {
  issueId: string
  projectId: string
  hasComments: boolean
}

interface SuggestionItem {
  action: string
  reason: string
  priority: 'high' | 'medium' | 'low'
}

interface LabelSuggestion {
  id: string
  name: string
  confidence: number
}

interface CommentSummary {
  summary: string
  keyPoints: string[]
  decisions: string[]
  openQuestions: string[]
  participants: string[]
}

export function AIAssistant({ issueId, projectId, hasComments }: AIAssistantProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeFeature, setActiveFeature] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 스트리밍 훅 (요약 전용)
  const summaryStream = useAIStream({
    onComplete: () => setLoading(null),
    onError: (err) => {
      setError(err.message)
      setLoading(null)
    },
  })

  // 비스트리밍 결과 상태
  const [suggestions, setSuggestions] = useState<{
    suggestions: SuggestionItem[]
    blockers: string[]
    estimatedEffort: string
  } | null>(null)
  const [labelSuggestions, setLabelSuggestions] = useState<{
    suggestedLabels: LabelSuggestion[]
    reasoning: string
  } | null>(null)
  const [commentSummary, setCommentSummary] = useState<CommentSummary | null>(null)

  async function fetchAI(feature: string, endpoint: string, body: object) {
    setLoading(feature)
    setError(null)
    setActiveFeature(feature)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '요청에 실패했습니다')
      }

      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
      return null
    } finally {
      setLoading(null)
    }
  }

  // 요약 - 스트리밍 방식
  function handleSummary() {
    setActiveFeature('summary')
    setError(null)
    setLoading('summary')
    summaryStream.startStream('/api/ai/summary', { issueId })
  }

  // 제안 - 비스트리밍 (JSON 응답)
  async function handleSuggestion() {
    const data = await fetchAI('suggestion', '/api/ai/suggestion', { issueId })
    if (data) setSuggestions(data)
  }

  // 라벨 - 비스트리밍 (JSON 응답)
  async function handleLabels() {
    const data = await fetchAI('labels', '/api/ai/labels', { issueId, projectId })
    if (data) setLabelSuggestions(data)
  }

  // 댓글 요약 - 비스트리밍 (JSON 응답)
  async function handleComments() {
    const data = await fetchAI('comments', '/api/ai/comments', { issueId })
    if (data) setCommentSummary(data)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('클립보드에 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  const priorityColors = {
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  }

  const isAnyLoading = loading !== null || summaryStream.isStreaming

  return (
    <Card className="border-purple-200 dark:border-purple-800">
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span>AI 어시스턴트</span>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0">
          {/* AI 기능 버튼들 */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={activeFeature === 'summary' ? 'default' : 'outline'}
              onClick={handleSummary}
              disabled={isAnyLoading}
            >
              {loading === 'summary' || summaryStream.isStreaming ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <FileText className="mr-1 h-3 w-3" />
              )}
              요약
            </Button>

            <Button
              size="sm"
              variant={activeFeature === 'suggestion' ? 'default' : 'outline'}
              onClick={handleSuggestion}
              disabled={isAnyLoading}
            >
              {loading === 'suggestion' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Lightbulb className="mr-1 h-3 w-3" />
              )}
              다음 액션
            </Button>

            <Button
              size="sm"
              variant={activeFeature === 'labels' ? 'default' : 'outline'}
              onClick={handleLabels}
              disabled={isAnyLoading}
            >
              {loading === 'labels' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Tags className="mr-1 h-3 w-3" />
              )}
              라벨 추천
            </Button>

            <Button
              size="sm"
              variant={activeFeature === 'comments' ? 'default' : 'outline'}
              onClick={handleComments}
              disabled={isAnyLoading || !hasComments}
              title={!hasComments ? '댓글이 없습니다' : undefined}
            >
              {loading === 'comments' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <MessageSquare className="mr-1 h-3 w-3" />
              )}
              댓글 요약
            </Button>
          </div>

          {/* 에러 표시 */}
          {(error || summaryStream.error) && (
            <div className="flex items-center gap-2 text-sm text-red-500 mb-4">
              <AlertCircle className="h-4 w-4" />
              {error || summaryStream.error?.message}
            </div>
          )}

          {/* 결과 표시 영역 */}
          <ScrollArea className="max-h-[300px]">
            {/* 요약 결과 - 스트리밍 UI */}
            {activeFeature === 'summary' && (summaryStream.streamedText || summaryStream.isStreaming) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    이슈 요약
                  </h4>
                  {!summaryStream.isStreaming && summaryStream.streamedText && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(summaryStream.streamedText)}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {summaryStream.streamedText}
                  {summaryStream.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5 align-middle" />
                  )}
                </p>
              </div>
            )}

            {/* 제안 결과 */}
            {activeFeature === 'suggestion' && suggestions && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  추천 액션
                </h4>

                {suggestions.suggestions.map((s, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', priorityColors[s.priority])}>
                        {s.priority === 'high' ? '높음' : s.priority === 'medium' ? '보통' : '낮음'}
                      </Badge>
                      <span className="font-medium text-sm">{s.action}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.reason}</p>
                  </div>
                ))}

                {suggestions.blockers.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h5 className="text-xs font-medium text-red-500 mb-1">블로커</h5>
                      <ul className="text-xs text-muted-foreground list-disc pl-4">
                        {suggestions.blockers.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                <div className="text-xs text-muted-foreground">
                  예상 소요: {suggestions.estimatedEffort}
                </div>
              </div>
            )}

            {/* 라벨 추천 결과 */}
            {activeFeature === 'labels' && labelSuggestions && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  추천 라벨
                </h4>

                {labelSuggestions.suggestedLabels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {labelSuggestions.suggestedLabels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {label.name}
                        <span className="ml-1 text-muted-foreground">
                          ({Math.round(label.confidence * 100)}%)
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    추천할 라벨이 없습니다
                  </p>
                )}

                <p className="text-xs text-muted-foreground">
                  {labelSuggestions.reasoning}
                </p>
              </div>
            )}

            {/* 댓글 요약 결과 */}
            {activeFeature === 'comments' && commentSummary && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  댓글 요약
                </h4>

                <p className="text-sm">{commentSummary.summary}</p>

                {commentSummary.keyPoints.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-1">주요 포인트</h5>
                    <ul className="text-xs text-muted-foreground list-disc pl-4">
                      {commentSummary.keyPoints.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {commentSummary.decisions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-1 text-green-600">결정된 사항</h5>
                    <ul className="text-xs text-muted-foreground list-disc pl-4">
                      {commentSummary.decisions.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {commentSummary.openQuestions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium mb-1 text-amber-600">미해결 질문</h5>
                    <ul className="text-xs text-muted-foreground list-disc pl-4">
                      {commentSummary.openQuestions.map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {commentSummary.participants.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    참여자: {commentSummary.participants.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* 초기 안내 */}
            {!activeFeature && !isAnyLoading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                위 버튼을 클릭하여 AI 기능을 사용해보세요
              </p>
            )}
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  )
}
