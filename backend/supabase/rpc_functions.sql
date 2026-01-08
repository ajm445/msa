-- ===========================================
-- RAG 검색 RPC 함수
-- Supabase SQL Editor에서 실행하세요
-- ===========================================

-- 기존 함수 삭제 (있으면)
DROP FUNCTION IF EXISTS match_chunks(VECTOR(1024), FLOAT, INT);
DROP FUNCTION IF EXISTS match_chunks_with_tags(VECTOR(1024), TEXT[], FLOAT, INT);

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
