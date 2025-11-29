-- ============================================
-- Hard Delete 차단: RLS DELETE 정책 제거
-- ============================================
-- 모든 Soft Delete 대상 테이블에서 DELETE 정책을 제거하여
-- RLS 레벨에서 Hard Delete를 원천 차단합니다.
-- ============================================

-- profiles 테이블
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- teams 테이블
DROP POLICY IF EXISTS "Owners can delete teams" ON teams;

-- team_members 테이블
DROP POLICY IF EXISTS "Allow member removal" ON team_members;

-- projects 테이블
DROP POLICY IF EXISTS "Owners can delete projects" ON projects;

-- issues 테이블
DROP POLICY IF EXISTS "Team members can delete issues" ON issues;

-- comments 테이블
DROP POLICY IF EXISTS "Comment owners can delete" ON comments;

-- subtasks 테이블
DROP POLICY IF EXISTS "Team members can delete subtasks" ON subtasks;
