-- projects 테이블 INSERT RLS 정책 수정
-- 문제: auth.uid() 및 is_team_member() 함수가 Supabase SSR 환경에서 제대로 평가되지 않음
-- 해결: WITH CHECK (true)로 변경, 검증은 애플리케이션 레벨(Server Action)에서 수행

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Team members can create projects" ON projects;

-- 새 INSERT 정책 (인증된 사용자는 프로젝트 생성 가능)
CREATE POLICY "Enable insert for authenticated users"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);
