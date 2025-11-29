-- ============================================
-- Soft Delete 개선: team_members, subtasks
-- ============================================
-- RLS SELECT 정책에 deleted_at IS NULL 조건을 추가하여
-- DB 레벨에서 자동 필터링 구현
-- ============================================

-- ============================================
-- Phase 1: team_members 테이블 Soft Delete 추가
-- ============================================

-- 1. deleted_at 컬럼 추가
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. 기존 DELETE 정책 삭제
DROP POLICY IF EXISTS "Allow member removal" ON team_members;

-- 3. SELECT 정책 수정 (deleted_at IS NULL 조건 추가)
DROP POLICY IF EXISTS "Team members can view members" ON team_members;

CREATE POLICY "Team members can view members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_team_member(team_id, auth.uid())
  );

-- 4. 새로운 UPDATE 정책 추가 (Soft Delete용)
CREATE POLICY "Allow member soft delete"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      -- 본인 탈퇴
      user_id = auth.uid()
      -- 또는 OWNER/ADMIN이 강퇴
      OR (
        public.get_team_role(team_id, auth.uid()) IN ('OWNER', 'ADMIN')
        AND (
          public.get_team_role(team_id, auth.uid()) = 'OWNER'
          OR (
            public.get_team_role(team_id, auth.uid()) = 'ADMIN'
            AND role = 'MEMBER'
          )
        )
      )
    )
  );

-- ============================================
-- Phase 2: subtasks 테이블 Soft Delete 추가
-- ============================================

-- 1. deleted_at 컬럼 추가
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. 기존 DELETE 정책 삭제
DROP POLICY IF EXISTS "Team members can delete subtasks" ON subtasks;

-- 3. SELECT 정책 수정 (deleted_at IS NULL 조건 추가)
DROP POLICY IF EXISTS "Team members can view subtasks" ON subtasks;

CREATE POLICY "Team members can view subtasks"
  ON subtasks FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

-- 4. UPDATE 정책에 deleted_at IS NULL 조건 추가
DROP POLICY IF EXISTS "Team members can update subtasks" ON subtasks;

CREATE POLICY "Team members can update subtasks"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

-- ============================================
-- Phase 3: 권한 함수 수정 (deleted_at 조건 추가)
-- ============================================

-- is_team_member 함수 수정
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
    AND deleted_at IS NULL
  );
END;
$$;

-- get_team_role 함수 수정
CREATE OR REPLACE FUNCTION public.get_team_role(p_team_id UUID, p_user_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role VARCHAR;
BEGIN
  SELECT role INTO v_role
  FROM team_members
  WHERE team_id = p_team_id
  AND user_id = p_user_id
  AND deleted_at IS NULL;

  RETURN v_role;
END;
$$;

-- ============================================
-- 인덱스 추가 (성능 최적화)
-- ============================================

-- team_members 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_team_members_deleted_at
  ON team_members(deleted_at)
  WHERE deleted_at IS NULL;

-- subtasks 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_subtasks_deleted_at
  ON subtasks(deleted_at)
  WHERE deleted_at IS NULL;
