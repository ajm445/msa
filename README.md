# MSA Analyzer - MSA 아키텍처 분리 AI 분석 서비스

## 프로젝트 개요

**MSA Analyzer**는 사용자가 제공한 코드베이스 또는 프로젝트 설명을 AI가 분석하여, 최적의 MSA(Microservice Architecture) 서비스 분리 방안을 제안하는 웹 서비스입니다.

## 현재 개발 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로젝트 문서 | ✅ 완료 | `docs/` 폴더 참조 |
| 백엔드 기본 구조 | ✅ 완료 | Express.js 서버 |
| 프론트엔드 기본 구조 | ✅ 완료 | React + Vite |
| UI 컴포넌트 | ✅ 완료 | shadcn/ui 스타일 적용 |
| Tailwind CSS v4 설정 | ✅ 완료 | v4 문법 적용 |
| API 연동 | ✅ 완료 | 프론트엔드 API 서비스 구조 완료 |
| Supabase DB 연동 | ✅ 완료 | 스키마 및 API 연동 완료 |
| Claude AI 연동 | ✅ 완료 | MSA 분석 엔진 구현 완료 |
| RAG 파이프라인 | ❌ 미완료 | - |

## 기술 스택

### Frontend
- **React** 19.x
- **Vite** 7.x
- **Tailwind CSS** 4.x
- **shadcn/ui** (Radix UI 기반)
- **React Flow** - MSA 다이어그램 시각화
- **Lucide React** - 아이콘

### Backend
- **Node.js** 20.x
- **Express.js** 4.x
- **Multer** - 파일 업로드
- **Supabase** - PostgreSQL + pgvector

### AI/ML
- **Claude API** - 코드/텍스트 분석
- **Voyage AI** - 코드 임베딩 (예정)

## 프로젝트 구조

```
msa/
├── docs/                          # 프로젝트 문서
│   ├── MSA_정의서.md
│   ├── MSA_Analyzer_설계문서.md
│   ├── API_명세서.md
│   ├── DB_스키마_상세.md
│   ├── 청킹_전략_정의서.md
│   ├── 화면_설계서.md
│   └── 프로젝트_계획서.md
│
├── backend/                       # 백엔드 서버
│   ├── src/
│   │   ├── index.js              # Express 서버 진입점
│   │   ├── lib/
│   │   │   ├── supabase.js       # Supabase 클라이언트
│   │   │   └── claude.js         # Claude API 클라이언트
│   │   ├── services/
│   │   │   └── analysisService.js # MSA 분석 서비스
│   │   ├── utils/
│   │   │   └── zipParser.js      # ZIP 파일 파싱 유틸
│   │   └── routes/
│   │       ├── analysis.js       # 분석 API (Claude 연동)
│   │       ├── rag.js            # RAG 검색 API
│   │       └── health.js         # 헬스체크 API
│   ├── supabase/
│   │   └── schema.sql            # DB 스키마 정의
│   ├── .env.example              # 환경 변수 예시
│   └── package.json
│
├── frontend/                      # 프론트엔드 앱
│   ├── src/
│   │   ├── index.css             # Tailwind CSS v4 설정
│   │   ├── main.jsx              # React 진입점
│   │   ├── App.jsx               # 라우터 설정
│   │   ├── lib/
│   │   │   ├── utils.js          # cn() 유틸리티
│   │   │   └── api.js            # Axios API 클라이언트
│   │   ├── services/
│   │   │   └── analysisService.js # 분석 API 서비스
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui 컴포넌트
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
│   │   │       └── ArchitectureDiagram.jsx
│   │   └── pages/
│   │       ├── MainPage.jsx      # 메인 (분석 입력)
│   │       └── AnalysisResultPage.jsx  # 분석 결과
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

## 실행 방법

### 1. 의존성 설치

```bash
# 백엔드
cd backend
npm install

# 프론트엔드
cd frontend
npm install
```

### 2. 환경 변수 설정

```bash
# backend/.env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
ANTHROPIC_API_KEY=your_claude_api_key
VOYAGE_API_KEY=your_voyage_api_key
```

### 3. 개발 서버 실행

```bash
# 백엔드 (포트 3000)
cd backend
npm run dev

# 프론트엔드 (포트 5173)
cd frontend
npm run dev
```

### 4. 접속

- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:3000

## 주요 페이지

### 메인 페이지 (`/`)
- 코드 업로드 탭: .zip 파일 업로드 + 언어 선택
- 텍스트 설명 탭: 프로젝트 설명 입력

### 분석 결과 페이지 (`/analysis/:id`)
- 프로젝트 요약
- 서비스 분리 제안표
- MSA 구조 다이어그램 (React Flow)
- 서비스 상세 정보
- 권고사항
- 통신 방식 제안

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/analysis/code` | 코드 업로드 분석 |
| POST | `/api/analysis/text` | 텍스트 설명 분석 |
| GET | `/api/analysis/:id` | 분석 결과 조회 |
| DELETE | `/api/analysis/:id` | 분석 결과 삭제 |
| POST | `/api/rag/search` | MSA 가이드 검색 |
| GET | `/api/health` | 서버 상태 확인 |

## 다음 단계

1. ~~Tailwind CSS v4 스타일 적용 문제 해결~~ ✅
2. ~~프론트엔드 API 연동 구조 설정~~ ✅
3. ~~Supabase 데이터베이스 연동~~ ✅
4. ~~Claude API 연동 (분석 엔진)~~ ✅
5. Voyage AI 임베딩 연동 (RAG)
6. 프론트엔드-백엔드 통합 테스트

## 문서

자세한 내용은 `docs/` 폴더의 문서들을 참조하세요:

- [MSA 정의서](docs/MSA_정의서.md)
- [설계문서](docs/MSA_Analyzer_설계문서.md)
- [API 명세서](docs/API_명세서.md)
- [DB 스키마](docs/DB_스키마_상세.md)
- [프로젝트 계획서](docs/프로젝트_계획서.md)
