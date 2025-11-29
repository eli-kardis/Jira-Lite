# Jira Lite - AI 기반 이슈 트래킹 시스템

서비스 개발 공모전을 위한 AI 기반 경량 이슈 트래킹 웹 애플리케이션입니다.

## 주요 기능

### 인증 (FR-001 ~ FR-007)
- 이메일/비밀번호 회원가입 및 로그인
- 소셜 로그인 (Google, GitHub)
- 비밀번호 재설정
- 프로필 관리

### 팀 관리 (FR-010 ~ FR-019)
- 팀 생성 및 관리
- 팀원 초대 (이메일, 초대 코드)
- 역할 기반 권한 관리 (OWNER, ADMIN, MEMBER)
- 팀당 최대 멤버 수 제한 (15명)

### 프로젝트 관리 (FR-020 ~ FR-027)
- 프로젝트 생성/수정/삭제
- 프로젝트 아카이브
- 즐겨찾기 기능
- 팀당 최대 15개 프로젝트

### 이슈 관리 (FR-030 ~ FR-039)
- 이슈 생성/수정/삭제
- 드래그 앤 드롭 상태 변경
- 담당자 지정
- 우선순위 설정 (LOW, MEDIUM, HIGH, URGENT)
- 라벨 관리
- 서브태스크 (체크리스트)
- 마감일 설정

### 칸반 보드 (FR-050 ~ FR-054)
- 드래그 앤 드롭 칸반 보드
- 이슈 목록 뷰
- 커스텀 상태 관리
- 필터링 및 정렬

### AI 기능 (FR-040 ~ FR-045)
- AI 이슈 요약
- 해결 방안 제안
- 자동 라벨 추천
- 중복 이슈 감지
- AI 코멘트 생성
- Rate Limiting 및 캐싱

### 대시보드 및 통계 (FR-080 ~ FR-082)
- 개인 활동 대시보드
- 팀 통계 대시보드
- 프로젝트 통계 (상태별, 우선순위별 차트)

### 알림 시스템 (FR-090 ~ FR-091)
- 실시간 알림
- 알림 설정 (이메일, 인앱)
- 알림 히스토리

## 기술 스택

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS, shadcn/ui, Radix UI
- **Backend**: Next.js Server Actions, API Routes
- **Database**: Supabase (PostgreSQL)
- **인증**: Supabase Auth
- **AI**: Claude API (Anthropic)
- **상태 관리**: React Server Components
- **드래그앤드롭**: @dnd-kit
- **차트**: Recharts
- **폼 검증**: Zod
- **기타**: date-fns, lucide-react

## 시작하기

### 필수 요구사항

- Node.js 18+
- npm 또는 yarn
- Supabase 계정
- Anthropic API 키 (AI 기능용)

### 설치

1. 저장소 클론
```bash
git clone <repository-url>
cd jira-lite
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
`.env.local` 파일 생성:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Claude AI
ANTHROPIC_API_KEY=your-anthropic-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. 데이터베이스 마이그레이션
Supabase 대시보드에서 `supabase/migrations/` 폴더의 SQL 파일들을 순서대로 실행

5. 개발 서버 시작
```bash
npm run dev
```

### 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (protected)/        # 인증 필요 페이지
│   ├── api/                # API Routes
│   └── auth/               # 인증 관련
├── components/
│   ├── layout/             # 레이아웃 컴포넌트
│   └── ui/                 # shadcn/ui 컴포넌트
├── features/
│   ├── auth/               # 인증 기능
│   ├── board/              # 칸반 보드
│   ├── dashboard/          # 대시보드
│   ├── notifications/      # 알림 시스템
│   └── workspace/          # 팀/프로젝트 관리
├── lib/
│   ├── ai/                 # AI 클라이언트
│   ├── supabase/           # Supabase 클라이언트
│   └── utils/              # 유틸리티 함수
└── types/                  # TypeScript 타입 정의
```

## 데이터베이스 스키마

### 주요 테이블
- `profiles`: 사용자 프로필
- `teams`: 팀
- `team_members`: 팀 멤버십
- `team_invitations`: 팀 초대
- `projects`: 프로젝트
- `project_statuses`: 프로젝트 상태
- `project_favorites`: 즐겨찾기
- `issues`: 이슈
- `labels`: 라벨
- `issue_labels`: 이슈-라벨 연결
- `subtasks`: 서브태스크
- `comments`: 댓글
- `notifications`: 알림
- `notification_settings`: 알림 설정
- `ai_usage_logs`: AI 사용 로그
- `ai_cache`: AI 응답 캐시

## 라이선스

MIT License
