import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.VOYAGE_API_KEY;

// API 키 유효성 검사
const isValidApiKey = apiKey &&
  !apiKey.includes('your_') &&
  !apiKey.includes('your-') &&
  apiKey.startsWith('pa-');

if (!isValidApiKey) {
  console.warn('⚠️  VOYAGE_API_KEY가 설정되지 않았거나 유효하지 않습니다.');
  console.warn('   .env 파일에 유효한 VOYAGE_API_KEY를 설정해주세요.');
  console.warn('   API 키는 "pa-" 로 시작합니다.');
}

// Voyage AI는 voyageai 패키지 대신 REST API 직접 호출
const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';

/**
 * 텍스트를 벡터로 임베딩
 * @param {string|string[]} texts - 임베딩할 텍스트
 * @param {string} inputType - 'document' 또는 'query'
 * @returns {Promise<number[][]>} 임베딩 벡터 배열
 */
export async function createEmbedding(texts, inputType = 'document') {
  if (!isValidApiKey) {
    throw new Error('Voyage AI가 설정되지 않았습니다. VOYAGE_API_KEY를 확인해주세요.');
  }

  const textsArray = Array.isArray(texts) ? texts : [texts];

  const response = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      input: textsArray,
      model: 'voyage-3',  // 범용 모델 (voyage-code-3은 코드 특화)
      input_type: inputType
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Voyage AI 오류: ${error.detail || response.statusText}`);
  }

  const data = await response.json();
  return data.data.map(item => item.embedding);
}

/**
 * Voyage AI 연결 상태 확인
 * @returns {Promise<boolean>}
 */
export async function checkVoyageConnection() {
  if (!isValidApiKey) {
    return false;
  }

  try {
    await createEmbedding(['test'], 'query');
    return true;
  } catch (error) {
    console.error('Voyage AI 연결 실패:', error.message);
    return false;
  }
}

/**
 * Voyage AI 설정 여부 확인
 * @returns {boolean}
 */
export function isVoyageConfigured() {
  return isValidApiKey;
}

export default {
  createEmbedding,
  checkVoyageConnection,
  isVoyageConfigured
};
