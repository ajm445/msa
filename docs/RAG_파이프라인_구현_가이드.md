# RAG 파이프라인 구현 가이드

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | RAG 파이프라인 구현 가이드 |
| 버전 | 1.0 |
| 작성일 | 2026-01-07 |
| 목적 | MSA Analyzer의 RAG 파이프라인 구현 방법 안내 |

---

## 1. 개요

### 1.1 RAG 파이프라인이란?

RAG(Retrieval-Augmented Generation)는 LLM의 응답 품질을 향상시키기 위해 외부 지식을 검색하여 컨텍스트로 제공하는 기술입니다.

MSA Analyzer에서 RAG는 다음과 같이 활용됩니다:
- MSA 가이드 문서에서 관련 정보 검색
- Claude API 분석 시 참고 자료로 제공
- 분석 결과의 근거 및 권고사항 보강

### 1.2 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG 파이프라인 아키텍처                    │
└─────────────────────────────────────────────────────────────┘

[문서 준비 단계]
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  MSA 가이드   │     │   청킹 모듈    │     │  Voyage AI    │
│  문서 (.md)   │────▶│  (Chunker)    │────▶│  (Embedding)  │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
                                                     ▼
                                            ┌───────────────┐
                                            │   Supabase    │
                                            │   pgvector    │
                                            └───────────────┘

[검색 단계]
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  사용자 쿼리   │────▶│  Voyage AI    │────▶│  벡터 검색    │
│               │     │  (Embedding)  │     │  (pgvector)   │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                     │
                                                     ▼
                                            ┌───────────────┐
                                            │  관련 청크    │
                                            │  (Top-K)      │
                                            └───────────────┘
```

---

## 2. 사전 요구사항

### 2.1 Voyage AI API 키 발급

1. [Voyage AI](https://www.voyageai.com/) 접속
2. 회원가입 후 대시보드 이동
3. API Keys 메뉴에서 키 생성
4. 생성된 키를 안전하게 보관

### 2.2 환경 변수 설정

```bash
# backend/.env
VOYAGE_API_KEY=your_voyage_api_key_here
```

### 2.3 필요 패키지 설치

```bash
cd backend
npm install voyageai
```

---

## 3. Voyage AI 설정

### 3.1 클라이언트 설정

**파일 생성**: `backend/src/lib/voyage.js`

```javascript
import { VoyageAIClient } from 'voyageai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VOYAGE_API_KEY;

// API 키 유효성 검사
const isValidApiKey = apiKey &&
  !apiKey.includes('your_') &&
  !apiKey.includes('your-');

if (!isValidApiKey) {
  console.warn('⚠️  VOYAGE_API_KEY가 설정되지 않았거나 유효하지 않습니다.');
  console.warn('   .env 파일에 유효한 VOYAGE_API_KEY를 설정해주세요.');
}

export const voyage = isValidApiKey
  ? new VoyageAIClient({ apiKey })
  : null;

/**
 * 텍스트를 벡터로 임베딩
 * @param {string|string[]} texts - 임베딩할 텍스트
 * @param {string} inputType - 'document' 또는 'query'
 * @returns {Promise<number[][]>} 임베딩 벡터 배열
 */
export async function createEmbedding(texts, inputType = 'document') {
  if (!voyage) {
    throw new Error('Voyage AI가 설정되지 않았습니다.');
  }

  const textsArray = Array.isArray(texts) ? texts : [texts];

  const response = await voyage.embed({
    input: textsArray,
    model: 'voyage-code-3',  // 코드 분석에 최적화된 모델
    inputType: inputType     // 'document' for indexing, 'query' for search
  });

  return response.data.map(item => item.embedding);
}

/**
 * Voyage AI 연결 상태 확인
 * @returns {Promise<boolean>}
 */
export async function checkVoyageConnection() {
  if (!voyage) {
    return false;
  }

  try {
    await voyage.embed({
      input: ['test'],
      model: 'voyage-code-3'
    });
    return true;
  } catch (error) {
    console.error('Voyage AI 연결 실패:', error.message);
    return false;
  }
}

export default voyage;
```

### 3.2 임베딩 모델 선택

| 모델 | 차원 | 용도 |
|------|------|------|
| `voyage-code-3` | 1024 | 코드 분석 특화 (권장) |
| `voyage-3` | 1024 | 범용 텍스트 |
| `voyage-3-lite` | 512 | 경량 모델 |

---

## 4. 문서 청킹 구현

### 4.1 청킹 모듈 생성

**파일 생성**: `backend/src/utils/chunker.js`

```javascript
/**
 * Markdown 문서를 청크로 분할
 * 청킹_전략_정의서.md 기반으로 구현
 */

/**
 * 청크 ID 생성
 * @param {string} docId - 문서 ID
 * @param {number} sectionNum - 섹션 번호
 * @param {number} chunkNum - 청크 번호
 * @returns {string}
 */
function generateChunkId(docId, sectionNum, chunkNum) {
  return `${docId}-${sectionNum}-${chunkNum}`;
}

/**
 * 청크 타입 결정
 * @param {string} content - 청크 내용
 * @returns {string}
 */
function determineChunkType(content) {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('란?') || lowerContent.includes('정의')) {
    return 'definition';
  }
  if (lowerContent.includes('vs') || lowerContent.includes('비교')) {
    return 'comparison';
  }
  if (lowerContent.includes('체크리스트') || lowerContent.includes('□')) {
    return 'checklist';
  }
  if (lowerContent.includes('예시') || lowerContent.includes('사례')) {
    return 'example';
  }
  if (lowerContent.includes('방법') || lowerContent.includes('절차') || lowerContent.includes('step')) {
    return 'guide';
  }
  if (lowerContent.includes('패턴') || lowerContent.includes('pattern')) {
    return 'pattern';
  }
  if (lowerContent.includes('주의') || lowerContent.includes('안티패턴') || lowerContent.includes('하지 마')) {
    return 'warning';
  }

  return 'general';
}

/**
 * 텍스트에서 태그 추출
 * @param {string} content - 청크 내용
 * @returns {string[]}
 */
function extractTags(content) {
  const tags = [];

  // 키워드 매핑
  const keywordMap = {
    'MSA': ['MSA', '마이크로서비스'],
    '모놀리식': ['모놀리식', 'monolithic'],
    'API-Gateway': ['API Gateway', 'gateway', '게이트웨이'],
    'DDD': ['DDD', 'Domain-Driven', '도메인 주도'],
    'Bounded-Context': ['Bounded Context', '바운디드 컨텍스트', '경계 컨텍스트'],
    'REST': ['REST', 'RESTful'],
    'gRPC': ['gRPC'],
    'Event': ['이벤트', 'event', 'Event-Driven'],
    'Kafka': ['Kafka', '카프카'],
    'CQRS': ['CQRS'],
    'Saga': ['Saga', '사가'],
    'Circuit-Breaker': ['Circuit Breaker', '서킷 브레이커'],
    '서비스분리': ['서비스 분리', '분리 기준', '분리 방법']
  };

  for (const [tag, keywords] of Object.entries(keywordMap)) {
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        tags.push(tag);
        break;
      }
    }
  }

  return [...new Set(tags)]; // 중복 제거
}

/**
 * Markdown 문서를 청크로 분할
 * @param {string} content - Markdown 문서 내용
 * @param {object} metadata - 문서 메타데이터
 * @returns {object[]} 청크 배열
 */
export function chunkMarkdown(content, metadata) {
  const { documentId, documentName, version = '1.0' } = metadata;
  const chunks = [];

  // H2, H3 기준으로 섹션 분리
  const sections = content.split(/(?=^##\s)/gm);

  let sectionNum = 0;
  let currentH2 = '';

  for (const section of sections) {
    if (!section.trim()) continue;

    // H2 제목 추출
    const h2Match = section.match(/^##\s+(.+)$/m);
    if (h2Match) {
      currentH2 = h2Match[1].trim();
    }

    // H3로 세부 분할
    const subsections = section.split(/(?=^###\s)/gm);

    let chunkNum = 0;
    for (const subsection of subsections) {
      if (!subsection.trim()) continue;

      // H3 제목 추출
      const h3Match = subsection.match(/^###\s+(.+)$/m);
      const sectionTitle = h3Match ? h3Match[1].trim() : currentH2;

      // 청크 내용 정리 (제목 제외한 본문)
      let chunkContent = subsection
        .replace(/^###\s+.+$/m, '')
        .replace(/^##\s+.+$/m, '')
        .trim();

      // 최소 길이 검사 (200자 미만이면 스킵)
      if (chunkContent.length < 200) continue;

      // 최대 길이 검사 (1000자 초과 시 분할)
      if (chunkContent.length > 1000) {
        const splitChunks = splitLongContent(chunkContent, 800);
        for (const splitContent of splitChunks) {
          chunks.push({
            id: generateChunkId(documentId, sectionNum, chunkNum++),
            document_id: documentId,
            section: sectionTitle,
            parent_section: currentH2,
            content: splitContent,
            tags: extractTags(splitContent),
            chunk_type: determineChunkType(splitContent),
            language: 'ko',
            version: version
          });
        }
      } else {
        chunks.push({
          id: generateChunkId(documentId, sectionNum, chunkNum++),
          document_id: documentId,
          section: sectionTitle,
          parent_section: currentH2,
          content: chunkContent,
          tags: extractTags(chunkContent),
          chunk_type: determineChunkType(chunkContent),
          language: 'ko',
          version: version
        });
      }
    }

    sectionNum++;
  }

  return chunks;
}

/**
 * 긴 텍스트를 적절한 크기로 분할
 * @param {string} content - 분할할 내용
 * @param {number} maxLength - 최대 길이
 * @returns {string[]}
 */
function splitLongContent(content, maxLength) {
  const chunks = [];
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = '';

  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxLength && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

export default { chunkMarkdown, extractTags, determineChunkType };
```

---

## 5. 임베딩 저장

### 5.1 RAG 서비스 모듈

**파일 생성**: `backend/src/services/ragService.js`

```javascript
import { supabase } from '../lib/supabase.js';
import { createEmbedding } from '../lib/voyage.js';
import { chunkMarkdown } from '../utils/chunker.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 문서 ID 생성
 * @param {string} name - 문서명
 * @returns {string}
 */
function generateDocumentId(name) {
  const timestamp = Date.now().toString(36);
  const safeName = name.replace(/[^a-zA-Z0-9가-힣]/g, '-').substring(0, 20);
  return `doc_${safeName}_${timestamp}`;
}

/**
 * Markdown 문서를 처리하여 DB에 저장
 * @param {string} filePath - 문서 파일 경로
 * @param {object} options - 옵션
 * @returns {Promise<object>} 처리 결과
 */
export async function processDocument(filePath, options = {}) {
  const { version = '1.0' } = options;

  // 파일 읽기
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const documentId = generateDocumentId(fileName);

  // 1. 청킹
  const chunks = chunkMarkdown(content, {
    documentId,
    documentName: fileName,
    version
  });

  console.log(`📄 ${fileName}: ${chunks.length}개 청크 생성`);

  // 2. 임베딩 생성 (배치 처리)
  const BATCH_SIZE = 10;
  const chunksWithEmbeddings = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const contents = batch.map(c => c.content);

    const embeddings = await createEmbedding(contents, 'document');

    for (let j = 0; j < batch.length; j++) {
      chunksWithEmbeddings.push({
        ...batch[j],
        embedding: embeddings[j]
      });
    }

    console.log(`  ✓ ${i + batch.length}/${chunks.length} 임베딩 완료`);
  }

  // 3. documents 테이블에 문서 정보 저장
  const { error: docError } = await supabase.from('documents').insert({
    id: documentId,
    name: fileName,
    version: version,
    file_path: filePath,
    total_chunks: chunks.length,
    status: 'active'
  });

  if (docError) {
    throw new Error(`문서 저장 실패: ${docError.message}`);
  }

  // 4. chunks 테이블에 청크 저장
  const { error: chunkError } = await supabase.from('chunks').insert(
    chunksWithEmbeddings.map(chunk => ({
      id: chunk.id,
      document_id: chunk.document_id,
      section: chunk.section,
      parent_section: chunk.parent_section,
      content: chunk.content,
      tags: chunk.tags,
      chunk_type: chunk.chunk_type,
      language: chunk.language,
      version: chunk.version,
      embedding: JSON.stringify(chunk.embedding) // pgvector 형식
    }))
  );

  if (chunkError) {
    throw new Error(`청크 저장 실패: ${chunkError.message}`);
  }

  return {
    documentId,
    fileName,
    totalChunks: chunks.length,
    status: 'completed'
  };
}

/**
 * RAG 검색 수행
 * @param {string} query - 검색 쿼리
 * @param {object} options - 검색 옵션
 * @returns {Promise<object[]>} 검색 결과
 */
export async function searchRAG(query, options = {}) {
  const { limit = 5, tags = [], threshold = 0.7 } = options;

  // 1. 쿼리 임베딩 생성
  const [queryEmbedding] = await createEmbedding(query, 'query');

  // 2. 벡터 검색 쿼리
  let searchQuery = supabase
    .rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

  // 태그 필터링 (태그가 있는 경우)
  // 참고: RPC 함수에서 태그 필터링 처리 필요

  const { data, error } = await searchQuery;

  if (error) {
    throw new Error(`검색 실패: ${error.message}`);
  }

  return data.map(item => ({
    id: item.id,
    document: item.document_name,
    section: item.section,
    content: item.content,
    tags: item.tags,
    similarity: item.similarity
  }));
}

/**
 * 모든 문서 목록 조회
 * @returns {Promise<object[]>}
 */
export async function listDocuments() {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`문서 목록 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 문서 삭제 (CASCADE로 청크도 삭제됨)
 * @param {string} documentId - 문서 ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`문서 삭제 실패: ${error.message}`);
  }
}

export default {
  processDocument,
  searchRAG,
  listDocuments,
  deleteDocument
};
```

### 5.2 벡터 검색 함수 생성 (Supabase SQL)

Supabase SQL Editor에서 실행:

```sql
-- 벡터 유사도 검색 함수
CREATE OR REPLACE FUNCTION match_chunks(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.7,
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
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'active'
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 태그 기반 검색 함수
CREATE OR REPLACE FUNCTION match_chunks_with_tags(
  query_embedding VECTOR(1024),
  filter_tags TEXT[],
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id VARCHAR,
  document_name VARCHAR,
  section VARCHAR,
  content TEXT,
  tags TEXT[],
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    d.name AS document_name,
    c.section,
    c.content,
    c.tags,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM chunks c
  JOIN documents d ON c.document_id = d.id
  WHERE d.status = 'active'
    AND c.tags && filter_tags  -- 태그 교집합
    AND 1 - (c.embedding <=> query_embedding) > match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 6. RAG 검색 API 구현

### 6.1 RAG 라우트 수정

**파일 수정**: `backend/src/routes/rag.js`

```javascript
import express from 'express';
import { searchRAG, processDocument, listDocuments, deleteDocument } from '../services/ragService.js';
import { voyage } from '../lib/voyage.js';

const router = express.Router();

/**
 * POST /api/rag/search
 * MSA 가이드 검색
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5, tags = [] } = req.body;

    // 입력 검증
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '검색어를 입력해주세요.'
        }
      });
    }

    // Voyage AI 설정 확인
    if (!voyage) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'RAG 서비스가 설정되지 않았습니다. VOYAGE_API_KEY를 확인해주세요.'
        }
      });
    }

    // RAG 검색 수행
    const results = await searchRAG(query, {
      limit: Math.min(limit, 10),
      tags
    });

    res.json({
      success: true,
      data: {
        results,
        totalResults: results.length
      }
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: error.message || '검색 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * GET /api/rag/documents
 * 문서 목록 조회
 */
router.get('/documents', async (req, res) => {
  try {
    const documents = await listDocuments();

    res.json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '문서 목록 조회 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * DELETE /api/rag/documents/:documentId
 * 문서 삭제
 */
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    await deleteDocument(documentId);

    res.json({
      success: true,
      message: '문서가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '문서 삭제 중 오류가 발생했습니다.'
      }
    });
  }
});

export default router;
```

---

## 7. 분석 엔진 연동

### 7.1 Claude API와 RAG 결합

분석 서비스에서 RAG 결과를 활용하는 방법:

```javascript
// backend/src/services/analysisService.js 수정

import { searchRAG } from './ragService.js';

/**
 * RAG 보강된 텍스트 분석
 */
export async function analyzeTextWithRAG(description, language) {
  // 1. 관련 MSA 가이드 검색
  const ragResults = await searchRAG(description, {
    limit: 3,
    tags: ['MSA', '서비스분리', 'DDD']
  });

  // 2. 검색 결과를 컨텍스트로 포함
  const ragContext = ragResults.map(r =>
    `[${r.document} - ${r.section}]\n${r.content}`
  ).join('\n\n---\n\n');

  // 3. 프롬프트에 RAG 컨텍스트 추가
  const enhancedPrompt = `
## 참고 자료 (MSA 가이드)
${ragContext}

## 프로젝트 설명
${description}

위 참고 자료를 바탕으로 MSA 서비스 분리 방안을 제안해주세요.
`;

  // 4. Claude API 호출
  // ... (기존 분석 로직)
}
```

---

## 8. 테스트 방법

### 8.1 문서 업로드 테스트

```bash
# 문서 처리 스크립트 실행
node scripts/process-documents.js

# 또는 API로 테스트
curl -X POST http://localhost:3000/api/rag/upload \
  -H "Content-Type: application/json" \
  -d '{"filePath": "docs/MSA_정의서.md"}'
```

### 8.2 검색 테스트

```bash
# 기본 검색
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "서비스 분리 기준이 뭔가요?", "limit": 5}'

# 태그 필터링 검색
curl -X POST http://localhost:3000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query": "이커머스 MSA 구조", "limit": 5, "tags": ["이커머스", "서비스분리"]}'
```

### 8.3 검증 체크리스트

| 항목 | 확인 |
|------|------|
| Voyage AI 연결 확인 (`/api/health`) | □ |
| 문서 청킹 정상 동작 | □ |
| 임베딩 벡터 저장 확인 | □ |
| 유사도 검색 결과 반환 | □ |
| 태그 필터링 동작 | □ |
| similarity > 0.7 결과만 반환 | □ |

### 8.4 예상 테스트 쿼리

| 쿼리 | 예상 결과 청크 |
|------|---------------|
| "서비스 분리 기준" | 분리 기준 체크리스트, DDD 관련 |
| "API Gateway 역할" | API Gateway 정의, 구성요소 |
| "Saga 패턴이란" | Saga 패턴 설명, 분산 트랜잭션 |
| "모놀리식 vs MSA" | 비교 설명 청크 |

---

## 9. 비용 안내

### 9.1 Voyage AI 요금

| 모델 | 가격 (1M 토큰) |
|------|---------------|
| voyage-code-3 | $0.06 |
| voyage-3 | $0.06 |
| voyage-3-lite | $0.02 |

### 9.2 예상 비용 (MSA Analyzer)

- 문서 임베딩: 약 50개 청크 × 평균 500토큰 = 25,000 토큰 ≈ $0.002
- 검색 쿼리: 1회당 약 50토큰 ≈ $0.000003

---

## 10. 구현 순서 요약

```
1. Voyage AI API 키 발급 및 환경 변수 설정
   ↓
2. voyageai 패키지 설치
   ↓
3. backend/src/lib/voyage.js 생성
   ↓
4. backend/src/utils/chunker.js 생성
   ↓
5. backend/src/services/ragService.js 생성
   ↓
6. Supabase에 벡터 검색 함수 생성 (SQL)
   ↓
7. backend/src/routes/rag.js 수정
   ↓
8. MSA 가이드 문서 청킹 및 임베딩 저장
   ↓
9. 검색 테스트
   ↓
10. 분석 엔진에 RAG 연동
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-07 | 최초 작성 | - |
