-- AI 사용량 로그 테이블
CREATE TABLE IF NOT EXISTS ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL CHECK (feature IN ('summary', 'suggestion', 'labels', 'duplicates', 'comments')),
    issue_id UUID REFERENCES issues(id) ON DELETE SET NULL,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_feature ON ai_usage_logs(user_id, feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- RLS 정책
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 로그만 조회 가능
CREATE POLICY "Users can view own AI usage logs" ON ai_usage_logs
    FOR SELECT USING (auth.uid() = user_id);

-- 시스템에서 로그 삽입 허용 (authenticated 사용자)
CREATE POLICY "Authenticated users can insert AI usage logs" ON ai_usage_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- AI 응답 캐시 테이블 (선택적)
CREATE TABLE IF NOT EXISTS ai_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key TEXT NOT NULL UNIQUE,
    feature TEXT NOT NULL,
    response JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 캐시 만료 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_response_cache(cache_key);

-- RLS (캐시는 공개 조회 가능)
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cache" ON ai_response_cache
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage cache" ON ai_response_cache
    FOR ALL USING (auth.role() = 'authenticated');
