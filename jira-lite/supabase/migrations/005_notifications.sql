-- 알림 유형 ENUM
CREATE TYPE notification_type AS ENUM (
    'ISSUE_ASSIGNED',      -- 이슈 담당자 지정
    'ISSUE_MENTIONED',     -- 이슈/댓글에서 멘션
    'ISSUE_STATUS_CHANGED', -- 이슈 상태 변경
    'ISSUE_COMMENT',       -- 이슈에 댓글 추가
    'ISSUE_DUE_SOON',      -- 마감 임박
    'ISSUE_OVERDUE',       -- 마감 초과
    'TEAM_INVITED',        -- 팀 초대
    'TEAM_ROLE_CHANGED'    -- 팀 역할 변경
);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,  -- 클릭 시 이동할 경로
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,  -- 추가 데이터 (issue_id, team_id 등)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- RLS 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- 알림 설정 테이블
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,

    -- 알림 유형별 설정
    issue_assigned BOOLEAN DEFAULT TRUE,
    issue_mentioned BOOLEAN DEFAULT TRUE,
    issue_status_changed BOOLEAN DEFAULT TRUE,
    issue_comment BOOLEAN DEFAULT TRUE,
    issue_due_soon BOOLEAN DEFAULT TRUE,
    team_invited BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

-- RLS 정책
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification settings" ON notification_settings
    FOR ALL USING (auth.uid() = user_id);

-- 기본 설정 자동 생성 트리거
CREATE OR REPLACE FUNCTION create_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_notification_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_notification_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_notification_settings();

-- 알림 생성 헬퍼 함수
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_settings notification_settings;
BEGIN
    -- 사용자 설정 확인
    SELECT * INTO v_settings FROM notification_settings WHERE user_id = p_user_id;

    -- 설정에 따라 알림 생성 여부 결정
    IF v_settings IS NULL OR (
        (p_type = 'ISSUE_ASSIGNED' AND v_settings.issue_assigned) OR
        (p_type = 'ISSUE_MENTIONED' AND v_settings.issue_mentioned) OR
        (p_type = 'ISSUE_STATUS_CHANGED' AND v_settings.issue_status_changed) OR
        (p_type = 'ISSUE_COMMENT' AND v_settings.issue_comment) OR
        (p_type = 'ISSUE_DUE_SOON' AND v_settings.issue_due_soon) OR
        (p_type = 'ISSUE_OVERDUE' AND v_settings.issue_due_soon) OR
        (p_type = 'TEAM_INVITED' AND v_settings.team_invited) OR
        (p_type = 'TEAM_ROLE_CHANGED' AND v_settings.team_invited)
    ) THEN
        INSERT INTO notifications (user_id, type, title, message, link, metadata)
        VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
        RETURNING id INTO v_notification_id;
    END IF;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
