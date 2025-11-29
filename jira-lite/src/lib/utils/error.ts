import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(error: unknown): NextResponse {
  console.error('[API Error]', error)

  if (error instanceof ZodError) {
    const firstError = error.errors[0]
    return NextResponse.json(
      { error: firstError.message },
      { status: 400 }
    )
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    // Supabase 에러 메시지 처리
    if (error.message.includes('duplicate key')) {
      return NextResponse.json(
        { error: '이미 존재하는 데이터입니다' },
        { status: 409 }
      )
    }

    if (error.message.includes('violates foreign key')) {
      return NextResponse.json(
        { error: '참조하는 데이터를 찾을 수 없습니다' },
        { status: 400 }
      )
    }
  }

  return NextResponse.json(
    { error: '서버 오류가 발생했습니다' },
    { status: 500 }
  )
}

// 에러 타입별 한국어 메시지
export const errorMessages = {
  // 인증 관련
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다',
  EMAIL_EXISTS: '이미 사용 중인 이메일입니다',
  INVALID_TOKEN: '유효하지 않거나 만료된 토큰입니다',
  UNAUTHORIZED: '로그인이 필요합니다',

  // 권한 관련
  FORBIDDEN: '접근 권한이 없습니다',
  NOT_TEAM_MEMBER: '팀 멤버가 아닙니다',
  INSUFFICIENT_PERMISSION: '권한이 부족합니다',

  // 리소스 관련
  NOT_FOUND: '요청한 리소스를 찾을 수 없습니다',
  TEAM_NOT_FOUND: '팀을 찾을 수 없습니다',
  PROJECT_NOT_FOUND: '프로젝트를 찾을 수 없습니다',
  ISSUE_NOT_FOUND: '이슈를 찾을 수 없습니다',

  // 제한 관련
  MAX_PROJECTS_REACHED: '팀당 최대 프로젝트 수(15개)에 도달했습니다',
  MAX_ISSUES_REACHED: '프로젝트당 최대 이슈 수(200개)에 도달했습니다',
  MAX_SUBTASKS_REACHED: '이슈당 최대 서브태스크 수(20개)에 도달했습니다',
  MAX_LABELS_REACHED: '프로젝트당 최대 라벨 수(20개)에 도달했습니다',
  MAX_ISSUE_LABELS_REACHED: '이슈당 최대 라벨 수(5개)에 도달했습니다',
  MAX_STATUSES_REACHED: '프로젝트당 최대 상태 수(8개)에 도달했습니다',

  // AI 관련
  AI_RATE_LIMIT_MINUTE: 'AI 요청 제한에 도달했습니다. 잠시 후 다시 시도해주세요',
  AI_RATE_LIMIT_DAY: '오늘 AI 요청 제한(100회)에 도달했습니다',
  AI_DESCRIPTION_TOO_SHORT: '설명이 너무 짧습니다 (10자 이상 필요)',
  AI_NOT_ENOUGH_COMMENTS: '댓글이 충분하지 않습니다 (5개 이상 필요)',

  // 삭제 관련
  CANNOT_DELETE_OWNER: '팀 소유자는 삭제할 수 없습니다',
  OWNER_CANNOT_LEAVE: '팀 소유자는 탈퇴할 수 없습니다. 팀을 삭제하거나 소유권을 이전해주세요',
  HAS_OWNED_TEAMS: '소유한 팀이 있어 계정을 삭제할 수 없습니다. 팀을 먼저 삭제하거나 소유권을 이전해주세요',

  // 일반
  SERVER_ERROR: '서버 오류가 발생했습니다',
} as const

export type ErrorCode = keyof typeof errorMessages
