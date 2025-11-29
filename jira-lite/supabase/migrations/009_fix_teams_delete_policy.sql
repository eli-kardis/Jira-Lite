-- teams 테이블 삭제(soft delete) RLS 정책 수정
-- 문제: WITH CHECK 조건에 "deleted_at IS NOT NULL"이 있어서
--       deleted_at을 NULL에서 값으로 변경하는 UPDATE가 항상 실패함 (순환 참조)
-- 해결: WITH CHECK에서 deleted_at 조건 제거

-- 기존 DELETE 정책 삭제
DROP POLICY IF EXISTS "Team owner can delete team" ON teams;

-- 새 DELETE 정책 (soft delete용) - OWNER만 팀 삭제 가능
CREATE POLICY "Team owner can delete team"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    public.get_team_role(id, auth.uid()) = 'OWNER'
  )
  WITH CHECK (
    public.get_team_role(id, auth.uid()) = 'OWNER'
  );
