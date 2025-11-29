import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export async function checkProjectAccess(projectId: string) {
  const supabase = await createClient();

  // 1. 내 정보 가져오기
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect('/login');

  // 2. 이 프로젝트가 내 팀의 프로젝트인지 확인 (DB가 다 퍼줘도 여기서 거름)
  // "프로젝트의 team_id"가 "내가 속한 team_members 목록"에 있는지 확인
  const { data: project } = await supabase
    .from('projects')
    .select('team_id')
    .eq('id', projectId)
    .single();

  if (!project) notFound(); // 프로젝트가 없으면 404

  // 3. 내가 그 팀의 멤버인지 확인
  const { data: member } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', project.team_id)
    .eq('user_id', user.id)
    .is('deleted_at', null) // (중요) 강퇴당한 사람은 못 보게
    .single();

  // 4. 멤버가 아니면 튕겨냄
  if (!member) {
    console.warn(`Unauthorized access attempt by user ${user.id} to project ${projectId}`);
    notFound(); // 보안을 위해 403 대신 "없는 페이지(404)"인 척 하는 게 더 안전함
  }

  return true; // 통과
}
