// AI 기능용 프롬프트 템플릿

// 이슈 요약 프롬프트
export function getIssueSummaryPrompt(issue: {
  title: string
  description: string | null
  comments?: { content: string; author: string }[]
}): { system: string; user: string } {
  return {
    system: `당신은 프로젝트 관리 도우미입니다. 이슈의 핵심 내용을 간결하게 요약해주세요.
요약은 다음 형식을 따릅니다:
- 핵심 내용: 2-3문장으로 요약
- 주요 논의 사항: 댓글에서 중요한 포인트 (있는 경우)
- 다음 단계: 필요한 액션 아이템 (파악 가능한 경우)

응답은 한국어로 해주세요.`,
    user: `다음 이슈를 요약해주세요:

제목: ${issue.title}

설명:
${issue.description || '(설명 없음)'}

${issue.comments && issue.comments.length > 0
  ? `댓글 (${issue.comments.length}개):
${issue.comments.map(c => `- ${c.author}: ${c.content}`).join('\n')}`
  : ''
}`
  }
}

// 다음 액션 제안 프롬프트
export function getActionSuggestionPrompt(issue: {
  title: string
  description: string | null
  status: string
  priority: string
  subtasks?: { title: string; is_completed: boolean }[]
}): { system: string; user: string } {
  return {
    system: `당신은 프로젝트 관리 전문가입니다. 이슈의 현재 상태를 분석하고 다음에 수행해야 할 구체적인 액션을 제안해주세요.

응답은 JSON 형식으로 해주세요:
{
  "suggestions": [
    {
      "action": "제안하는 액션",
      "reason": "이유",
      "priority": "high" | "medium" | "low"
    }
  ],
  "blockers": ["발견된 블로커 또는 우려 사항"],
  "estimatedEffort": "예상 소요 시간/노력"
}`,
    user: `다음 이슈에 대한 다음 액션을 제안해주세요:

제목: ${issue.title}
상태: ${issue.status}
우선순위: ${issue.priority}

설명:
${issue.description || '(설명 없음)'}

${issue.subtasks && issue.subtasks.length > 0
  ? `하위 작업:
${issue.subtasks.map(s => `- [${s.is_completed ? 'x' : ' '}] ${s.title}`).join('\n')}`
  : ''
}`
  }
}

// 라벨 추천 프롬프트
export function getLabelSuggestionPrompt(
  issue: { title: string; description: string | null },
  availableLabels: { id: string; name: string; color: string }[]
): { system: string; user: string } {
  return {
    system: `당신은 이슈 분류 전문가입니다. 이슈의 내용을 분석하여 적절한 라벨을 추천해주세요.

사용 가능한 라벨 목록만 사용해야 합니다. 새로운 라벨을 만들지 마세요.

응답은 JSON 형식으로 해주세요:
{
  "suggestedLabels": [
    {
      "id": "라벨 ID",
      "name": "라벨 이름",
      "confidence": 0.0-1.0 사이의 확신도
    }
  ],
  "reasoning": "라벨 선택 이유"
}`,
    user: `다음 이슈에 적합한 라벨을 추천해주세요:

제목: ${issue.title}

설명:
${issue.description || '(설명 없음)'}

사용 가능한 라벨:
${availableLabels.map(l => `- ${l.name} (ID: ${l.id})`).join('\n')}`
  }
}

// 중복 이슈 감지 프롬프트
export function getDuplicateDetectionPrompt(
  newIssue: { title: string; description: string | null },
  existingIssues: { id: string; title: string; description: string | null }[]
): { system: string; user: string } {
  return {
    system: `당신은 이슈 중복 감지 전문가입니다. 새 이슈가 기존 이슈들과 중복되는지 분석해주세요.

유사도가 70% 이상인 이슈만 중복 후보로 포함합니다.

응답은 JSON 형식으로 해주세요:
{
  "duplicates": [
    {
      "id": "기존 이슈 ID",
      "title": "기존 이슈 제목",
      "similarity": 0.0-1.0 사이의 유사도,
      "reason": "유사하다고 판단한 이유"
    }
  ],
  "isLikelyDuplicate": true | false,
  "recommendation": "조치 권고사항"
}`,
    user: `다음 새 이슈가 기존 이슈들과 중복되는지 확인해주세요:

새 이슈:
제목: ${newIssue.title}
설명: ${newIssue.description || '(설명 없음)'}

기존 이슈 목록:
${existingIssues.map(i => `---
ID: ${i.id}
제목: ${i.title}
설명: ${i.description || '(설명 없음)'}
`).join('\n')}`
  }
}

// 댓글 요약 프롬프트
export function getCommentSummaryPrompt(comments: {
  author: string
  content: string
  created_at: string
}[]): { system: string; user: string } {
  return {
    system: `당신은 토론 요약 전문가입니다. 이슈 댓글들을 분석하여 핵심 내용을 요약해주세요.

응답은 JSON 형식으로 해주세요:
{
  "summary": "전체 토론 요약 (2-3문장)",
  "keyPoints": ["주요 논의 포인트들"],
  "decisions": ["결정된 사항들"],
  "openQuestions": ["아직 해결되지 않은 질문들"],
  "participants": ["활발하게 참여한 사람들"]
}`,
    user: `다음 댓글들을 요약해주세요:

${comments.map(c => `[${c.created_at}] ${c.author}:
${c.content}
`).join('\n---\n')}`
  }
}
