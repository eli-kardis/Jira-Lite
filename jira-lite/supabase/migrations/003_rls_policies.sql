-- Jira Lite RLS 정책
-- ============================================

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- profiles 정책
-- ============================================

-- 본인 프로필 조회
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL);

-- 같은 팀 멤버 프로필 조회
CREATE POLICY "Team members can view each other profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() AND tm2.user_id = profiles.id
    )
  );

-- 본인 프로필 수정
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (id = auth.uid());

-- ============================================
-- teams 정책
-- ============================================

-- 팀 멤버만 조회
CREATE POLICY "Team members can view team"
  ON teams FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_team_member(id, auth.uid())
  );

-- 인증된 사용자 팀 생성
CREATE POLICY "Authenticated users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- OWNER, ADMIN만 팀 수정
CREATE POLICY "Team owner and admin can update team"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.get_team_role(id, auth.uid()) IN ('OWNER', 'ADMIN')
  )
  WITH CHECK (
    public.get_team_role(id, auth.uid()) IN ('OWNER', 'ADMIN')
  );

-- OWNER만 팀 삭제 (Soft Delete)
CREATE POLICY "Team owner can delete team"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    public.get_team_role(id, auth.uid()) = 'OWNER'
  )
  WITH CHECK (
    public.get_team_role(id, auth.uid()) = 'OWNER'
    AND deleted_at IS NOT NULL
  );

-- ============================================
-- team_members 정책
-- ============================================

-- 팀 멤버 조회 (같은 팀)
CREATE POLICY "Team members can view members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
  );

-- 팀 멤버 추가 (트리거 또는 초대 수락 시)
CREATE POLICY "Allow team member insertion"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- OWNER가 역할 변경
CREATE POLICY "Team owner can update member roles"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    public.get_team_role(team_id, auth.uid()) = 'OWNER'
  );

-- 멤버 삭제 (강퇴 또는 탈퇴)
CREATE POLICY "Allow member removal"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    -- 본인 탈퇴
    user_id = auth.uid()
    -- 또는 OWNER/ADMIN이 강퇴
    OR (
      public.get_team_role(team_id, auth.uid()) IN ('OWNER', 'ADMIN')
      AND (
        -- OWNER는 모두 강퇴 가능
        public.get_team_role(team_id, auth.uid()) = 'OWNER'
        -- ADMIN은 MEMBER만 강퇴 가능
        OR (
          public.get_team_role(team_id, auth.uid()) = 'ADMIN'
          AND role = 'MEMBER'
        )
      )
    )
  );

-- ============================================
-- team_invitations 정책
-- ============================================

-- 팀 멤버가 초대 목록 조회
CREATE POLICY "Team members can view invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
    OR email = (SELECT email FROM profiles WHERE id = auth.uid())
  );

-- OWNER, ADMIN이 초대 생성
CREATE POLICY "Team owner and admin can create invitations"
  ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_team_role(team_id, auth.uid()) IN ('OWNER', 'ADMIN')
  );

-- 초대 상태 업데이트
CREATE POLICY "Allow invitation status update"
  ON team_invitations FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM profiles WHERE id = auth.uid())
    OR public.get_team_role(team_id, auth.uid()) IN ('OWNER', 'ADMIN')
  );

-- ============================================
-- team_activity_logs 정책
-- ============================================

-- 팀 멤버가 활동 로그 조회
CREATE POLICY "Team members can view activity logs"
  ON team_activity_logs FOR SELECT
  TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
  );

-- 활동 로그 생성 (함수를 통해서만)
CREATE POLICY "Allow activity log insertion"
  ON team_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ============================================
-- projects 정책
-- ============================================

-- 팀 멤버가 프로젝트 조회
CREATE POLICY "Team members can view projects"
  ON projects FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.is_team_member(team_id, auth.uid())
  );

-- 팀 멤버가 프로젝트 생성
CREATE POLICY "Team members can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_team_member(team_id, auth.uid())
    AND owner_id = auth.uid()
    AND public.count_team_projects(team_id) < 15
  );

-- OWNER, ADMIN, 프로젝트 소유자가 수정
CREATE POLICY "Project owners and team admins can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      owner_id = auth.uid()
      OR public.get_team_role(team_id, auth.uid()) IN ('OWNER', 'ADMIN')
    )
  );

-- ============================================
-- project_favorites 정책
-- ============================================

-- 본인 즐겨찾기 조회
CREATE POLICY "Users can view own favorites"
  ON project_favorites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 본인 즐겨찾기 추가
CREATE POLICY "Users can add favorites"
  ON project_favorites FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_access_project(project_id, auth.uid())
  );

-- 본인 즐겨찾기 삭제
CREATE POLICY "Users can remove favorites"
  ON project_favorites FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- project_statuses 정책
-- ============================================

-- 프로젝트 접근 권한이 있으면 상태 조회
CREATE POLICY "Team members can view project statuses"
  ON project_statuses FOR SELECT
  TO authenticated
  USING (
    public.can_access_project(project_id, auth.uid())
  );

-- 프로젝트 수정 권한이 있으면 상태 추가
CREATE POLICY "Project owners can create statuses"
  ON project_statuses FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_project(project_id, auth.uid())
  );

-- 상태 수정
CREATE POLICY "Project owners can update statuses"
  ON project_statuses FOR UPDATE
  TO authenticated
  USING (
    public.can_access_project(project_id, auth.uid())
  );

-- 기본 상태가 아닌 것만 삭제 가능
CREATE POLICY "Can delete non-default statuses"
  ON project_statuses FOR DELETE
  TO authenticated
  USING (
    public.can_access_project(project_id, auth.uid())
    AND is_default = FALSE
  );

-- ============================================
-- labels 정책
-- ============================================

-- 프로젝트 접근 권한이 있으면 라벨 조회
CREATE POLICY "Team members can view labels"
  ON labels FOR SELECT
  TO authenticated
  USING (
    public.can_access_project(project_id, auth.uid())
  );

-- 프로젝트 접근 권한이 있으면 라벨 생성
CREATE POLICY "Team members can create labels"
  ON labels FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_project(project_id, auth.uid())
  );

-- 라벨 수정
CREATE POLICY "Team members can update labels"
  ON labels FOR UPDATE
  TO authenticated
  USING (
    public.can_access_project(project_id, auth.uid())
  );

-- 라벨 삭제
CREATE POLICY "Team members can delete labels"
  ON labels FOR DELETE
  TO authenticated
  USING (
    public.can_access_project(project_id, auth.uid())
  );

-- ============================================
-- issues 정책
-- ============================================

-- 프로젝트 접근 권한이 있으면 이슈 조회
CREATE POLICY "Team members can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.can_access_project(project_id, auth.uid())
  );

-- 프로젝트가 아카이브되지 않았으면 이슈 생성
CREATE POLICY "Team members can create issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_project(project_id, auth.uid())
    AND owner_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND archived_at IS NOT NULL
    )
    AND public.count_project_issues(project_id) < 200
  );

-- 프로젝트가 아카이브되지 않았으면 이슈 수정
CREATE POLICY "Team members can update issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (
    deleted_at IS NULL
    AND public.can_access_project(project_id, auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM projects WHERE id = project_id AND archived_at IS NOT NULL
    )
  );

-- ============================================
-- issue_labels 정책
-- ============================================

CREATE POLICY "Team members can view issue labels"
  ON issue_labels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Team members can manage issue labels"
  ON issue_labels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Team members can delete issue labels"
  ON issue_labels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

-- ============================================
-- subtasks 정책
-- ============================================

CREATE POLICY "Team members can view subtasks"
  ON subtasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Team members can create subtasks"
  ON subtasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Team members can update subtasks"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Team members can delete subtasks"
  ON subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

-- ============================================
-- comments 정책
-- ============================================

CREATE POLICY "Team members can view comments"
  ON comments FOR SELECT
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

CREATE POLICY "Team members can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

-- 본인 댓글만 수정
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND deleted_at IS NULL
  );

-- ============================================
-- issue_history 정책
-- ============================================

CREATE POLICY "Team members can view issue history"
  ON issue_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Allow history insertion"
  ON issue_history FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

-- ============================================
-- notifications 정책
-- ============================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow notification creation"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- ai_cache 정책
-- ============================================

CREATE POLICY "Team members can view ai cache"
  ON ai_cache FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM issues i
      WHERE i.id = issue_id
      AND i.deleted_at IS NULL
      AND public.can_access_project(i.project_id, auth.uid())
    )
  );

CREATE POLICY "Allow ai cache management"
  ON ai_cache FOR ALL
  TO authenticated
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================
-- ai_usage 정책
-- ============================================

CREATE POLICY "Users can view own ai usage"
  ON ai_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage own ai usage"
  ON ai_usage FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
