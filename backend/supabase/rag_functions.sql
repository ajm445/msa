-- ===========================================
-- RAG 벡터 검색 함수
-- Supabase SQL Editor에서 실행하세요
-- ===========================================

-- 1. 기본 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id VARCHAR,
  document_id VARCHAR,
  document_name VARCHAR,
  section VARCHAR,
  parent_section VARCHAR,
  content TEXT,
  tags TEXT[],
  chunk_type VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    d.name AS document_name,
    c.section,
    c.parent_section,
    c.content,
    c.tags,
    c.chunk_type,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'active'
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 2. 태그 필터링 벡터 검색 함수
CREATE OR REPLACE FUNCTION match_chunks_with_tags(
  query_embedding VECTOR(1024),
  filter_tags TEXT[],
  match_threshold FLOAT DEFAULT 0.3,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id VARCHAR,
  document_id VARCHAR,
  document_name VARCHAR,
  section VARCHAR,
  parent_section VARCHAR,
  content TEXT,
  tags TEXT[],
  chunk_type VARCHAR,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    d.name AS document_name,
    c.section,
    c.parent_section,
    c.content,
    c.tags,
    c.chunk_type,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'active'
    AND c.tags && filter_tags  -- 태그 교집합
    AND (1 - (c.embedding <=> query_embedding)) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3. 함수 생성 확인
-- 아래 쿼리로 함수가 생성되었는지 확인할 수 있습니다
-- SELECT proname FROM pg_proc WHERE proname LIKE 'match_chunks%';

-- ===========================================
-- 완료!
-- ===========================================
