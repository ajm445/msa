-- MSA Analyzer Database Schema
-- Supabase (PostgreSQL + pgvector)
-- Version: 1.0

-- ===========================================
-- 1. pgvector 확장 활성화 (RAG용)
-- ===========================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ===========================================
-- 2. analyses 테이블 (분석 결과)
-- ===========================================
CREATE TABLE IF NOT EXISTS analyses (
  -- 기본 정보
  id VARCHAR(50) PRIMARY KEY,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  input_type VARCHAR(20) NOT NULL,

  -- 입력 데이터
  input_description TEXT,
  input_language VARCHAR(30),
  input_file_name VARCHAR(255),
  input_file_size INTEGER,

  -- 분석 요약
  detected_domain VARCHAR(100),
  total_files INTEGER,
  analyzed_files INTEGER,

  -- JSON 데이터
  diagram_data JSONB,
  parsed_data JSONB,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약조건
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  CONSTRAINT valid_input_type CHECK (input_type IN ('code', 'text'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_input_type ON analyses(input_type);

-- ===========================================
-- 3. analysis_services 테이블 (서비스 제안)
-- ===========================================
CREATE TABLE IF NOT EXISTS analysis_services (
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(50) NOT NULL,

  -- 서비스 정보
  service_name VARCHAR(100) NOT NULL,
  responsibility TEXT,
  service_type VARCHAR(30),

  -- 상세 정보
  endpoints TEXT[],
  database_name VARCHAR(100),
  dependencies TEXT[],
  communication_type VARCHAR(30),

  -- 순서
  display_order INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 외래키
  CONSTRAINT fk_analysis_services_analysis
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE,

  -- 제약조건
  CONSTRAINT valid_service_type CHECK (service_type IN ('Core', 'Supporting', 'Generic'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_analysis_services_analysis_id ON analysis_services(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_services_type ON analysis_services(service_type);

-- ===========================================
-- 4. analysis_recommendations 테이블 (권고사항)
-- ===========================================
CREATE TABLE IF NOT EXISTS analysis_recommendations (
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(50) NOT NULL,

  -- 권고 내용
  recommendation_type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  suggestion TEXT,
  related_service VARCHAR(100),

  -- 순서
  display_order INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 외래키
  CONSTRAINT fk_analysis_recommendations_analysis
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE,

  -- 제약조건
  CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN ('info', 'warning', 'error'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_recommendations_analysis_id ON analysis_recommendations(analysis_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON analysis_recommendations(recommendation_type);

-- ===========================================
-- 5. analysis_communications 테이블 (통신 방식)
-- ===========================================
CREATE TABLE IF NOT EXISTS analysis_communications (
  id SERIAL PRIMARY KEY,
  analysis_id VARCHAR(50) NOT NULL,

  -- 통신 정보
  from_service VARCHAR(100) NOT NULL,
  to_service VARCHAR(100) NOT NULL,
  method VARCHAR(30) NOT NULL,
  reason TEXT,

  -- 순서
  display_order INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 외래키
  CONSTRAINT fk_analysis_communications_analysis
    FOREIGN KEY (analysis_id)
    REFERENCES analyses(id)
    ON DELETE CASCADE,

  -- 제약조건
  CONSTRAINT valid_communication_method CHECK (method IN ('REST', 'gRPC', 'Event', 'MessageQueue'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_communications_analysis_id ON analysis_communications(analysis_id);

-- ===========================================
-- 6. documents 테이블 (RAG 문서)
-- ===========================================
CREATE TABLE IF NOT EXISTS documents (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(20),
  description TEXT,
  file_path VARCHAR(500),
  total_chunks INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_document_status CHECK (status IN ('active', 'archived'))
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents(name);

-- ===========================================
-- 7. chunks 테이블 (RAG 청크)
-- ===========================================
CREATE TABLE IF NOT EXISTS chunks (
  id VARCHAR(50) PRIMARY KEY,
  document_id VARCHAR(50) NOT NULL,

  -- 위치 정보
  section VARCHAR(255) NOT NULL,
  parent_section VARCHAR(255),

  -- 내용
  content TEXT NOT NULL,

  -- 메타데이터
  tags TEXT[],
  chunk_type VARCHAR(30),
  language VARCHAR(10) DEFAULT 'ko',
  version VARCHAR(20),

  -- 임베딩 벡터 (Voyage AI: 1024차원)
  embedding VECTOR(1024),

  -- 타임스탬프
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 외래키
  CONSTRAINT fk_chunks_document
    FOREIGN KEY (document_id)
    REFERENCES documents(id)
    ON DELETE CASCADE
);

-- 벡터 검색 인덱스 (IVFFlat) - 데이터가 충분히 쌓인 후 생성
-- CREATE INDEX idx_chunks_embedding ON chunks
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- 일반 인덱스
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_section ON chunks(section);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_type ON chunks(chunk_type);

-- 태그 검색 인덱스 (GIN)
CREATE INDEX IF NOT EXISTS idx_chunks_tags ON chunks USING GIN(tags);

-- ===========================================
-- 8. updated_at 자동 갱신 트리거
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- analyses 테이블 트리거
DROP TRIGGER IF EXISTS update_analyses_updated_at ON analyses;
CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- documents 테이블 트리거
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- chunks 테이블 트리거
DROP TRIGGER IF EXISTS update_chunks_updated_at ON chunks;
CREATE TRIGGER update_chunks_updated_at
  BEFORE UPDATE ON chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 9. RAG 검색 RPC 함수
-- ===========================================

-- 일반 벡터 검색 함수
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id VARCHAR(50),
  document_name VARCHAR(255),
  section VARCHAR(255),
  parent_section VARCHAR(255),
  content TEXT,
  tags TEXT[],
  chunk_type VARCHAR(30),
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    d.name as document_name,
    c.section,
    c.parent_section,
    c.content,
    c.tags,
    c.chunk_type,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'active'
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 태그 필터링 벡터 검색 함수
CREATE OR REPLACE FUNCTION match_chunks_with_tags(
  query_embedding VECTOR(1024),
  filter_tags TEXT[],
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id VARCHAR(50),
  document_name VARCHAR(255),
  section VARCHAR(255),
  parent_section VARCHAR(255),
  content TEXT,
  tags TEXT[],
  chunk_type VARCHAR(30),
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    d.name as document_name,
    c.section,
    c.parent_section,
    c.content,
    c.tags,
    c.chunk_type,
    1 - (c.embedding <=> query_embedding) as similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'active'
    AND c.tags && filter_tags  -- 태그 배열 겹침 확인
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ===========================================
-- 완료 메시지
-- ===========================================
-- 스키마 생성 완료!
-- Supabase SQL Editor에서 이 파일을 실행하세요.
