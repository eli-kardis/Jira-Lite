"use server"

import { createClient } from "@/lib/supabase/server"

export async function getBreadcrumbNames(teamId?: string, projectId?: string) {
  const supabase = await createClient()
  const result = { teamName: "", projectName: "" }

  // 1. 팀 이름 조회
  if (teamId) {
    const { data } = await supabase
      .from("teams")
      .select("name")
      .eq("id", teamId)
      .single()
    if (data) result.teamName = data.name
  }

  // 2. 프로젝트 이름 조회
  if (projectId) {
    const { data } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single()
    if (data) result.projectName = data.name
  }

  return result
}
