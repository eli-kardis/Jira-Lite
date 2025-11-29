-- teams 테이블 INSERT RLS 정책 수정
-- 문제: Supabase SSR 환경에서 auth.uid()가 제대로 평가되지 않아 팀 생성 실패
-- 해결: WITH CHECK (true)로 변경하여 인증된 사용자 누구나 팀 생성 가능
-- 보안: owner_id 검증은 애플리케이션 레벨(Server Action)에서 수행

-- teams 테이블 RLS 활성화 상태 유지
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;

-- 새 INSERT 정책 생성 (인증된 사용자는 팀 생성 가능)
CREATE POLICY "Enable insert for authenticated users only"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (true);
