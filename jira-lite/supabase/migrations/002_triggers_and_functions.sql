-- Jira Lite 트리거 및 함수
-- ============================================

-- ============================================
-- 1. 회원가입 시 profiles 자동 생성 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, auth_provider)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'::auth_provider
      ELSE 'email'::auth_provider
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. 프로젝트 생성 시 기본 상태 자동 생성 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.create_default_statuses()
RETURNS TRIGGER AS $$
BEGIN
  -- 기본 상태 3개 생성 (Backlog, In Progress, Done)
  INSERT INTO public.project_statuses (project_id, name, position, is_default)
  VALUES
    (NEW.id, 'Backlog', 0, TRUE),
    (NEW.id, 'In Progress', 1, TRUE),
    (NEW.id, 'Done', 2, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_project_created
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.create_default_statuses();

-- ============================================
-- 3. 팀 생성 시 OWNER로 자동 추가 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.add_team_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'OWNER');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.add_team_owner();

-- ============================================
-- 4. 이슈 변경 히스토리 자동 기록 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.record_issue_history()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := ARRAY['title', 'status_id', 'assignee_id', 'priority', 'due_date'];
  field_name TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH field_name IN ARRAY changed_fields
  LOOP
    EXECUTE format('SELECT $1.%I::TEXT', field_name) INTO old_val USING OLD;
    EXECUTE format('SELECT $1.%I::TEXT', field_name) INTO new_val USING NEW;

    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.issue_history (issue_id, user_id, field_name, old_value, new_value)
      VALUES (
        NEW.id,
        auth.uid(),
        field_name,
        old_val,
        new_val
      );
    END IF;
  END LOOP;

  -- updated_at 갱신
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_issue_updated
  BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.record_issue_history();

-- ============================================
-- 5. 댓글 updated_at 자동 갱신 트리거
-- ============================================

CREATE OR REPLACE FUNCTION public.update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_comment_updated
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_comment_timestamp();

-- ============================================
-- 6. AI 캐시 무효화 트리거 (description 변경 시)
-- ============================================

CREATE OR REPLACE FUNCTION public.invalidate_ai_cache_on_description_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    DELETE FROM public.ai_cache
    WHERE issue_id = NEW.id AND cache_type IN ('summary', 'suggestion');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_issue_description_changed
  AFTER UPDATE OF description ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_ai_cache_on_description_change();

-- ============================================
-- 7. AI 캐시 무효화 트리거 (새 댓글 추가 시)
-- ============================================

CREATE OR REPLACE FUNCTION public.invalidate_comment_summary_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.ai_cache
  WHERE issue_id = NEW.issue_id AND cache_type = 'comment_summary';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_created
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_comment_summary_cache();

-- ============================================
-- 8. 상태 삭제 시 이슈를 Backlog로 이동하는 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.move_issues_to_backlog()
RETURNS TRIGGER AS $$
DECLARE
  backlog_status_id UUID;
BEGIN
  -- 같은 프로젝트의 Backlog 상태 찾기
  SELECT id INTO backlog_status_id
  FROM public.project_statuses
  WHERE project_id = OLD.project_id AND name = 'Backlog' AND is_default = TRUE
  LIMIT 1;

  -- 해당 상태의 모든 이슈를 Backlog로 이동
  IF backlog_status_id IS NOT NULL THEN
    UPDATE public.issues
    SET status_id = backlog_status_id
    WHERE status_id = OLD.id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER before_status_deleted
  BEFORE DELETE ON public.project_statuses
  FOR EACH ROW EXECUTE FUNCTION public.move_issues_to_backlog();

-- ============================================
-- 9. 팀 활동 로그 기록 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.log_team_activity(
  p_team_id UUID,
  p_activity_type activity_log_type,
  p_target_user_id UUID DEFAULT NULL,
  p_target_project_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.team_activity_logs (
    team_id,
    user_id,
    activity_type,
    target_user_id,
    target_project_id,
    metadata
  )
  VALUES (
    p_team_id,
    auth.uid(),
    p_activity_type,
    p_target_user_id,
    p_target_project_id,
    p_metadata
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. 알림 생성 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title VARCHAR(200),
  p_message TEXT DEFAULT NULL,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_metadata
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. 팀 멤버십 확인 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. 팀 역할 확인 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.get_team_role(p_team_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS team_role AS $$
DECLARE
  user_role team_role;
BEGIN
  SELECT role INTO user_role
  FROM public.team_members
  WHERE team_id = p_team_id AND user_id = p_user_id;

  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. 프로젝트 접근 권한 확인 함수
-- ============================================

CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  project_team_id UUID;
BEGIN
  SELECT team_id INTO project_team_id
  FROM public.projects
  WHERE id = p_project_id AND deleted_at IS NULL;

  IF project_team_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.is_team_member(project_team_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. 이슈 수 카운트 함수 (프로젝트 제한 확인용)
-- ============================================

CREATE OR REPLACE FUNCTION public.count_project_issues(p_project_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.issues
    WHERE project_id = p_project_id AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 15. 프로젝트 수 카운트 함수 (팀 제한 확인용)
-- ============================================

CREATE OR REPLACE FUNCTION public.count_team_projects(p_team_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM public.projects
    WHERE team_id = p_team_id AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
