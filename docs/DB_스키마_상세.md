# DB 스키마 상세

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | DB 스키마 상세 |
| 버전 | 1.0 |
| 작성일 | 2026-01-07 |
| 목적 | MSA 분석 AI 서비스 데이터베이스 설계 |
| 데이터베이스 | Supabase (PostgreSQL + pgvector) |

---

## 1. 데이터베이스 개요

### 1.1 구성

```
┌─────────────────────────────────────────────────────────────┐
│                      Supabase                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   PostgreSQL                         │   │
│  │                                                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  analyses   │  │   chunks    │  │  documents  │  │   │
│  │  │  (분석결과)  │  │ (RAG 청크)  │  │  (문서정보) │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │                                                      │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │              pgvector extension              │    │   │
│  │  │           (벡터 유사도 검색 지원)             │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 테이블 목록

| 테이블명 | 설명 | 용도 |
|----------|------|------|
| analyses | 분석 결과 저장 | 코드/텍스트 분석 결과 |
| analysis_services | 분석된 서비스 정보 | 서비스 분리 제안 |
| analysis_recommendations | 분석 권고사항 | 개선 제안, 경고 |
| documents | RAG 문서 메타정보 | 원본 문서 관리 |
| chunks | RAG 청크 저장 | 임베딩된 문서 조각 |

---

## 2. 테이블 상세

### 2.1 analyses (분석 결과)

분석 요청과 결과를 저장하는 메인 테이블

```sql
CREATE TABLE analyses (
  -- 기본 정보
  id VARCHAR(50) PRIMARY KEY,           -- 분석 ID (anls_xxxxx)
  status VARCHAR(20) NOT NULL,          -- 상태 (pending, processing, completed, failed)
  input_type VARCHAR(20) NOT NULL,      -- 입력 타입 (code, text)
  
  -- 입력 데이터
  input_description TEXT,               -- 텍스트 설명 (text 타입일 때)
  input_language VARCHAR(30),           -- 언어/프레임워크
  input_file_name VARCHAR(255),         -- 업로드 파일명 (code 타입일 때)
  input_file_size INTEGER,              -- 파일 크기 (bytes)
  
  -- 분석 요약
  detected_domain VARCHAR(100),         -- 감지된 도메인 (이커머스, 소셜미디어 등)
  total_files INTEGER,                  -- 전체 파일 수
  analyzed_files INTEGER,               -- 분석된 파일 수
  
  -- 다이어그램 데이터
  diagram_data JSONB,                   -- 노드, 엣지 정보 (JSON)
  
  -- 파싱된 정보 (텍스트 분석 시)
  parsed_data JSONB,                    -- 파싱된 기능, 인증방식 등
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 제약조건
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_input_type CHECK (input_type IN ('code', 'text'))
);

-- 인덱스
CREATE INDEX idx_analyses_status ON analyses(status);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_input_type ON analyses(input_type);
```

**컬럼 설명**

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | VARCHAR(50) | ✅ | 고유 ID (anls_ + 랜덤 문자열) |
| status | VARCHAR(20) | ✅ | pending, processing, completed, failed |
| input_type | VARCHAR(20) | ✅ | code 또는 text |
| input_description | TEXT | ❌ | 텍스트 입력 시 설명 내용 |
| input_language | VARCHAR(30) | ❌ | java-spring, node-express, react |
| input_file_name | VARCHAR(255) | ❌ | 업로드된 파일명 |
| input_file_size | INTEGER | ❌ | 파일 크기 (bytes) |
| detected_domain | VARCHAR(100) | ❌ | 감지된 도메인 |
| total_files | INTEGER | ❌ | 분석 대상 파일 수 |
| analyzed_files | INTEGER | ❌ | 실제 분석된 파일 수 |
| diagram_data | JSONB | ❌ | 다이어그램 JSON 데이터 |
| parsed_data | JSONB | ❌ | 파싱된 정보 (텍스트 분석 시) |
| created_at | TIMESTAMP | ✅ | 생성 시간 |
| updated_at | TIMESTAMP | ✅ | 수정 시간 |

**diagram_data 예시**
```json
{
  "nodes": [
    { "id": "user", "label": "User Service", "type": "Supporting" },
    { "id": "order", "label": "Order Service", "type": "Core" }
  ],
  "edges": [
    { "from": "order", "to": "user", "label": "REST" }
  ]
}
```

**parsed_data 예시 (텍스트 분석 시)**
```json
{
  "domain": "이커머스 (쇼핑몰)",
  "features": ["회원가입", "상품 관리", "주문", "결제"],
  "authMethod": ["소셜 로그인"],
  "paymentMethod": ["카드", "계좌이체"]
}
```

---

### 2.2 analysis_services (분석된 서비스)

분석 결과로 제안된 서비스 목록

```sql
CREATE TABLE analysis_services (
  -- 기본 정보
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(50) NOT NULL,     -- 분석 ID (FK)
  
  -- 서비스 정보
  service_name VARCHAR(100) NOT NULL,   -- 서비스명
  responsibility TEXT,                   -- 책임/역할 설명
  service_type VARCHAR(30),             -- Core, Supporting, Generic
  
  -- 상세 정보
  endpoints TEXT[],                     -- API 엔드포인트 배열
  database_name VARCHAR(100),           -- 권장 DB명
  dependencies TEXT[],                  -- 의존하는 서비스 목록
  
  -- 통신 방식
  communication_type VARCHAR(30),       -- REST, gRPC, Event, MessageQueue
  
  -- 순서 (표시용)
  display_order INTEGER DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 외래키
  CONSTRAINT fk_analysis 
    FOREIGN KEY (analysis_id) 
    REFERENCES analyses(id) 
    ON DELETE CASCADE,
    
  -- 제약조건
  CONSTRAINT valid_service_type CHECK (service_type IN ('Core', 'Supporting', 'Generic'))
);

-- 인덱스
CREATE INDEX idx_analysis_services_analysis_id ON analysis_services(analysis_id);
CREATE INDEX idx_analysis_services_type ON analysis_services(service_type);
```

**컬럼 설명**

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | SERIAL | ✅ | 자동 증가 ID |
| analysis_id | VARCHAR(50) | ✅ | 분석 ID (FK) |
| service_name | VARCHAR(100) | ✅ | 서비스명 (User Service 등) |
| responsibility | TEXT | ❌ | 서비스 책임 설명 |
| service_type | VARCHAR(30) | ❌ | Core, Supporting, Generic |
| endpoints | TEXT[] | ❌ | API 엔드포인트 배열 |
| database_name | VARCHAR(100) | ❌ | 권장 데이터베이스명 |
| dependencies | TEXT[] | ❌ | 의존 서비스 목록 |
| communication_type | VARCHAR(30) | ❌ | 통신 방식 |
| display_order | INTEGER | ❌ | 표시 순서 |
| created_at | TIMESTAMP | ✅ | 생성 시간 |

---

### 2.3 analysis_recommendations (권고사항)

분석 결과에 대한 권고사항, 경고, 정보

```sql
CREATE TABLE analysis_recommendations (
  -- 기본 정보
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(50) NOT NULL,     -- 분석 ID (FK)
  
  -- 권고 내용
  recommendation_type VARCHAR(20) NOT NULL,  -- info, warning, error
  message TEXT NOT NULL,                     -- 권고 메시지
  suggestion TEXT,                           -- 개선 제안
  
  -- 관련 서비스 (선택)
  related_service VARCHAR(100),         -- 관련 서비스명
  
  -- 순서
  display_order INTEGER DEFAULT 0,
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- 외래키
  CONSTRAINT fk_analysis 
    FOREIGN KEY (analysis_id) 
    REFERENCES analyses(id) 
    ON DELETE CASCADE,
    
  -- 제약조건
  CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN ('info', 'warning', 'error'))
);

-- 인덱스
CREATE INDEX idx_recommendations_analysis_id ON analysis_recommendations(analysis_id);
CREATE INDEX idx_recommendations_type ON analysis_recommendations(recommendation_type);
```

**컬럼 설명**

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | SERIAL | ✅ | 자동 증가 ID |
| analysis_id | VARCHAR(50) | ✅ | 분석 ID (FK) |
| recommendation_type | VARCHAR(20) | ✅ | info, warning, error |
| message | TEXT | ✅ | 권고 메시지 |
| suggestion | TEXT | ❌ | 개선 제안 |
| related_service | VARCHAR(100) | ❌ | 관련 서비스명 |
| display_order | INTEGER | ❌ | 표시 순서 |
| created_at | TIMESTAMP | ✅ | 생성 시간 |

---

### 2.4 documents (RAG 문서)

RAG용 원본 문서 메타정보

```sql
CREATE TABLE documents (
  -- 기본 정보
  id VARCHAR(50) PRIMARY KEY,           -- 문서 ID
  name VARCHAR(255) NOT NULL,           -- 문서명
  version VARCHAR(20),                  -- 버전
  
  -- 문서 정보
  description TEXT,                     -- 문서 설명
  file_path VARCHAR(500),               -- 파일 경로
  
  -- 청킹 정보
  total_chunks INTEGER DEFAULT 0,       -- 총 청크 수
  
  -- 상태
  status VARCHAR(20) DEFAULT 'active',  -- active, archived
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_name ON documents(name);
```

**컬럼 설명**

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | VARCHAR(50) | ✅ | 문서 ID (doc_xxxxx) |
| name | VARCHAR(255) | ✅ | 문서명 |
| version | VARCHAR(20) | ❌ | 문서 버전 |
| description | TEXT | ❌ | 문서 설명 |
| file_path | VARCHAR(500) | ❌ | 원본 파일 경로 |
| total_chunks | INTEGER | ❌ | 청크 수 |
| status | VARCHAR(20) | ❌ | active, archived |
| created_at | TIMESTAMP | ✅ | 생성 시간 |
| updated_at | TIMESTAMP | ✅ | 수정 시간 |

---

### 2.5 chunks (RAG 청크)

임베딩된 문서 청크 저장 (벡터 검색용)

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE chunks (
  -- 기본 정보
  id VARCHAR(50) PRIMARY KEY,           -- 청크 ID
  document_id VARCHAR(50) NOT NULL,     -- 문서 ID (FK)
  
  -- 위치 정보
  section VARCHAR(255) NOT NULL,        -- 섹션명
  parent_section VARCHAR(255),          -- 상위 섹션명
  
  -- 내용
  content TEXT NOT NULL,                -- 청크 내용
  
  -- 메타데이터
  tags TEXT[],                          -- 태그 배열
  chunk_type VARCHAR(30),               -- definition, example, guide 등
  language VARCHAR(10) DEFAULT 'ko',    -- 언어
  version VARCHAR(20),                  -- 버전
  
  -- 임베딩 벡터
  embedding VECTOR(1024),               -- Voyage AI 임베딩 (1024차원)
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 외래키
  CONSTRAINT fk_document 
    FOREIGN KEY (document_id) 
    REFERENCES documents(id) 
    ON DELETE CASCADE
);

-- 벡터 검색 인덱스 (IVFFlat)
CREATE INDEX idx_chunks_embedding ON chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 일반 인덱스
CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_section ON chunks(section);
CREATE INDEX idx_chunks_chunk_type ON chunks(chunk_type);

-- 태그 검색 인덱스 (GIN)
CREATE INDEX idx_chunks_tags ON chunks USING GIN(tags);
```

**컬럼 설명**

| 컬럼 | 타입 | 필수 | 설명 |
|------|------|------|------|
| id | VARCHAR(50) | ✅ | 청크 ID (msa-def-2-1 형식) |
| document_id | VARCHAR(50) | ✅ | 문서 ID (FK) |
| section | VARCHAR(255) | ✅ | 섹션명 |
| parent_section | VARCHAR(255) | ❌ | 상위 섹션명 |
| content | TEXT | ✅ | 청크 내용 |
| tags | TEXT[] | ❌ | 태그 배열 |
| chunk_type | VARCHAR(30) | ❌ | 청크 타입 |
| language | VARCHAR(10) | ❌ | 언어 (기본: ko) |
| version | VARCHAR(20) | ❌ | 버전 |
| embedding | VECTOR(1024) | ❌ | 임베딩 벡터 |
| created_at | TIMESTAMP | ✅ | 생성 시간 |
| updated_at | TIMESTAMP | ✅ | 수정 시간 |

---

## 3. 관계 다이어그램 (ERD)

```
┌─────────────────────────────────────────────────────────────┐
│                         ERD                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐
│    analyses     │
├─────────────────┤
│ PK id           │
│    status       │
│    input_type   │
│    ...          │
└────────┬────────┘
         │
         │ 1:N
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────────────┐    ┌─────────────────────────┐
│analysis_services│    │analysis_recommendations │
├─────────────────┤    ├─────────────────────────┤
│ PK id           │    │ PK id                   │
│ FK analysis_id  │    │ FK analysis_id          │
│    service_name │    │    recommendation_type  │
│    ...          │    │    message              │
└─────────────────┘    └─────────────────────────┘


┌─────────────────┐
│    documents    │
├─────────────────┤
│ PK id           │
│    name         │
│    version      │
│    ...          │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│     chunks      │
├─────────────────┤
│ PK id           │
│ FK document_id  │
│    section      │
│    content      │
│    embedding    │ ← VECTOR(1024)
│    tags         │
│    ...          │
└─────────────────┘
```

---

## 4. 주요 쿼리

### 4.1 분석 결과 조회 (서비스 포함)

```sql
SELECT 
  a.*,
  json_agg(
    json_build_object(
      'name', s.service_name,
      'responsibility', s.responsibility,
      'type', s.service_type,
      'endpoints', s.endpoints,
      'database', s.database_name,
      'dependencies', s.dependencies
    ) ORDER BY s.display_order
  ) AS services
FROM analyses a
LEFT JOIN analysis_services s ON a.id = s.analysis_id
WHERE a.id = $1
GROUP BY a.id;
```

### 4.2 분석 결과 조회 (권고사항 포함)

```sql
SELECT 
  a.*,
  json_agg(
    json_build_object(
      'type', r.recommendation_type,
      'message', r.message,
      'suggestion', r.suggestion,
      'relatedService', r.related_service
    ) ORDER BY r.display_order
  ) AS recommendations
FROM analyses a
LEFT JOIN analysis_recommendations r ON a.id = r.analysis_id
WHERE a.id = $1
GROUP BY a.id;
```

### 4.3 RAG 벡터 유사도 검색

```sql
SELECT 
  id,
  document_id,
  section,
  content,
  tags,
  chunk_type,
  1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE 1 - (embedding <=> $1) > 0.7
ORDER BY similarity DESC
LIMIT 5;
```

### 4.4 RAG 태그 + 유사도 복합 검색

```sql
SELECT 
  id,
  document_id,
  section,
  content,
  tags,
  1 - (embedding <=> $1) AS similarity
FROM chunks
WHERE 
  tags && $2  -- 태그 배열 겹침 검사
  AND 1 - (embedding <=> $1) > 0.5
ORDER BY similarity DESC
LIMIT 5;
```

### 4.5 문서별 청크 통계

```sql
SELECT 
  d.id,
  d.name,
  d.version,
  COUNT(c.id) AS chunk_count,
  array_agg(DISTINCT c.chunk_type) AS chunk_types
FROM documents d
LEFT JOIN chunks c ON d.id = c.document_id
WHERE d.status = 'active'
GROUP BY d.id, d.name, d.version;
```

---

## 5. 초기 데이터

### 5.1 문서 등록

```sql
INSERT INTO documents (id, name, version, description, status) VALUES
('doc_msa_def', 'MSA_정의서.md', '1.0', 'MSA 핵심 개념, 구성 요소, 분리 기준 정의', 'active'),
('doc_domain_guide', '도메인_분석_가이드.md', '1.0', 'DDD 기반 도메인 분석, Bounded Context 식별', 'active');
```

### 5.2 청크 예시 (임베딩 제외)

```sql
INSERT INTO chunks (id, document_id, section, parent_section, content, tags, chunk_type, language, version) VALUES
(
  'msa-def-2-1',
  'doc_msa_def',
  '2.1 서비스',
  '2. MSA 구성 요소',
  '서비스 (Service)는 독립적인 비즈니스 기능 단위로, 다음 특성을 갖는다: 자율성 - 독립적으로 개발, 테스트, 배포 가능. 경계 컨텍스트 (Bounded Context) - 명확한 도메인 경계 보유. API 기반 통신 - 표준화된 인터페이스로 외부와 소통. 데이터 소유권 - 자체 데이터 저장소 보유 및 관리.',
  ARRAY['서비스', 'service', '자율성', 'bounded-context', 'API', '데이터소유권'],
  'definition',
  'ko',
  '1.0'
);
```

---

## 6. Supabase 설정

### 6.1 pgvector 확장 활성화

Supabase Dashboard > Database > Extensions 에서 `vector` 활성화

또는 SQL:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 6.2 Row Level Security (RLS)

MVP에서는 RLS 비활성화 (추후 인증 추가 시 설정)

```sql
-- RLS 비활성화 (개발용)
ALTER TABLE analyses DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE chunks DISABLE ROW LEVEL SECURITY;
```

---

## 7. 마이그레이션

### 7.1 전체 스키마 생성 순서

```sql
-- 1. 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 테이블 생성 (의존성 순서)
-- documents → chunks
-- analyses → analysis_services, analysis_recommendations

-- 3. 인덱스 생성

-- 4. 초기 데이터 삽입
```

### 7.2 스키마 삭제 (초기화)

```sql
DROP TABLE IF EXISTS analysis_recommendations CASCADE;
DROP TABLE IF EXISTS analysis_services CASCADE;
DROP TABLE IF EXISTS analyses CASCADE;
DROP TABLE IF EXISTS chunks CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-07 | 최초 작성 | - |
