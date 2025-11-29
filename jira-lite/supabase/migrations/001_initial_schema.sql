-- Jira Lite 초기 스키마
-- 의존성 순서대로 테이블 생성

-- ============================================
-- ENUM 타입 생성
-- ============================================

CREATE TYPE auth_provider AS ENUM ('email', 'google');
CREATE TYPE team_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');
CREATE TYPE issue_priority AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE notification_type AS ENUM (
  'ISSUE_ASSIGNED',
  'COMMENT',
  'DUE_DATE_SOON',
  'DUE_DATE_TODAY',
  'TEAM_INVITE',
  'ROLE_CHANGED'
);
CREATE TYPE activity_log_type AS ENUM (
  'MEMBER_JOINED',
  'MEMBER_LEFT',
  'MEMBER_REMOVED',
  'ROLE_CHANGED',
  'PROJECT_CREATED',
  'PROJECT_DELETED',
  'PROJECT_ARCHIVED',
  'TEAM_UPDATED'
);
CREATE TYPE ai_cache_type AS ENUM ('summary', 'suggestion', 'comment_summary');

-- ============================================
-- 1. profiles 테이블 (auth.users 확장)
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  profile_image TEXT,
  auth_provider auth_provider NOT NULL DEFAULT 'email',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- profiles 인덱스
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_deleted_at ON profiles(deleted_at);

-- ============================================
-- 2. teams 테이블
-- ============================================

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- teams 인덱스
CREATE INDEX idx_teams_owner_id ON teams(owner_id);
CREATE INDEX idx_teams_deleted_at ON teams(deleted_at);

-- ============================================
-- 3. team_members 테이블
-- ============================================

CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'MEMBER',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- team_members 인덱스
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- ============================================
-- 4. team_invitations 테이블
-- ============================================

CREATE TABLE team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status invitation_status NOT NULL DEFAULT 'PENDING',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- team_invitations 인덱스
CREATE INDEX idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- ============================================
-- 5. team_activity_logs 테이블
-- ============================================

CREATE TABLE team_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  activity_type activity_log_type NOT NULL,
  target_user_id UUID REFERENCES profiles(id),
  target_project_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- team_activity_logs 인덱스
CREATE INDEX idx_team_activity_logs_team_id ON team_activity_logs(team_id);
CREATE INDEX idx_team_activity_logs_created_at ON team_activity_logs(created_at DESC);

-- ============================================
-- 6. projects 테이블
-- ============================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT projects_description_length CHECK (length(description) <= 2000)
);

-- projects 인덱스
CREATE INDEX idx_projects_team_id ON projects(team_id);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_deleted_at ON projects(deleted_at);

-- ============================================
-- 7. project_favorites 테이블
-- ============================================

CREATE TABLE project_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- project_favorites 인덱스
CREATE INDEX idx_project_favorites_user_id ON project_favorites(user_id);

-- ============================================
-- 8. project_statuses 테이블 (칸반 컬럼)
-- ============================================

CREATE TABLE project_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  color VARCHAR(7),
  position INT NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  wip_limit INT CHECK (wip_limit IS NULL OR (wip_limit >= 1 AND wip_limit <= 50)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- project_statuses 인덱스
CREATE INDEX idx_project_statuses_project_id ON project_statuses(project_id);
CREATE INDEX idx_project_statuses_position ON project_statuses(project_id, position);

-- ============================================
-- 9. labels 테이블
-- ============================================

CREATE TABLE labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  color VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- labels 인덱스
CREATE INDEX idx_labels_project_id ON labels(project_id);

-- ============================================
-- 10. issues 테이블
-- ============================================

CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_id UUID NOT NULL REFERENCES project_statuses(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority issue_priority NOT NULL DEFAULT 'MEDIUM',
  assignee_id UUID REFERENCES profiles(id),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  due_date DATE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT issues_description_length CHECK (length(description) <= 5000)
);

-- issues 인덱스
CREATE INDEX idx_issues_project_id ON issues(project_id);
CREATE INDEX idx_issues_status_id ON issues(status_id);
CREATE INDEX idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX idx_issues_owner_id ON issues(owner_id);
CREATE INDEX idx_issues_deleted_at ON issues(deleted_at);
CREATE INDEX idx_issues_position ON issues(status_id, position);

-- ============================================
-- 11. issue_labels 테이블 (M:N)
-- ============================================

CREATE TABLE issue_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(issue_id, label_id)
);

-- issue_labels 인덱스
CREATE INDEX idx_issue_labels_issue_id ON issue_labels(issue_id);
CREATE INDEX idx_issue_labels_label_id ON issue_labels(label_id);

-- ============================================
-- 12. subtasks 테이블
-- ============================================

CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- subtasks 인덱스
CREATE INDEX idx_subtasks_issue_id ON subtasks(issue_id);

-- ============================================
-- 13. comments 테이블
-- ============================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- comments 인덱스
CREATE INDEX idx_comments_issue_id ON comments(issue_id);
CREATE INDEX idx_comments_deleted_at ON comments(deleted_at);

-- ============================================
-- 14. issue_history 테이블
-- ============================================

CREATE TABLE issue_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- issue_history 인덱스
CREATE INDEX idx_issue_history_issue_id ON issue_history(issue_id);
CREATE INDEX idx_issue_history_created_at ON issue_history(issue_id, created_at DESC);

-- ============================================
-- 15. notifications 테이블
-- ============================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- notifications 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- ============================================
-- 16. ai_cache 테이블
-- ============================================

CREATE TABLE ai_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  cache_type ai_cache_type NOT NULL,
  content TEXT NOT NULL,
  content_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(issue_id, cache_type)
);

-- ai_cache 인덱스
CREATE INDEX idx_ai_cache_issue_id ON ai_cache(issue_id);

-- ============================================
-- 17. ai_usage 테이블 (Rate Limiting)
-- ============================================

CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minute_key VARCHAR(20) NOT NULL,
  day_key VARCHAR(10) NOT NULL,
  minute_count INT NOT NULL DEFAULT 0,
  day_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, minute_key)
);

-- ai_usage 인덱스
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_day_key ON ai_usage(user_id, day_key);
