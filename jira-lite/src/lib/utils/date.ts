// 한국어 날짜 포맷 유틸리티

/**
 * 날짜를 한국어 형식으로 포맷팅
 * @example formatDate('2024-01-15') => '2024년 1월 15일'
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * 날짜와 시간을 한국어 형식으로 포맷팅
 * @example formatDateTime('2024-01-15T10:30:00') => '2024년 1월 15일 오전 10:30'
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(d)
}

/**
 * 상대적 시간 표시
 * @example formatRelativeTime('2024-01-15T10:30:00') => '3시간 전'
 */
export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  if (seconds < 60) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  if (weeks < 4) return `${weeks}주 전`
  if (months < 12) return `${months}개월 전`
  return `${years}년 전`
}

/**
 * 짧은 날짜 형식
 * @example formatShortDate('2024-01-15') => '1월 15일'
 */
export function formatShortDate(date: string | Date): string {
  const d = new Date(date)
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(d)
}

/**
 * 마감일까지 남은 일수 계산
 * @returns 음수면 지남, 양수면 남음
 */
export function getDaysUntil(date: string | Date): number {
  const d = new Date(date)
  const now = new Date()

  // 날짜만 비교 (시간 제거)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diff = target.getTime() - today.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * 마감일 상태 텍스트
 * @example getDueDateStatus('2024-01-15') => '오늘 마감' | 'D-3' | '3일 지남'
 */
export function getDueDateStatus(date: string | Date): string {
  const days = getDaysUntil(date)

  if (days === 0) return '오늘 마감'
  if (days === 1) return '내일 마감'
  if (days > 0) return `D-${days}`
  return `${Math.abs(days)}일 지남`
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
