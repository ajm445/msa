import { supabase } from '../lib/supabase.js';
import { createEmbedding, isVoyageConfigured } from '../lib/voyage.js';
import { chunkMarkdown, getChunkStats } from '../utils/chunker.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * 지정된 시간(ms) 동안 대기
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 문서 ID 생성
 * @param {string} name - 문서명
 * @returns {string}
 */
function generateDocumentId(name) {
  const timestamp = Date.now().toString(36);
  const safeName = name
    .replace(/\.md$/i, '')
    .replace(/[^a-zA-Z0-9가-힣]/g, '_')
    .substring(0, 20);
  return `doc_${safeName}_${timestamp}`;
}

/**
 * Markdown 문서를 처리하여 DB에 저장
 * @param {string} filePath - 문서 파일 경로
 * @param {object} options - 옵션
 * @param {string} options.documentName - 문서 이름 (기본: 파일명)
 * @param {string} options.version - 문서 버전
 * @returns {Promise<object>} 처리 결과
 */
export async function processDocument(filePath, options = {}) {
  const { version = '1.0', documentName } = options;

  if (!isVoyageConfigured()) {
    throw new Error('Voyage AI가 설정되지 않았습니다. VOYAGE_API_KEY를 확인해주세요.');
  }

  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }

  // 파일 읽기
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = documentName || path.basename(filePath);
  const documentId = generateDocumentId(fileName);

  console.log(`\n📄 문서 처리 시작: ${fileName}`);

  // 1. 청킹
  const chunks = chunkMarkdown(content, {
    documentId,
    documentName: fileName,
    version
  });

  const stats = getChunkStats(chunks);
  console.log(`   ✓ ${chunks.length}개 청크 생성 (평균 ${stats.avgLength}자)`);

  if (chunks.length === 0) {
    throw new Error('청킹 결과가 없습니다. 문서 형식을 확인해주세요.');
  }

  // 2. 임베딩 생성 (배치 처리 + Rate Limit 처리)
  const BATCH_SIZE = 10;
  const RATE_LIMIT_DELAY = 21000; // 21초 (무료 플랜 3 RPM 대응)
  const MAX_RETRIES = 3;
  const chunksWithEmbeddings = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const contents = batch.map(c => c.content);

    let retries = 0;
    let success = false;

    while (!success && retries < MAX_RETRIES) {
      try {
        const embeddings = await createEmbedding(contents, 'document');

        for (let j = 0; j < batch.length; j++) {
          chunksWithEmbeddings.push({
            ...batch[j],
            embedding: embeddings[j]
          });
        }

        console.log(`   ✓ 임베딩 ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} 완료`);
        success = true;

        // 다음 배치 전 Rate Limit 대기 (마지막 배치 제외)
        if (i + BATCH_SIZE < chunks.length) {
          console.log(`   ⏳ Rate Limit 대기 (${RATE_LIMIT_DELAY / 1000}초)...`);
          await sleep(RATE_LIMIT_DELAY);
        }
      } catch (error) {
        retries++;
        if (error.message.includes('rate limit') || error.message.includes('RPM')) {
          console.log(`   ⏳ Rate Limit 감지, ${RATE_LIMIT_DELAY / 1000}초 후 재시도 (${retries}/${MAX_RETRIES})...`);
          await sleep(RATE_LIMIT_DELAY);
        } else {
          console.error(`   ✗ 임베딩 실패 (배치 ${i}):`, error.message);
          throw error;
        }
      }
    }

    if (!success) {
      throw new Error(`배치 ${i} 임베딩 실패: 최대 재시도 횟수 초과`);
    }
  }

  // 3. documents 테이블에 문서 정보 저장
  const { error: docError } = await supabase.from('documents').insert({
    id: documentId,
    name: fileName,
    version: version,
    description: `${fileName} - ${chunks.length}개 청크`,
    file_path: filePath,
    total_chunks: chunks.length,
    status: 'active'
  });

  if (docError) {
    throw new Error(`문서 저장 실패: ${docError.message}`);
  }

  console.log(`   ✓ 문서 메타데이터 저장 완료`);

  // 4. chunks 테이블에 청크 저장
  const chunkInsertData = chunksWithEmbeddings.map(chunk => ({
    id: chunk.id,
    document_id: chunk.document_id,
    section: chunk.section,
    parent_section: chunk.parent_section,
    content: chunk.content,
    tags: chunk.tags,
    chunk_type: chunk.chunk_type,
    language: chunk.language,
    version: chunk.version,
    embedding: `[${chunk.embedding.join(',')}]` // pgvector 형식
  }));

  const { error: chunkError } = await supabase.from('chunks').insert(chunkInsertData);

  if (chunkError) {
    // 문서 롤백
    await supabase.from('documents').delete().eq('id', documentId);
    throw new Error(`청크 저장 실패: ${chunkError.message}`);
  }

  console.log(`   ✓ ${chunks.length}개 청크 저장 완료`);
  console.log(`✅ 문서 처리 완료: ${documentId}\n`);

  return {
    documentId,
    fileName,
    totalChunks: chunks.length,
    stats,
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
  const { limit = 5, tags = [], threshold = 0.3 } = options;

  if (!isVoyageConfigured()) {
    throw new Error('Voyage AI가 설정되지 않았습니다. VOYAGE_API_KEY를 확인해주세요.');
  }

  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }

  // 1. 쿼리 임베딩 생성
  const [queryEmbedding] = await createEmbedding(query, 'query');

  // 2. 벡터 검색 쿼리 - RPC 함수 사용
  let searchResult;

  if (tags.length > 0) {
    // 태그 필터링 검색
    const { data, error } = await supabase.rpc('match_chunks_with_tags', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      filter_tags: tags,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) throw new Error(`검색 실패: ${error.message}`);
    searchResult = data;
  } else {
    // 일반 검색
    const { data, error } = await supabase.rpc('match_chunks', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) throw new Error(`검색 실패: ${error.message}`);
    searchResult = data;
  }

  return (searchResult || []).map(item => ({
    id: item.id,
    document: item.document_name,
    section: item.section,
    parentSection: item.parent_section,
    content: item.content,
    tags: item.tags,
    chunkType: item.chunk_type,
    similarity: Math.round(item.similarity * 100) / 100
  }));
}

/**
 * 모든 문서 목록 조회
 * @returns {Promise<object[]>}
 */
export async function listDocuments() {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`문서 목록 조회 실패: ${error.message}`);
  }

  return data || [];
}

/**
 * 문서 삭제 (CASCADE로 청크도 삭제됨)
 * @param {string} documentId - 문서 ID
 * @returns {Promise<void>}
 */
export async function deleteDocument(documentId) {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    throw new Error(`문서 삭제 실패: ${error.message}`);
  }
}

/**
 * 특정 문서의 청크 조회
 * @param {string} documentId - 문서 ID
 * @returns {Promise<object[]>}
 */
export async function getDocumentChunks(documentId) {
  if (!supabase) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }

  const { data, error } = await supabase
    .from('chunks')
    .select('id, section, parent_section, content, tags, chunk_type')
    .eq('document_id', documentId)
    .order('id');

  if (error) {
    throw new Error(`청크 조회 실패: ${error.message}`);
  }

  return data || [];
}

export default {
  processDocument,
  searchRAG,
  listDocuments,
  deleteDocument,
  getDocumentChunks
};
