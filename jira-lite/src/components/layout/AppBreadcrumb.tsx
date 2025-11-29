import { Fragment } from 'react'
import { headers } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Home } from 'lucide-react'

// UUID 정규식
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 경로 세그먼트 → 한국어 이름 매핑
const SEGMENT_NAMES: Record<string, string> = {
  dashboard: '대시보드',
  profile: '프로필',
  settings: '설정',
  new: '새로 만들기',
}

// 표시하지 않을 세그먼트 (UUID 앞에 오는 복수형 경로)
const SKIP_SEGMENTS = ['teams', 'projects', 'issues']

interface BreadcrumbData {
  label: string
  href: string
  isCurrentPage: boolean
}

export async function AppBreadcrumb() {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || '/'

  // protected 경로가 아니면 렌더링 안 함
  if (!pathname.startsWith('/teams') && !pathname.startsWith('/dashboard') && !pathname.startsWith('/profile')) {
    return null
  }

  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: BreadcrumbData[] = []

  // UUID 수집
  const uuids: { type: 'team' | 'project' | 'issue'; id: string }[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (UUID_REGEX.test(segment)) {
      if (segments[i - 1] === 'teams') {
        uuids.push({ type: 'team', id: segment })
      } else if (segments[i - 1] === 'projects') {
        uuids.push({ type: 'project', id: segment })
      } else if (segments[i - 1] === 'issues') {
        uuids.push({ type: 'issue', id: segment })
      }
    }
  }

  // DB에서 이름 조회 (한 번에)
  const names = await fetchNames(uuids)

  // breadcrumb 아이템 구성
  let currentPath = ''
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    currentPath += `/${segment}`
    const isLast = i === segments.length - 1

    // UUID 세그먼트
    if (UUID_REGEX.test(segment)) {
      const name = names[segment]
      if (name) {
        breadcrumbs.push({
          label: name,
          href: currentPath,
          isCurrentPage: isLast,
        })
      }
    }
    // 스킵하지 않는 일반 세그먼트
    else if (!SKIP_SEGMENTS.includes(segment) && SEGMENT_NAMES[segment]) {
      breadcrumbs.push({
        label: SEGMENT_NAMES[segment],
        href: currentPath,
        isCurrentPage: isLast,
      })
    }
  }

  // 대시보드 페이지에서는 breadcrumb 숨김 (홈만 있으면 의미 없음)
  if (breadcrumbs.length === 0) return null
  if (breadcrumbs.length === 1 && breadcrumbs[0].label === '대시보드') return null

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              홈
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((item) => (
          <Fragment key={item.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isCurrentPage ? (
                <BreadcrumbPage className="max-w-[200px] truncate">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="max-w-[200px] truncate">
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

async function fetchNames(uuids: { type: 'team' | 'project' | 'issue'; id: string }[]) {
  if (uuids.length === 0) return {}

  const supabase = await createClient()
  const names: Record<string, string> = {}

  const teamIds = uuids.filter(u => u.type === 'team').map(u => u.id)
  const projectIds = uuids.filter(u => u.type === 'project').map(u => u.id)
  const issueIds = uuids.filter(u => u.type === 'issue').map(u => u.id)

  // 병렬 쿼리
  const [teamsResult, projectsResult, issuesResult] = await Promise.all([
    teamIds.length > 0
      ? supabase.from('teams').select('id, name').in('id', teamIds)
      : null,
    projectIds.length > 0
      ? supabase.from('projects').select('id, name').in('id', projectIds)
      : null,
    issueIds.length > 0
      ? supabase.from('issues').select('id, title').in('id', issueIds)
      : null,
  ])

  if (teamsResult?.data) {
    (teamsResult.data as { id: string; name: string }[]).forEach(t => {
      names[t.id] = t.name
    })
  }
  if (projectsResult?.data) {
    (projectsResult.data as { id: string; name: string }[]).forEach(p => {
      names[p.id] = p.name
    })
  }
  if (issuesResult?.data) {
    (issuesResult.data as { id: string; title: string }[]).forEach(i => {
      names[i.id] = i.title
    })
  }

  return names
}
