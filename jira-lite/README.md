<p align="center">
  <h1 align="center">Jira Lite</h1>
  <p align="center">AI 기반 경량 이슈 트래킹 시스템</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-black?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Claude-AI-8B5CF6?logo=anthropic&logoColor=white" alt="Claude AI" />
</p>

<p align="center">
  <a href="https://jira-lite-1yqa.vercel.app">Live Demo</a> •
  <a href="#주요-기능">주요 기능</a> •
  <a href="#시작하기">시작하기</a> •
  <a href="#기술-스택">기술 스택</a>
</p>

---

## 소개

**Jira Lite**는 Jira의 핵심 기능을 간소화하고 AI 어시스턴트를 통해 생산성을 높일 수 있는 경량 이슈 트래킹 시스템입니다. Claude AI를 활용하여 이슈 요약, 다음 액션 제안, 라벨 추천, 댓글 요약 등의 스마트한 기능을 제공합니다.

### 데모

🔗 **Live Demo**: [https://jira-lite-1yqa.vercel.app](https://jira-lite-1yqa.vercel.app)

---

## 주요 기능

### 🎯 이슈 관리
| 기능 | 설명 |
|------|------|
| **칸반 보드** | 드래그 앤 드롭으로 이슈 상태 변경 |
| **이슈 상세** | 제목, 설명, 담당자, 우선순위, 마감일, 라벨 관리 |
| **댓글 시스템** | 이슈별 댓글 작성 및 관리 |
| **변경 히스토리** | 모든 필드 변경 이력 자동 기록 |
| **마감일 알림** | 기한 임박/초과 이슈 시각적 표시 |

### 🤖 AI 어시스턴트
| 기능 | 설명 |
|------|------|
| **이슈 요약** | 이슈 내용을 AI가 자동으로 요약 (스트리밍 지원) |
| **다음 액션 제안** | AI가 추천하는 다음 작업 단계 및 블로커 분석 |
| **라벨 추천** | 이슈 내용 기반 자동 라벨 추천 (신뢰도 표시) |
| **댓글 요약** | 5개 이상의 댓글 요약 (주요 포인트, 결정사항, 미해결 질문) |
| **중복 이슈 감지** | 유사한 이슈 자동 탐지 |

### 👥 팀 & 프로젝트
| 기능 | 설명 |
|------|------|
| **팀 관리** | 팀 생성, 멤버 초대, 역할 관리 (Owner, Admin, Member) |
| **프로젝트 관리** | 프로젝트 생성, 아카이브, 삭제 |
| **커스텀 상태** | 프로젝트별 워크플로우 상태 커스터마이징 |
| **라벨 관리** | 프로젝트별 라벨 생성 및 색상 지정 |

### 📊 대시보드
- **개인 대시보드**: 내게 할당된 이슈, 기한 임박/초과 이슈, 최근 댓글
- **동적 브레드크럼**: URL 기반 실시간 네비게이션

### 🔐 인증
- 이메일/비밀번호 로그인
- Google OAuth 로그인
- 비밀번호 재설정

### 🔔 알림
- 실시간 알림 (이슈 배정, 멘션, 댓글)
- 개별/전체 읽음 처리

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| **Next.js** | 15.5 | App Router, Server Actions |
| **React** | 19 | UI 라이브러리 |
| **TypeScript** | 5 | 타입 안정성 |
| **Tailwind CSS** | 4 | 스타일링 |
| **Radix UI** | - | Headless UI 컴포넌트 |
| **TanStack Query** | 5 | 서버 상태 관리 |
| **React Hook Form** | 7 | 폼 관리 |
| **Zod** | 4 | 스키마 검증 |
| **dnd-kit** | 6 | 드래그 앤 드롭 |
| **Recharts** | 3 | 차트 |

### Backend
| 기술 | 용도 |
|------|------|
| **Supabase** | PostgreSQL 데이터베이스, 인증, RLS |
| **Anthropic Claude** | AI 기능 (요약, 제안, 라벨 추천 등) |
| **Vercel** | 배포 및 호스팅 |

---

## 프로젝트 구조

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # 인증 페이지 (로그인, 회원가입)
│   ├── (protected)/            # 인증 필요 페이지
│   │   ├── dashboard/          # 대시보드
│   │   ├── profile/            # 프로필
│   │   └── teams/              # 팀 & 프로젝트
│   │       └── [teamId]/
│   │           └── projects/
│   │               └── [projectId]/
│   │                   ├── @panel/     # Parallel Route (이슈 패널)
│   │                   └── issues/     # 이슈 상세
│   └── api/                    # API Routes
│       └── ai/                 # AI API 엔드포인트
│           ├── summary/        # 이슈 요약
│           ├── suggestion/     # 다음 액션 제안
│           ├── labels/         # 라벨 추천
│           ├── comments/       # 댓글 요약
│           └── duplicates/     # 중복 감지
├── components/
│   ├── layout/                 # 레이아웃 컴포넌트
│   └── ui/                     # shadcn/ui 컴포넌트
├── features/                   # 기능별 모듈
│   ├── auth/                   # 인증
│   │   ├── actions/           # Server Actions
│   │   └── context/           # 인증 컨텍스트
│   ├── board/                  # 칸반 보드 & 이슈
│   │   ├── actions/           # 이슈 CRUD
│   │   ├── components/        # 칸반 컴포넌트
│   │   └── hooks/             # 커스텀 훅
│   ├── dashboard/              # 대시보드
│   ├── notifications/          # 알림
│   └── workspace/              # 팀 & 프로젝트 설정
└── lib/                        # 유틸리티 & 설정
    ├── ai/                     # AI 관련 유틸
    │   ├── claude-client.ts   # Claude API 클라이언트
    │   ├── streaming.ts       # 스트리밍 응답 처리
    │   ├── prompts.ts         # AI 프롬프트
    │   ├── rate-limiter.ts    # Rate Limiting
    │   └── cache.ts           # AI 응답 캐시
    ├── supabase/               # Supabase 클라이언트
    └── utils/                  # 공통 유틸리티
```

---

## 시작하기

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn
- Supabase 계정
- Anthropic API 키 (AI 기능 사용 시)

### 설치

**1. 저장소 클론**
```bash
git clone https://github.com/eli-kardis/Jira-Lite.git
cd Jira-Lite/jira-lite
```

**2. 의존성 설치**
```bash
npm install
```

**3. 환경변수 설정**
```bash
cp .env.example .env.local
```

`.env.local` 파일 설정:
```env
# Supabase (필수)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic (AI 기능 사용 시)
ANTHROPIC_API_KEY=your_anthropic_api_key

# App URL (배포 시)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**4. Supabase 설정**
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Authentication → Providers에서 Email 및 Google OAuth 활성화
3. SQL Editor에서 데이터베이스 스키마 실행

**5. 개발 서버 실행**
```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

### 빌드 & 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm start
```

---

## 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|:----:|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key | ✅ |
| `ANTHROPIC_API_KEY` | Anthropic API 키 | AI 기능 |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (OAuth 콜백용) | 배포 시 |

---

## 데이터베이스 스키마

### 주요 테이블

```
profiles          # 사용자 프로필
teams             # 팀
team_members      # 팀 멤버십 (역할: owner, admin, member)
projects          # 프로젝트
statuses          # 워크플로우 상태
labels            # 라벨
issues            # 이슈
issue_labels      # 이슈-라벨 매핑
comments          # 댓글
issue_history     # 변경 히스토리
notifications     # 알림
ai_usage_logs     # AI 사용량 로그
ai_cache          # AI 응답 캐시
```

---

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |

---

## 라이선스

MIT License

---

<p align="center">
  Made with ❤️ using Next.js, Supabase, and Claude AI
</p>
