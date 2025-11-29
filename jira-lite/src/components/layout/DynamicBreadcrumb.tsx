"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { getBreadcrumbNames } from "@/features/dashboard/actions/breadcrumb-actions"

export function DynamicBreadcrumb() {
  const pathname = usePathname()
  const [names, setNames] = useState({ teamName: "", projectName: "" })

  // URL에서 ID 추출 (정규식 활용)
  // 예: /teams/[UUID]/projects/[UUID]
  const teamId = pathname.match(/teams\/([^\/]+)/)?.[1]
  const projectId = pathname.match(/projects\/([^\/]+)/)?.[1]

  useEffect(() => {
    async function fetchNames() {
      if (!teamId && !projectId) {
        setNames({ teamName: "", projectName: "" })
        return
      }
      // 서버 액션 호출하여 이름 가져오기
      const data = await getBreadcrumbNames(teamId, projectId)
      setNames(data)
    }
    fetchNames()
  }, [pathname, teamId, projectId]) // 주소가 바뀔 때마다 실행

  // 대시보드 루트면 표시 안 함 (선택 사항)
  if (pathname === "/dashboard") return null

  return (
    <nav className="flex items-center text-sm text-muted-foreground mb-4">
      {/* 1. Home (대시보드) */}
      <Link href="/dashboard" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>

      {/* 2. Team Segment */}
      {teamId && names.teamName && (
        <>
          <ChevronRight className="h-4 w-4 mx-2" />
          <Link href={`/teams/${teamId}`} className="hover:text-foreground transition-colors">
            {names.teamName}
          </Link>
        </>
      )}

      {/* 3. Project Segment */}
      {projectId && names.projectName && (
        <>
          <ChevronRight className="h-4 w-4 mx-2" />
          <span className="font-medium text-foreground">
            {names.projectName}
          </span>
        </>
      )}
    </nav>
  )
}
