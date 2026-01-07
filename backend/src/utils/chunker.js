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

  if (lowerContent.includes('란?') || lowerContent.includes('정의') || lowerContent.includes('이란')) {
    return 'definition';
  }
  if (lowerContent.includes('vs') || lowerContent.includes('비교') || lowerContent.includes('차이')) {
    return 'comparison';
  }
  if (lowerContent.includes('체크리스트') || lowerContent.includes('□') || lowerContent.includes('✅')) {
    return 'checklist';
  }
  if (lowerContent.includes('예시') || lowerContent.includes('사례') || lowerContent.includes('예를 들')) {
    return 'example';
  }
  if (lowerContent.includes('방법') || lowerContent.includes('절차') || lowerContent.includes('step') || lowerContent.includes('단계')) {
    return 'guide';
  }
  if (lowerContent.includes('패턴') || lowerContent.includes('pattern')) {
    return 'pattern';
  }
  if (lowerContent.includes('주의') || lowerContent.includes('안티패턴') || lowerContent.includes('하지 마') || lowerContent.includes('금지')) {
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
    'MSA': ['MSA', '마이크로서비스', 'Microservice'],
    '모놀리식': ['모놀리식', 'monolithic', '모놀리스'],
    'API-Gateway': ['API Gateway', 'gateway', '게이트웨이'],
    'DDD': ['DDD', 'Domain-Driven', '도메인 주도', '도메인주도'],
    'Bounded-Context': ['Bounded Context', '바운디드 컨텍스트', '경계 컨텍스트', '바운디드컨텍스트'],
    'REST': ['REST', 'RESTful'],
    'gRPC': ['gRPC'],
    'Event': ['이벤트', 'event', 'Event-Driven', '이벤트 기반'],
    'Kafka': ['Kafka', '카프카'],
    'CQRS': ['CQRS'],
    'Saga': ['Saga', '사가'],
    'Circuit-Breaker': ['Circuit Breaker', '서킷 브레이커', '서킷브레이커'],
    '서비스분리': ['서비스 분리', '분리 기준', '분리 방법', '서비스분리'],
    '데이터베이스': ['데이터베이스', 'Database', 'DB', '데이터 분리'],
    '통신': ['통신', 'Communication', '동기', '비동기'],
    '확장성': ['확장성', 'Scalability', '스케일'],
    '배포': ['배포', 'Deploy', 'CI/CD', 'DevOps']
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

      // 최소 길이 검사 (100자 미만이면 스킵) - 기존 200자에서 완화
      if (chunkContent.length < 100) continue;

      // 최대 길이 검사 (1000자 초과 시 분할)
      if (chunkContent.length > 1000) {
        const splitChunks = splitLongContent(chunkContent, 800);
        for (const splitContent of splitChunks) {
          if (splitContent.length < 100) continue;

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
 * 청킹 결과 통계
 * @param {object[]} chunks - 청크 배열
 * @returns {object} 통계 정보
 */
export function getChunkStats(chunks) {
  const stats = {
    totalChunks: chunks.length,
    avgLength: 0,
    minLength: Infinity,
    maxLength: 0,
    byType: {},
    byTag: {}
  };

  let totalLength = 0;

  for (const chunk of chunks) {
    const len = chunk.content.length;
    totalLength += len;
    stats.minLength = Math.min(stats.minLength, len);
    stats.maxLength = Math.max(stats.maxLength, len);

    // 타입별 카운트
    stats.byType[chunk.chunk_type] = (stats.byType[chunk.chunk_type] || 0) + 1;

    // 태그별 카운트
    for (const tag of chunk.tags) {
      stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
    }
  }

  stats.avgLength = Math.round(totalLength / chunks.length);

  return stats;
}

export default { chunkMarkdown, extractTags, determineChunkType, getChunkStats };
