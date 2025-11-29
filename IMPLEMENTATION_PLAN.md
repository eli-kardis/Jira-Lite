# Jira Lite MVP 개발 계획서

## 프로젝트 개요
- **목표**: AI 기반 이슈 트래킹 웹 애플리케이션 MVP
- **기술 스택**: Next.js 14 (App Router), Supabase, Tailwind CSS, shadcn/ui, @dnd-kit, Recharts, Claude API
- **언어**: 한국어 UI
- **이슈 상세**: 모달 (Dialog) 방식
- **환경 변수**: .env.local 생성 후 사용자가 직접 입력

---

## Phase 1: 프로젝트 초기화 및 인증 (2시간)

### 1.1 프로젝트 세팅
```bash
npx create-next-app@latest jira-lite --typescript --tailwind --app --src-dir
npx shadcn@latest init
npm install @supabase/supabase-js @supabase/ssr
```

### 1.2 Supabase 설정
- 환경 변수 설정 (.env.local)
- Supabase 클라이언트 설정 (브라우저/서버)
- Google OAuth 설정 (Supabase Dashboard)

### 1.3 핵심 테이블 생성 (의존성 순서)
```
1. profiles (auth.users 확장)
2. teams
3. team_members (ENUM: OWNER/ADMIN/MEMBER)
4. team_invitations
5. team_activity_logs
```

### 1.4 인증 구현 (FR-001 ~ FR-007)

#### FR-001: 회원가입
- **입력**: email (유니크, 이메일형식, ~255자), password (6~100자), name (1~50자)
- **처리**: Supabase signUp() → profiles 테이블 자동 생성 (트리거)
- **후처리**: 자동 로그인 → 대시보드 이동
- **예외**: 이메일 중복/형식 오류 → 필드별 한국어 에러 메시지

#### FR-002: 로그인/로그아웃
- **입력**: email, password
- **처리**: Supabase signInWithPassword()
- **토큰 만료**: 24시간 (Supabase Dashboard → Auth Settings)
- **로그아웃**: Supabase signOut() → 로그인 페이지 이동
- **동시 로그인**: 허용 (여러 기기 동시 접속 가능)
- **예외**: "이메일 또는 비밀번호가 올바르지 않습니다"

#### FR-003: 비밀번호 찾기/재설정
- **1단계**: 사용자가 이메일 입력 → "비밀번호 재설정" 버튼 클릭
- **2단계**: Supabase resetPasswordForEmail() → 실제 이메일 발송 (Supabase 내장)
- **3단계**: 이메일 링크 클릭 → `/auth/reset-password` 페이지로 이동
- **4단계**: 새 비밀번호 입력 → updateUser({ password }) → 로그인 페이지 이동
- **링크 만료**: 1시간 (Supabase 기본값)
- **UI**: 이메일 발송 완료 안내 메시지 표시

#### FR-004: Google OAuth
- **처리**: Supabase signInWithOAuth({ provider: 'google' })
- **콜백**: `/auth/callback` → 대시보드 이동
- **신규 사용자**: profiles 테이블 자동 생성 (트리거)
- **기존 Google 사용자**: 로그인 처리
- **계정 병합**: 미지원 (동일 이메일이라도 이메일/비밀번호 계정과 Google 계정은 별개)
- **auth_provider 구분**: profiles 테이블에 'email' | 'google' 저장

#### FR-005: 프로필 관리
- **조회**: 프로필 페이지에서 현재 정보 표시
- **수정 가능**: name (1~50자), profileImage
- **이미지 처리**: Supabase Storage 업로드 방식 (URL 입력 미지원 - 보안상 권장)
- **즉시 반영**: 저장 시 UI 즉시 업데이트 (낙관적 업데이트)
- **API**: PATCH /api/users/me

#### FR-006: 비밀번호 변경
- **입력**: currentPassword, newPassword (6~100자), confirmPassword
- **처리**:
  1. 현재 비밀번호 검증 (signInWithPassword로 확인)
  2. updateUser({ password: newPassword })
  3. 변경 완료 토스트 메시지
- **예외**:
  - 현재 비밀번호 불일치 → "현재 비밀번호가 올바르지 않습니다"
  - 새 비밀번호 확인 불일치 → "새 비밀번호가 일치하지 않습니다" (클라이언트 검증)
- **OAuth 사용자**: 기능 비활성화 (auth_provider === 'google' 시 UI 숨김)

#### FR-007: 계정 삭제
- **확인 단계**:
  - 이메일 사용자: 비밀번호 재입력 필수
  - OAuth 사용자: 확인 버튼만 (비밀번호 없음)
- **처리**:
  1. 소유한 팀(OWNER) 존재 여부 확인
  2. 팀 있으면 삭제 불가 → "소유한 팀을 먼저 삭제하거나 소유권을 이전해주세요"
  3. 팀 없으면 Soft Delete (profiles.deleted_at = NOW())
- **삭제 후**: 자동 로그아웃 → 로그인 페이지 이동

#### 공통
- Next.js Middleware (보호된 라우트)
- CurrentUser Context (전역 사용자 상태)

---

## Phase 2: 팀 기능 (1.5시간)

### 2.1 테이블
- `teams` (id, name, owner_id, created_at, deleted_at)
- `team_members` (team_id, user_id, role: OWNER/ADMIN/MEMBER, joined_at)
- `team_invitations` (만료: 7일, 상태: PENDING/ACCEPTED/EXPIRED)
- `team_activity_logs` (활동 유형 ENUM)

### 2.2 FR별 상세

#### FR-010: 팀 생성
- **입력**: name (1~50자)
- **처리**:
  1. teams 테이블에 생성 (owner_id = 현재 사용자)
  2. team_members에 자동 추가 (role = OWNER)
- **참고**: 한 사용자가 여러 팀 소속 가능

#### FR-011: 팀 정보 수정
- **권한**: OWNER, ADMIN
- **수정 가능**: 팀 이름 (1~50자)

#### FR-012: 팀 삭제
- **권한**: OWNER만
- **처리**: 팀 + 하위 프로젝트/이슈/댓글 모두 Soft Delete
- **복구**: 30일간 복구 가능 (선택 - MVP 미구현)

#### FR-013: 팀 멤버 초대
- **권한**: OWNER, ADMIN
- **처리**: 이메일 입력 → 초대 정보 저장 → 실제 이메일 발송 (Supabase)
- **초대 만료**: 7일
- **재발송**: 기존 pending 초대의 만료일 갱신

#### FR-014: 팀 멤버 조회
- **표시**: 이름, 이메일, 역할, 가입일

#### FR-015: 멤버 강제 퇴장
- **권한**: OWNER → 모든 멤버 / ADMIN → MEMBER만
- **제한**: 본인은 강제 퇴장 불가

#### FR-016: 팀 탈퇴
- **권한**: ADMIN, MEMBER (OWNER는 탈퇴 불가, 삭제만 가능)

#### FR-017: 역할 체계
| 역할 | 설명 |
|------|------|
| OWNER | 팀 생성자, 최고 권한, 팀당 1명 |
| ADMIN | 관리자, 멤버 관리 가능 |
| MEMBER | 일반 멤버, 프로젝트/이슈 작업 가능 |

#### FR-018: 역할 변경
- **권한**: OWNER만
- **가능**: MEMBER ↔ ADMIN 승격/강등, OWNER 권한 이전 (본인은 ADMIN으로)

#### FR-019: 팀 활동 로그
- **기록 대상**: 멤버 가입/탈퇴/강퇴, 역할 변경, 프로젝트 생성/삭제/아카이브, 팀 정보 수정
- **표시**: 활동 내용, 수행자, 대상, 일시
- **페이지네이션**: 무한 스크롤

### 2.3 API 엔드포인트
| 엔드포인트 | 기능 |
|-----------|------|
| POST /api/teams | 팀 생성 |
| GET /api/teams | 내 팀 목록 |
| PATCH /api/teams/[teamId] | 팀 수정 (OWNER, ADMIN) |
| DELETE /api/teams/[teamId] | 팀 삭제 (OWNER) |
| GET /api/teams/[teamId]/members | 멤버 목록 |
| POST /api/teams/[teamId]/invitations | 멤버 초대 |
| PATCH /api/teams/[teamId]/members/[memberId] | 역할 변경 (OWNER) |
| DELETE /api/teams/[teamId]/members/[memberId] | 강제 퇴장 |
| POST /api/teams/[teamId]/leave | 팀 탈퇴 |
| GET /api/teams/[teamId]/activity-logs | 활동 로그

### 2.4 UI 컴포넌트
- TeamList, TeamCard, TeamForm
- MemberList, InviteMemberDialog, RoleChangeDropdown
- ActivityLog (무한 스크롤)

---

## Phase 3: 프로젝트 기능 (1.5시간)

### 3.1 테이블
```sql
- projects (팀당 최대 15개)
- project_favorites (사용자별)
- project_statuses (기본 3개 + 커스텀 5개)
- labels (프로젝트당 최대 20개)
```

### 3.2 프로젝트 생성 트리거
- 생성 시 기본 상태 자동 생성 (Backlog, In Progress, Done)

### 3.3 FR별 상세

#### FR-020: 프로젝트 생성
- **입력**: name (필수, 1~100자), description (선택, 최대 2000자)
- **처리**:
  1. Project 생성 (team_id = 현재 팀, owner_id = 생성자)
  2. 기본 상태 3개 자동 생성 (트리거)
  3. 생성된 프로젝트는 팀 멤버 전체가 열람 가능
- **제한**: 팀당 최대 15개 (초과 시 에러 메시지)
- **참고**: 프로젝트 소유자 = 생성한 사람

#### FR-021: 프로젝트 목록 조회
- **표시**: 프로젝트 이름, 설명 (요약), 이슈 개수, 생성일, 즐겨찾기 여부
- **정렬**: 즐겨찾기 우선 → 생성일 역순

#### FR-022: 프로젝트 상세 페이지
- **표시**:
  - 프로젝트 이름, 설명
  - 이슈 통계 (상태별 개수)
  - 칸반 보드 / 이슈 리스트 (탭 전환)

#### FR-023: 프로젝트 수정
- **권한**: 팀 OWNER, ADMIN, 또는 프로젝트 소유자
- **수정 가능**: 프로젝트 이름 (1~100자), 설명 (최대 2000자)

#### FR-024: 프로젝트 삭제
- **권한**: 팀 OWNER, ADMIN, 또는 프로젝트 소유자
- **처리**: 프로젝트 + 하위 이슈/댓글/서브태스크 모두 Soft Delete

#### FR-025: 프로젝트 설명
- **조건**: 최대 2000자
- **마크다운**: 지원 권장 (react-markdown 사용)

#### FR-026: 프로젝트 아카이브
- **권한**: 팀 OWNER, ADMIN, 또는 프로젝트 소유자
- **처리**:
  1. projects.archived_at 설정
  2. 아카이브된 프로젝트는 목록에서 별도 표시 또는 숨김
  3. 아카이브된 프로젝트의 이슈는 읽기 전용
- **복원**: archived_at = NULL로 언제든 복원 가능

#### FR-027: 프로젝트 즐겨찾기
- **처리**:
  1. project_favorites 테이블에 토글 (추가/삭제)
  2. 즐겨찾기한 프로젝트는 목록 상단에 표시
- **참고**: 즐겨찾기는 사용자별로 관리됨

### 3.4 API 엔드포인트
| 엔드포인트 | 기능 |
|-----------|------|
| POST /api/teams/[teamId]/projects | 프로젝트 생성 |
| GET /api/teams/[teamId]/projects | 프로젝트 목록 |
| GET /api/projects/[projectId] | 프로젝트 상세 |
| PATCH /api/projects/[projectId] | 프로젝트 수정 |
| DELETE /api/projects/[projectId] | 프로젝트 삭제 (Soft) |
| POST /api/projects/[projectId]/archive | 아카이브 |
| POST /api/projects/[projectId]/restore | 복원 |
| POST /api/projects/[projectId]/favorite | 즐겨찾기 토글 |
| GET /api/projects/[projectId]/statuses | 상태 목록 |
| POST /api/projects/[projectId]/statuses | 커스텀 상태 추가 |
| PATCH /api/projects/[projectId]/statuses/[statusId] | 상태 수정 |
| DELETE /api/projects/[projectId]/statuses/[statusId] | 상태 삭제 |
| GET /api/projects/[projectId]/labels | 라벨 목록 |
| POST /api/projects/[projectId]/labels | 라벨 추가 |
| PATCH /api/projects/[projectId]/labels/[labelId] | 라벨 수정 |
| DELETE /api/projects/[projectId]/labels/[labelId] | 라벨 삭제 |

### 3.5 UI 컴포넌트
- ProjectGrid, ProjectCard, FavoriteToggle
- ProjectSettings (라벨, 상태 관리)
- ProjectHeader (이름, 설명, 아카이브 상태)
- ArchiveConfirmDialog

---

## Phase 4: 이슈 및 칸반 보드 (2.5시간) - 핵심

### 4.1 테이블
```sql
- issues (프로젝트당 최대 200개, priority ENUM)
- issue_labels (M:N)
- subtasks (이슈당 최대 20개)
- comments (1~1000자)
- issue_history (자동 기록 트리거)
```

### 4.2 이슈 히스토리 트리거
```sql
-- 상태, 담당자, 우선순위, 제목, 마감일 변경 시 자동 기록
```

### 4.3 FR별 상세 - 이슈 (FR-030 ~ FR-039)

#### FR-030: 이슈 생성
- **입력**:
  - title (필수, 1~200자)
  - description (선택, 최대 5000자)
  - assignee_user_id (선택, 같은 팀 멤버)
  - due_date (선택, 날짜 형식)
  - priority (선택, HIGH/MEDIUM/LOW, 기본: MEDIUM)
  - labels (선택, 프로젝트 라벨 중 복수 선택)
- **처리**: 생성 시 status = Backlog, owner_id = 생성자
- **제한**: 프로젝트당 최대 200개

#### FR-031: 이슈 상세 조회
- **표시**: 제목, 설명, 상태, 우선순위, 담당자, 마감일, 라벨, 생성일
- **추가 표시**:
  - 서브태스크 목록 (체크리스트)
  - 댓글 리스트
  - AI 요약/제안 버튼
  - 변경 히스토리 (버튼/탭)

#### FR-032: 이슈 수정
- **권한**: 팀 멤버 전체
- **수정 가능**: 제목, 설명, 담당자, 마감일, 상태, 우선순위, 라벨

#### FR-033: 이슈 상태 변경
- **방식**: Drag & Drop 또는 상세 화면에서 변경
- **기본 상태**: Backlog, In Progress, Done
- **커스텀 상태**: 프로젝트별 추가 가능 (FR-053)
- **상태 전이**: 모든 상태 간 직접 이동 가능
- **예외**: 잘못된 상태값으로 변경 시도 시 오류 처리

#### FR-034: 담당자 지정
- **조건**: 해당 프로젝트의 팀 멤버 중 한 명만 가능

#### FR-035: 이슈 삭제
- **권한**: 이슈 소유자, 프로젝트 소유자, 팀 OWNER, 팀 ADMIN
- **처리**: Soft Delete

#### FR-036: 이슈 검색/필터링
- **검색**: 제목 텍스트 검색
- **필터**: 상태별, 담당자별, 우선순위별, 라벨별, 마감일 유무, 마감일 범위
- **정렬**: 생성일, 마감일, 우선순위, 최근 수정일

#### FR-037: 이슈 우선순위
| 레벨 | 설명 | 색상 |
|------|------|------|
| HIGH | 긴급, 즉시 처리 | red-500 |
| MEDIUM | 일반 (기본값) | amber-500 |
| LOW | 낮은 우선순위 | green-500 |
- **표시**: 칸반 보드 및 이슈 목록에서 시각적 구분 (색상, 아이콘)

#### FR-038: 이슈 라벨/태그
- **라벨 관리**: name (1~30자), color (HEX)
- **처리**: 프로젝트 내에서 생성/수정/삭제, 이슈에 복수 적용
- **제한**: 프로젝트당 최대 20개, 이슈당 최대 5개

#### FR-039: 이슈 변경 히스토리
- **기록 대상**: 상태, 담당자, 우선순위, 제목, 마감일 변경
- **표시**: 변경 항목, 이전 값, 새 값, 변경자, 변경 일시

#### FR-039-2: 서브태스크
- **입력**: title (1~200자)
- **처리**: 체크박스로 완료/미완료, 드래그로 순서 변경
- **제한**: 이슈당 최대 20개
- **표시**: 이슈 카드에 진행률 표시 (예: 3/5)

### 4.4 FR별 상세 - 칸반 (FR-050 ~ FR-054)

#### FR-050: 칸반 보드 표시
- **기본 컬럼**: Backlog, In Progress, Done
- **커스텀 컬럼**: 사용자 정의 상태 추가 가능
- **이슈 카드 표시**: 제목, 담당자, 우선순위, 라벨, 마감일, 서브태스크 진행률, 생성일

#### FR-051: Drag & Drop 이동
- **처리**: 이슈 카드를 다른 컬럼으로 드래그 → 상태 변경

#### FR-052: 같은 컬럼 내 순서 변경
- **처리**: 같은 컬럼 내 위아래 드래그로 순서 변경
- **저장**: position 필드 업데이트, 새 이슈는 컬럼 최하단

#### FR-053: 커스텀 컬럼 (Custom Status)
- **입력**: name (1~30자), color (HEX, 선택), position (순서)
- **제한**: 기본 3개 + 커스텀 5개 = 최대 8개
- **상태 삭제 시**: 해당 상태의 이슈는 Backlog로 이동

#### FR-054: WIP Limit
- **입력**: wipLimit (1~50 또는 null로 무제한)
- **처리**: 제한 초과 시 경고 표시 (이동은 허용)
- **표시**: 컬럼 헤더에 현재 수/제한 표시 (예: 5/10), 초과 시 헤더 강조

### 4.5 FR별 상세 - 댓글 (FR-060 ~ FR-063)

#### FR-060: 댓글 작성
- **입력**: content (1~1000자)

#### FR-061: 댓글 조회
- **정렬**: 작성일 순
- **페이지네이션**: 무한 스크롤

#### FR-062: 댓글 수정
- **권한**: 댓글 작성자만

#### FR-063: 댓글 삭제
- **권한**: 댓글 작성자, 이슈 소유자, 프로젝트 소유자, 팀 OWNER, 팀 ADMIN

### 4.6 API 엔드포인트
| 엔드포인트 | 기능 |
|-----------|------|
| POST /api/projects/[projectId]/issues | 이슈 생성 |
| GET /api/projects/[projectId]/issues | 이슈 목록 (필터/검색) |
| GET /api/issues/[issueId] | 이슈 상세 |
| PATCH /api/issues/[issueId] | 이슈 수정 |
| DELETE /api/issues/[issueId] | 이슈 삭제 |
| PATCH /api/issues/[issueId]/status | 상태 변경 |
| PATCH /api/issues/[issueId]/position | 순서 변경 |
| GET /api/issues/[issueId]/history | 변경 히스토리 |
| POST /api/issues/[issueId]/subtasks | 서브태스크 추가 |
| PATCH /api/subtasks/[subtaskId] | 서브태스크 수정/완료 |
| DELETE /api/subtasks/[subtaskId] | 서브태스크 삭제 |
| PATCH /api/subtasks/reorder | 서브태스크 순서 변경 |
| POST /api/issues/[issueId]/comments | 댓글 작성 |
| GET /api/issues/[issueId]/comments | 댓글 목록 (무한 스크롤) |
| PATCH /api/comments/[commentId] | 댓글 수정 |
| DELETE /api/comments/[commentId] | 댓글 삭제 |

### 4.7 칸반 보드 구현
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**컴포넌트 구조:**
```
KanbanBoard
├── KanbanColumn (상태별)
│   ├── ColumnHeader (WIP 표시)
│   └── KanbanCard (드래그 가능)
└── DragOverlay (드래그 중 미리보기)
```

**모바일 대응:**
- < 768px: 탭 기반 리스트 뷰
- >= 768px: 가로 스크롤/풀 칸반

### 4.8 이슈 상세 모달
- 제목, 설명, 상태, 우선순위, 담당자, 마감일
- 라벨 선택 (최대 5개)
- 서브태스크 (체크리스트, 드래그 순서 변경)
- 댓글 섹션 (무한 스크롤)
- AI 버튼들 (요약, 제안, 라벨 추천, 댓글 요약)
- 변경 히스토리 탭

---

## Phase 5: AI 기능 (2시간)

### 5.1 패키지 설치
```bash
npm install @anthropic-ai/sdk
```

### 5.2 테이블
```sql
- ai_cache (issue_id, cache_type, content, content_hash)
- ai_usage (user_id, date, count)
```

### 5.3 FR별 상세

#### FR-040: 설명 요약 생성 (AI Summary)
- **동작**: 버튼 클릭 시 생성 (자동 아님)
- **입력**: 이슈 description
- **출력**: 2~4문장 요약
- **조건**: description > 10자 (이하면 버튼 비활성화)
- **캐싱**: DB 저장, description 수정 시 캐시 무효화
- **에러**: API 호출 실패 시 에러 메시지 표시

#### FR-041: 해결 전략 제안 (AI Suggestion)
- **동작**: 버튼 클릭 시 생성
- **프롬프트**: "이 이슈를 해결하기 위한 접근 방식을 제안해줘"
- **조건**: description > 10자
- **캐싱**: FR-040과 동일
- **에러**: API 호출 실패 시 에러 메시지 표시

#### FR-042: AI Rate Limiting
- **정책**:
  - 분당 10회 (DB 기반 - Serverless 대응)
  - 일당 100회 (DB 기반)
- **처리**: 제한 초과 시 에러 메시지 + 남은 시간/횟수 안내

#### FR-043: AI 이슈 자동 분류 (AI Auto-Label)
- **동작**: 이슈 생성 시 "라벨 추천" 버튼 표시 → 클릭 시 실행
- **입력**: 이슈 제목, 설명, 프로젝트 내 라벨 목록
- **출력**: 추천 라벨 (최대 3개)
- **처리**: 사용자가 추천 라벨 수락/거부 선택

#### FR-044: AI 중복 이슈 탐지 (AI Duplicate Detection)
- **동작**: 이슈 생성 폼에서 제목 입력 완료 시 또는 버튼 클릭
- **입력**: 새 이슈 제목
- **출력**: 유사 이슈 목록 (최대 3개) + 각 이슈 링크
- **처리**: 사용자가 경고 무시하고 생성 가능

#### FR-045: AI 댓글 요약 (AI Comment Summary)
- **동작**: 버튼 클릭 시 생성
- **조건**: 댓글 5개 이상 (이하면 버튼 비활성화)
- **출력**: 논의 요약 (3~5문장), 주요 결정 사항
- **캐싱**: 새 댓글 추가 시 캐시 무효화

### 5.4 API 엔드포인트
| API | 기능 | 조건 |
|-----|------|------|
| POST /api/ai/summary | 이슈 요약 (2~4문장) | description > 10자 |
| POST /api/ai/suggestion | 해결 전략 제안 | description > 10자 |
| POST /api/ai/labels | 라벨 자동 추천 (최대 3개) | - |
| POST /api/ai/duplicates | 중복 이슈 탐지 (최대 3개) | - |
| POST /api/ai/comments | 댓글 요약 | 댓글 >= 5개 |

### 5.5 Rate Limiting 구현 (DB 기반)
```sql
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  minute_key TEXT, -- 'YYYY-MM-DD-HH-mm' 형식
  day_key TEXT,    -- 'YYYY-MM-DD' 형식
  minute_count INT DEFAULT 0,
  day_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 캐싱 전략
- DB 저장 (Supabase ai_cache 테이블)
- content_hash로 무효화 판단
- 트리거: description 수정 시 summary/suggestion 캐시 삭제
- 트리거: 댓글 추가 시 comment_summary 캐시 삭제

### 5.7 중복 탐지 알고리즘
1. 키워드 기반 사전 필터링 (프로젝트 내 상위 20개 이슈)
2. LLM 직접 비교로 유사도 판단
3. JSON 배열로 유사 이슈 ID 반환

---

## Phase 6: 대시보드 및 통계 (1.5시간)

### 6.1 패키지 설치
```bash
npm install recharts
```

### 6.2 FR별 상세

#### FR-080: 프로젝트 대시보드
- **표시 정보**:
  - 상태별 이슈 개수 (파이 차트 또는 바 차트)
  - 완료율 (Done / 전체)
  - 우선순위별 이슈 개수
  - 최근 생성된 이슈 (최대 5개)
  - 마감 임박 이슈 (7일 이내, 최대 5개)

#### FR-081: 개인 대시보드
- **표시 정보**:
  - 내가 담당한 이슈 목록 (상태별 분류)
  - 내가 담당한 이슈 총 개수
  - 마감 임박 이슈 (7일 이내)
  - 오늘 마감 이슈
  - 최근 내가 작성한 댓글 (최대 5개)
  - 소속 팀/프로젝트 목록

#### FR-082: 팀 통계
- **표시 정보**:
  - 기간별 이슈 생성 추이 (꺾은선 그래프)
  - 기간별 이슈 완료 추이 (꺾은선 그래프)
  - 멤버별 담당 이슈 수
  - 멤버별 완료 이슈 수
  - 프로젝트별 이슈 현황
- **기간 선택**: 최근 7일 / 30일 / 90일

### 6.3 API 엔드포인트
| 엔드포인트 | 기능 |
|-----------|------|
| GET /api/dashboard/personal | 개인 대시보드 데이터 |
| GET /api/projects/[projectId]/dashboard | 프로젝트 대시보드 |
| GET /api/teams/[teamId]/statistics | 팀 통계 |

### 6.4 UI 컴포넌트
- PersonalDashboard (개인 대시보드 페이지)
- ProjectDashboard (프로젝트 상세 내 탭)
- TeamStatistics (팀 설정 내 탭)
- StatCard (통계 카드)
- IssueChart (Recharts 파이/바/라인 차트)

---

## Phase 7: 알림 시스템 (1시간)

### 7.1 테이블
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type notification_type, -- ISSUE_ASSIGNED, COMMENT, DUE_DATE 등
  title VARCHAR(200),
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

### 7.2 FR별 상세

#### FR-090: 인앱 알림 (In-App Notification)
- **알림 발생 조건**:
  | 이벤트 | 알림 대상 |
  |--------|----------|
  | 이슈 담당자 지정 | 담당자 |
  | 이슈에 댓글 작성 | 이슈 소유자, 담당자 |
  | 마감일 임박 (1일 전) | 담당자 |
  | 마감일 당일 | 담당자 |
  | 팀 초대 | 초대 대상자 |
  | 멤버 역할 변경 | 해당 멤버 |
- **표시**: 헤더에 알림 아이콘 + 미읽음 개수 표시
- **UI**: 알림 목록 드롭다운 또는 페이지

#### FR-091: 알림 읽음 처리 (Mark as Read)
- **기능**:
  1. 개별 알림 읽음 처리 (클릭 시)
  2. 전체 읽음 처리 버튼
- **표시**: 읽음/미읽음 시각적 구분

### 7.3 API 엔드포인트
| 엔드포인트 | 기능 |
|-----------|------|
| GET /api/notifications | 알림 목록 (무한 스크롤) |
| PATCH /api/notifications/[notificationId]/read | 개별 읽음 처리 |
| POST /api/notifications/read-all | 전체 읽음 처리 |
| GET /api/notifications/unread-count | 미읽음 개수 |

### 7.4 UI 컴포넌트
- NotificationBell (헤더 아이콘 + 카운트 배지)
- NotificationDropdown (드롭다운 목록)
- NotificationItem (개별 알림 아이템)

---

## Phase 8: 권한/보안 및 마무리 (1시간)

### 8.1 FR별 상세 - 권한/보안 (FR-070 ~ FR-071)

#### FR-070: 팀 멤버십 검증
- **적용**: 모든 API 엔드포인트에서 팀 멤버십 검증 필수
- **접근 제어**:
  - 다른 팀의 프로젝트/이슈에 접근 시도 시 → **404 Not Found** 반환
  - 권한 없는 작업 시도 시 → **403 Forbidden** 반환
- **구현**: RLS 정책 + API 레벨 검증

#### FR-071: Soft Delete 구현
- **적용 대상**: User, Team, Project, Issue, Comment
- **구현**:
  - `deleted_at` 필드 추가 (TIMESTAMPTZ)
  - 삭제 시 물리 삭제 대신 `deleted_at = NOW()` 기록
  - 조회 시 `deleted_at IS NULL` 조건 자동 적용 (RLS)

### 8.2 프로필 관리 (FR-005, FR-006, FR-007 마무리)
- 이름, 프로필 이미지 수정
- 비밀번호 변경 (OAuth 사용자 비활성화)
- 계정 삭제 (소유한 팀 있으면 불가)

### 8.3 UI 폴리싱
- 로딩 상태 (Skeleton)
- 에러 상태 (EmptyState, Toast)
- 반응형 최종 점검
- 모바일 반응형 (PRD 필수 요구사항)

### 8.4 실시간 업데이트 (Supabase Realtime)
- **기술**: Supabase Realtime (postgres_changes)
- **적용 대상**:
  - 칸반 보드: 이슈 상태/순서 변경 실시간 반영
  - 댓글: 새 댓글 실시간 추가
  - 알림: 새 알림 실시간 표시
- **구현 방식**:
  ```typescript
  // useRealtimeIssues 훅 예시
  useEffect(() => {
    const channel = supabase
      .channel('issues-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'issues', filter: `project_id=eq.${projectId}` },
        () => refetchIssues()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [projectId]);
  ```
- **훅 파일**: `src/hooks/useRealtimeSubscription.ts`

### 8.5 배포
- Vercel 연결
- 환경 변수 설정
- 테스트 계정 생성

### 8.6 README 작성 (가산점)
README.md에 다음 내용 포함:
- **프로젝트 소개**: Jira Lite - AI 기반 이슈 트래킹 웹 애플리케이션
- **기술 스택**: Next.js 14, Supabase, Tailwind CSS, shadcn/ui, @dnd-kit, Recharts, Claude API
- **설계 결정 및 확장 (가산점 포인트)**:
  1. Supabase Realtime을 활용한 실시간 업데이트 (칸반, 댓글, 알림)
  2. DB 기반 AI Rate Limiting (Serverless 환경 대응)
  3. RLS 정책으로 팀 멤버십 기반 데이터 접근 제어
  4. AI 응답 캐싱 전략 (description 변경 시만 무효화)
- **실행 방법**: 환경 변수 설정, npm install, npm run dev
- **테스트 계정**: 이메일/비밀번호 제공
- **배포 URL**: Vercel 링크

---

## 폴더 구조 (단순화)

```
src/
├── app/
│   ├── (auth)/              # 로그인, 회원가입
│   ├── (protected)/         # 인증 필요 페이지
│   │   ├── dashboard/
│   │   ├── teams/[teamId]/
│   │   │   └── projects/[projectId]/
│   │   ├── profile/
│   │   └── notifications/
│   ├── api/
│   │   ├── auth/
│   │   ├── teams/
│   │   ├── projects/
│   │   ├── issues/
│   │   ├── ai/
│   │   └── notifications/
│   └── auth/callback/
├── components/
│   ├── layout/              # Header, Sidebar, MobileNav
│   ├── ui/                  # shadcn/ui
│   └── common/              # LoadingSpinner, EmptyState, ConfirmDialog 등
├── features/                # 5개로 단순화 (기존 9개)
│   ├── auth/                # 인증/프로필
│   ├── workspace/           # 팀 + 프로젝트 통합
│   ├── board/               # 이슈 + 칸반 + 댓글 + 서브태스크 통합
│   ├── ai/                  # AI 기능
│   └── notification/        # 알림 + 대시보드
├── hooks/                   # 공통 훅 (신규)
│   ├── use-infinite-scroll.ts
│   ├── use-optimistic-mutation.ts
│   ├── use-debounce.ts
│   └── use-media-query.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── queries.ts       # 공통 쿼리 빌더 (신규)
│   │   └── types.ts
│   ├── ai/
│   │   ├── claude-client.ts
│   │   ├── prompts.ts
│   │   ├── rate-limiter.ts  # DB 기반으로 통일
│   │   └── cache.ts
│   └── utils/               # 공통 유틸 (신규)
│       ├── date.ts          # 한국어 날짜 포맷
│       ├── validation.ts    # Zod 스키마
│       └── error.ts         # API 에러 핸들링
└── types/
```

---

## RLS 정책 요약

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | 본인 + 같은 팀 멤버 | - | 본인만 | - |
| teams | 팀 멤버만 | 인증된 사용자 | OWNER, ADMIN | OWNER만 |
| projects | 팀 멤버만 | 팀 멤버 | OWNER, ADMIN, 소유자 | OWNER, ADMIN, 소유자 |
| issues | 팀 멤버만 | 팀 멤버 (비아카이브) | 팀 멤버 (비아카이브) | 소유자, OWNER, ADMIN |

---

## 데이터 제한 요약 (PRD 전체 반영)

### 개수 제한
| 항목 | 제한 |
|------|------|
| 팀당 프로젝트 | 최대 15개 |
| 프로젝트당 이슈 | 최대 200개 |
| 이슈당 서브태스크 | 최대 20개 |
| 프로젝트당 라벨 | 최대 20개 |
| 이슈당 라벨 | 최대 5개 |
| 커스텀 상태 | 최대 5개 (기본 3개 + 커스텀 5개 = 총 8개) |
| 컬럼당 WIP Limit | 1~50 또는 무제한(null) |

### 문자 길이 제한 (Zod 검증 필수)
| 항목 | 제한 |
|------|------|
| 팀 이름 | 1~50자 |
| 프로젝트 이름 | 1~100자 |
| 프로젝트 설명 | 최대 2000자 |
| 이슈 제목 | 1~200자 |
| 이슈 설명 | 최대 5000자 |
| 서브태스크 제목 | 1~200자 |
| 라벨 이름 | 1~30자 |
| 커스텀 상태 이름 | 1~30자 |
| 댓글 내용 | 1~1000자 |
| 사용자 이름 | 1~50자 |
| 이메일 | 최대 255자 |
| 비밀번호 | 6~100자 |

### 만료 시간
| 항목 | 제한 |
|------|------|
| 로그인 토큰 | 24시간 |
| 비밀번호 재설정 링크 | 1시간 |
| 팀 초대 | 7일 |

### AI 제한
| 항목 | 제한 |
|------|------|
| Rate Limit (분당) | 10회 |
| Rate Limit (일당) | 100회 |
| 요약/제안 최소 description 길이 | 10자 초과 |
| 댓글 요약 최소 댓글 수 | 5개 이상 |

---

## 핵심 파일 목록

### 우선 생성 필요
1. `src/lib/supabase/client.ts` - 브라우저 클라이언트
2. `src/lib/supabase/server.ts` - 서버 클라이언트
3. `src/lib/utils/validation.ts` - Zod 스키마 (보안)
4. `src/lib/utils/error.ts` - API 에러 핸들링
5. `src/middleware.ts` - 인증 미들웨어
6. `src/app/(protected)/layout.tsx` - 보호된 라우트 레이아웃
7. `src/features/auth/context/current-user-context.tsx` - 인증 상태

### 핵심 기능
8. `src/features/board/components/KanbanBoard.tsx` - 칸반 보드
9. `src/features/board/components/IssueDetailModal.tsx` - 이슈 상세
10. `src/lib/ai/claude-client.ts` - Claude API 클라이언트
11. `src/lib/ai/rate-limiter.ts` - AI Rate Limiting (DB 기반)

---

## 보안 체크리스트

- [ ] Zod로 모든 API 입력값 검증
- [ ] RLS 정책 전체 테이블 적용
- [ ] AI Rate Limiting DB 기반 (Serverless 대응)
- [ ] XSS 방지: 마크다운 렌더링 시 sanitize
- [ ] SQL Injection: Supabase 파라미터 바인딩 사용
- [ ] 환경 변수 노출 방지 (NEXT_PUBLIC_ 주의)

---

## UI/UX 디자인 원칙 (AI 느낌 방지)

### 기본 원칙
1. **미니멀리즘** - 꼭 필요한 요소만, 장식 최소화
2. **일관성** - Linear/Notion 스타일 참고
3. **기능 중심** - 화려함보다 사용성
4. **색상 절제** - 회색 베이스 + 포인트 1색

### 구체적 가이드
| 요소 | 값 | 비고 |
|------|-----|------|
| 폰트 | Pretendard | 하나만 사용 |
| 모서리 | rounded-md (6px) | 카드만 rounded-lg |
| 그림자 | shadow-sm | hover: shadow-md |
| 애니메이션 | duration-150 | 필수 인터랙션만 |
| 베이스 색상 | slate 계열 | gray 대신 |
| 포인트 색상 | blue-600 | 하나만 |
| 우선순위 HIGH | red-500 | 뱃지만 |
| 우선순위 MEDIUM | amber-500 | 뱃지만 |
| 우선순위 LOW | green-500 | 뱃지만 |

### AI 버튼 표기
- ❌ "AI 요약", "AI로 분석"
- ✅ "요약 보기", "해결 방법 제안" (Sparkles 아이콘으로 구분)

### 피해야 할 것
- 그라데이션 배경
- 글래스모피즘
- 과도한 애니메이션
- rounded-2xl 이상
- 아이콘 과다 사용
- "AI-Powered", "Smart" 문구
