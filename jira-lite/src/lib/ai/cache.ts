import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// 캐시 TTL 설정 (분 단위)
const CACHE_TTL = {
  summary: 30,      // 30분
  suggestion: 15,   // 15분
  labels: 60,       // 1시간
  duplicates: 10,   // 10분
  comments: 30,     // 30분
} as const

type CacheFeature = keyof typeof CACHE_TTL

// 캐시 키 생성
function generateCacheKey(feature: string, ...args: string[]): string {
  const data = [feature, ...args].join(':')
  return crypto.createHash('sha256').update(data).digest('hex')
}

// 캐시 조회
export async function getFromCache<T>(
  feature: CacheFeature,
  ...keyParts: string[]
): Promise<T | null> {
  const supabase = await createClient()
  const cacheKey = generateCacheKey(feature, ...keyParts)

  const { data } = await supabase
    .from('ai_response_cache')
    .select('response, expires_at')
    .eq('cache_key', cacheKey)
    .single()

  if (!data) return null

  // 만료 확인
  if (new Date(data.expires_at) < new Date()) {
    // 만료된 캐시 삭제
    await supabase.from('ai_response_cache').delete().eq('cache_key', cacheKey)
    return null
  }

  return data.response as T
}

// 캐시 저장
export async function setCache<T>(
  feature: CacheFeature,
  response: T,
  ...keyParts: string[]
): Promise<void> {
  const supabase = await createClient()
  const cacheKey = generateCacheKey(feature, ...keyParts)
  const ttlMinutes = CACHE_TTL[feature]
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000)

  await supabase.from('ai_response_cache').upsert({
    cache_key: cacheKey,
    feature,
    response: response as object,
    expires_at: expiresAt.toISOString(),
  })
}

// 캐시 무효화
export async function invalidateCache(
  feature: CacheFeature,
  ...keyParts: string[]
): Promise<void> {
  const supabase = await createClient()
  const cacheKey = generateCacheKey(feature, ...keyParts)

  await supabase.from('ai_response_cache').delete().eq('cache_key', cacheKey)
}

// 특정 이슈의 모든 캐시 무효화
export async function invalidateIssueCache(issueId: string): Promise<void> {
  const supabase = await createClient()

  // 이슈 관련 모든 캐시 패턴 삭제
  const features: CacheFeature[] = ['summary', 'suggestion', 'labels', 'comments']

  await Promise.all(
    features.map(feature => invalidateCache(feature, issueId))
  )
}

// 만료된 캐시 정리 (크론 작업용)
export async function cleanupExpiredCache(): Promise<number> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('ai_response_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('*', { count: 'exact', head: true })

  return count || 0
}
