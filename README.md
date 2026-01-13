# MSA Analyzer - MSA 아키텍처 분리 AI 분석 서비스

## 프로젝트 개요

**MSA Analyzer**는 사용자가 제공한 코드베이스 또는 프로젝트 설명을 Claude AI가 분석하여, 최적의 MSA(Microservice Architecture) 서비스 분리 방안을 제안하는 웹 서비스입니다.

### 주요 특징

- **AI 기반 분석**: Claude Sonnet 4 모델을 활용한 지능형 MSA 설계 분석
- **RAG 파이프라인**: Voyage AI 임베딩 + pgvector를 활용한 MSA 가이드 문서 검색으로 분석 품질 향상
- **코드/텍스트 입력 지원**: ZIP 파일 업로드 또는 텍스트 설명으로 분석 요청 가능
- **인터랙티브 시각화**: React Flow 기반 MSA 구조 다이어그램 제공
- **분석 결과 내보내기**: JSON 형식으로 저장하여 AI에게 프로젝트 생성 요청 가능

---

## 현재 개발 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로젝트 문서 | ✅ 완료 | `docs/` 폴더 참조 |
| 백엔드 기본 구조 | ✅ 완료 | Express.js + ES Modules |
| 프론트엔드 기본 구조 | ✅ 완료 | React 19 + Vite 7 |
| UI 컴포넌트 | ✅ 완료 | shadcn/ui 스타일 적용 |
| Tailwind CSS v4 설정 | ✅ 완료 | v4 문법 적용 |
| API 연동 | ✅ 완료 | 프론트엔드 API 서비스 구조 완료 |
| Supabase DB 연동 | ✅ 완료 | 스키마 및 API 연동 완료 |
| Claude AI 연동 | ✅ 완료 | MSA 분석 엔진 + 비용 관리 구현 |
| RAG 파이프라인 | ✅ 완료 | Voyage AI 임베딩 + pgvector 검색 |
| 문서 임베딩 CLI | ✅ 완료 | `npm run embed` 스크립트 제공 |

---

## 기술 스택

### Frontend
| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | 19.x | UI 프레임워크 |
| **Vite** | 7.x | 빌드 도구 |
| **Tailwind CSS** | 4.x | 스타일링 |
| **shadcn/ui** | - | UI 컴포넌트 (Radix UI 기반) |
| **React Flow** (@xyflow/react) | 12.x | MSA 다이어그램 시각화 |
| **React Router** | 7.x | 클라이언트 라우팅 |
| **Axios** | 1.x | HTTP 클라이언트 |
| **Lucide React** | - | 아이콘 |

### Backend
| 기술 | 버전 | 용도 |
|------|------|------|
| **Node.js** | 20.x | 런타임 |
| **Express.js** | 4.x | 웹 프레임워크 |
| **Multer** | 1.x | 파일 업로드 처리 |
| **AdmZip** | 0.5.x | ZIP 파일 파싱 |
| **express-rate-limit** | 7.x | API 요청 제한 |

### Database & AI
| 기술 | 용도 |
|------|------|
| **Supabase** | PostgreSQL + pgvector (벡터 검색) |
| **Claude API** (claude-sonnet-4) | 코드/텍스트 MSA 분석 |
| **Voyage AI** (voyage-3) | 문서 벡터 임베딩 |

---

## 프로젝트 구조

```
msa/
├── docs/                              # 프로젝트 문서
│   ├── MSA_정의서.md
│   ├── MSA_Analyzer_설계문서.md
│   ├── API_명세서.md
│   ├── DB_스키마_상세.md
│   ├── 청킹_전략_정의서.md
│   ├── 화면_설계서.md
│   ├── 프로젝트_계획서.md
│   ├── RAG_파이프라인_구현_가이드.md
│   └── Claude_API_크레딧_관리_가이드.md
│
├── backend/                           # 백엔드 서버
│   ├── src/
│   │   ├── index.js                  # Express 서버 진입점
│   │   ├── lib/
│   │   │   ├── supabase.js           # Supabase 클라이언트
│   │   │   ├── claude.js             # Claude API + 비용 추적
│   │   │   └── voyage.js             # Voyage AI 임베딩
│   │   ├── services/
│   │   │   ├── analysisService.js    # MSA 분석 서비스 (RAG 통합)
│   │   │   └── ragService.js         # RAG 파이프라인 서비스
│   │   ├── utils/
│   │   │   ├── zipParser.js          # ZIP 파일 구조 추출
│   │   │   └── chunker.js            # Markdown 청킹 유틸
│   │   └── routes/
│   │       ├── analysis.js           # 분석 API (코드/텍스트)
│   │       ├── rag.js                # RAG 검색 API
│   │       └── health.js             # 헬스체크 API
│   ├── scripts/
│   │   └── embedDocuments.js         # 문서 임베딩 CLI 스크립트
│   ├── supabase/
│   │   └── schema.sql                # DB 스키마 정의
│   ├── .env.example                  # 환경 변수 예시
│   └── package.json
│
├── frontend/                          # 프론트엔드 앱
│   ├── src/
│   │   ├── index.css                 # Tailwind CSS v4 설정
│   │   ├── main.jsx                  # React 진입점
│   │   ├── App.jsx                   # 라우터 설정
│   │   ├── lib/
│   │   │   ├── utils.js              # cn() 유틸리티
│   │   │   └── api.js                # Axios API 클라이언트
│   │   ├── services/
│   │   │   └── analysisService.js    # 분석 API 서비스
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui 컴포넌트
│   │   │   │   ├── button.jsx
│   │   │   │   ├── card.jsx
│   │   │   │   ├── tabs.jsx
│   │   │   │   ├── badge.jsx
│   │   │   │   ├── input.jsx
│   │   │   │   ├── textarea.jsx
│   │   │   │   ├── accordion.jsx
│   │   │   │   └── alert.jsx
│   │   │   ├── common/
│   │   │   │   ├── Header.jsx
│   │   │   │   └── Footer.jsx
│   │   │   └── analysis/
│   │   │       ├── CodeUploadTab.jsx
│   │   │       ├── TextDescriptionTab.jsx
│   │   │       ├── LanguageSelector.jsx
│   │   │       ├── TabSelector.jsx
│   │   │       └── ArchitectureDiagram.jsx
│   │   └── pages/
│   │       ├── MainPage.jsx          # 메인 (분석 입력)
│   │       └── AnalysisResultPage.jsx # 분석 결과
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── package.json                       # 루트 (workspaces 설정)
└── README.md
```

---

## 실행 방법

### 1. 의존성 설치

```bash
# 전체 설치 (루트, 백엔드, 프론트엔드)
npm run install:all

# 또는 개별 설치
npm install                 # 루트 (concurrently)
cd backend && npm install   # 백엔드
cd frontend && npm install  # 프론트엔드
```

### 2. 환경 변수 설정

```bash
# backend/.env 파일 생성
cd backend
cp .env.example .env
```

`.env` 파일 내용:

```env
# 서버 설정
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Supabase 설정 (필수)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Claude API 설정 (필수)
ANTHROPIC_API_KEY=sk-ant-your_api_key

# Claude API 비용 제한 (선택)
CLAUDE_MONTHLY_LIMIT=10
CLAUDE_WARNING_THRESHOLD=5

# Voyage AI 설정 (RAG용, 선택)
VOYAGE_API_KEY=pa-your_voyage_api_key
```

### 3. 데이터베이스 설정

Supabase SQL Editor에서 `backend/supabase/schema.sql` 파일을 실행하여 테이블과 함수를 생성합니다.

### 4. 개발 서버 실행

```bash
# 동시 실행 (백엔드 + 프론트엔드)
npm run dev

# 또는 개별 실행
npm run dev:backend   # 백엔드 (포트 3000)
npm run dev:frontend  # 프론트엔드 (포트 5173)
```

### 5. 접속

- **프론트엔드**: http://localhost:5173
- **백엔드 API**: http://localhost:3000

---

## NPM 스크립트

### 루트 (package.json)

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 백엔드 + 프론트엔드 동시 실행 |
| `npm run dev:backend` | 백엔드만 실행 |
| `npm run dev:frontend` | 프론트엔드만 실행 |
| `npm run build` | 프론트엔드 프로덕션 빌드 |
| `npm run build:render` | Render 배포용 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run start:render` | Render 환경 서버 실행 |
| `npm run install:all` | 전체 의존성 설치 |
| `npm run lint` | 전체 린트 검사 |

### 백엔드 (backend/package.json)

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 (nodemon) |
| `npm start` | 프로덕션 서버 |
| `npm run lint` | ESLint 검사 |
| `npm run embed` | 문서 임베딩 CLI |
| `npm run embed:all` | docs 폴더 전체 임베딩 |
| `npm run embed:folder` | 특정 폴더 임베딩 |
| `npm run embed:list` | 임베딩된 문서 목록 |

---

## 주요 페이지

### 메인 페이지 (`/`)

- **코드 업로드 탭**: .zip 파일 업로드 + 언어/프레임워크 선택
- **텍스트 설명 탭**: 프로젝트 설명 입력 (50자 이상)
- **지원 언어**: Java/Spring, Node.js/Express, React

### 분석 결과 페이지 (`/analysis/:id`)

- **프로젝트 요약**: 도메인, 주요 기능, 인증/결제 방식
- **서비스 분리 제안**: 서비스명, 책임, 유형(Core/Supporting/Generic), DB
- **MSA 구조 다이어그램**: React Flow 기반 인터랙티브 시각화
- **서비스 상세 정보**: 엔드포인트, 의존성, 소스 파일
- **권고사항**: 아키텍처 권고 및 주의사항
- **통신 방식 제안**: REST, Event, gRPC, MessageQueue
- **AI 프로젝트 생성 가이드**: JSON 저장 후 AI에게 전달하여 프로젝트 생성

---

## API 엔드포인트

### 분석 API

| Method | Endpoint | 설명 | 요청 본문 |
|--------|----------|------|-----------|
| POST | `/api/analysis/code` | 코드 업로드 분석 | `multipart/form-data` (file, language, description) |
| POST | `/api/analysis/text` | 텍스트 설명 분석 | `{ description, language }` |
| GET | `/api/analysis/:id` | 분석 결과 조회 | - |
| DELETE | `/api/analysis/:id` | 분석 결과 삭제 | - |

### RAG API

| Method | Endpoint | 설명 | 요청 본문 |
|--------|----------|------|-----------|
| POST | `/api/rag/search` | MSA 가이드 벡터 검색 | `{ query, limit?, tags?, threshold? }` |
| GET | `/api/rag/documents` | RAG 문서 목록 조회 | - |
| GET | `/api/rag/documents/:id/chunks` | 문서 청크 조회 | - |
| DELETE | `/api/rag/documents/:id` | RAG 문서 삭제 | - |

### 유틸리티 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/health` | 서버 상태 확인 |

---

## 아키텍처 상세

### 분석 흐름

```
1. 사용자 입력 (코드 ZIP 또는 텍스트)
        ↓
2. 입력 처리
   - 코드: ZIP 파싱 → 파일 구조 추출 → 코드 미리보기
   - 텍스트: 설명 검증 (50자 이상)
        ↓
3. RAG 검색 (Voyage AI)
   - 입력 내용 임베딩 생성
   - pgvector로 관련 MSA 가이드 검색
   - 검색 결과를 컨텍스트로 추가
        ↓
4. Claude AI 분석
   - 시스템 프롬프트 (MSA 전문가 역할)
   - 사용자 프롬프트 (입력 + RAG 컨텍스트)
   - JSON 형식 응답 생성
        ↓
5. 결과 저장 (Supabase)
   - analyses 테이블: 분석 메타데이터
   - analysis_services: 서비스 제안
   - analysis_recommendations: 권고사항
   - analysis_communications: 통신 방식
        ↓
6. 결과 표시
   - 서비스 분리표
   - React Flow 다이어그램
   - 권고사항 및 통신 방식
```

### 서비스 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| **Core** | 핵심 비즈니스 로직 | Order, Product |
| **Supporting** | 핵심 서비스 지원 | User, Auth |
| **Generic** | 범용 서비스 | Payment, Notification |

### 통신 방식

| 방식 | 용도 | 특징 |
|------|------|------|
| **REST** | 동기적 요청/응답 | 간단한 CRUD |
| **Event** | 비동기 이벤트 기반 | 느슨한 결합 |
| **gRPC** | 고성능 내부 통신 | 타입 안전성 |
| **MessageQueue** | 메시지 큐 기반 | 안정적 전달 |

---

## RAG 파이프라인

### 문서 임베딩 CLI

```bash
cd backend

# 단일 문서 임베딩
npm run embed -- ../docs/MSA_정의서.md

# docs 폴더 전체 임베딩
npm run embed:all

# 특정 폴더만 임베딩
npm run embed:folder -- msa-guides

# 임베딩된 문서 목록 조회
npm run embed:list

# 문서 삭제
npm run embed -- --delete doc_MSA_정의서_abc123
```

### 청킹 전략

- **H2/H3 기반 분할**: Markdown 헤더 기준 섹션 분리
- **최소 100자 / 최대 1000자**: 적정 청크 크기 유지
- **자동 태그 추출**: MSA, DDD, API-Gateway 등 키워드 태깅
- **청크 타입 분류**: definition, guide, example, warning 등

### 벡터 검색

- **모델**: Voyage AI voyage-3 (1024차원)
- **검색 함수**: `match_chunks`, `match_chunks_with_tags`
- **유사도 임계값**: 0.3 (기본값)

---

## 비용 관리

### Claude API 비용 추적

```javascript
// backend/src/lib/claude.js
const COST_CONFIG = {
  MONTHLY_LIMIT: 10,        // 월간 한도 (달러)
  WARNING_THRESHOLD: 5,     // 경고 임계값 (달러)
  INPUT_COST_PER_MILLION: 3,   // $3 / 1M input tokens
  OUTPUT_COST_PER_MILLION: 15  // $15 / 1M output tokens
};
```

- 요청별 토큰 사용량 추적
- 경고 임계값 도달 시 API 호출 거부
- 콘솔에 실시간 비용 출력

### Voyage AI Rate Limit

- **무료 플랜**: 3 RPM (분당 3회)
- **배치 처리**: 10개 청크씩 처리
- **대기 시간**: 배치 간 21초 대기

---

## 배포

### Render 배포

```bash
# 빌드 명령어
npm run build:render

# 시작 명령어
npm run start:render
```

### 환경 변수 (Render)

```
NODE_ENV=production
PORT=10000
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
VOYAGE_API_KEY=...
```

---

## 문서

자세한 내용은 `docs/` 폴더의 문서들을 참조하세요:

| 문서 | 설명 |
|------|------|
| [MSA 정의서](docs/MSA_정의서.md) | MSA 개념 및 원칙 |
| [설계문서](docs/MSA_Analyzer_설계문서.md) | 시스템 아키텍처 설계 |
| [API 명세서](docs/API_명세서.md) | REST API 상세 명세 |
| [DB 스키마](docs/DB_스키마_상세.md) | 데이터베이스 구조 |
| [청킹 전략](docs/청킹_전략_정의서.md) | RAG 청킹 전략 |
| [화면 설계서](docs/화면_설계서.md) | UI/UX 설계 |
| [프로젝트 계획서](docs/프로젝트_계획서.md) | 개발 계획 |
| [RAG 파이프라인 가이드](docs/RAG_파이프라인_구현_가이드.md) | RAG 구현 상세 |
| [Claude API 크레딧 관리](docs/Claude_API_크레딧_관리_가이드.md) | 비용 관리 가이드 |

---

## 라이선스

MIT License
