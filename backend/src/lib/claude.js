import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

// API 키가 없거나 플레이스홀더인 경우 체크
const isValidApiKey = apiKey &&
  !apiKey.includes('your_') &&
  !apiKey.includes('your-') &&
  apiKey.startsWith('sk-');

if (!isValidApiKey) {
  console.warn('⚠️  ANTHROPIC_API_KEY가 설정되지 않았거나 유효하지 않습니다.');
  console.warn('   .env 파일에 유효한 ANTHROPIC_API_KEY를 설정해주세요.');
  console.warn('   API 키는 "sk-ant-" 로 시작합니다.');
}

// ===========================================
// 비용 추적 및 제한 설정
// ===========================================
const COST_CONFIG = {
  // 월간 총 한도 (달러)
  MONTHLY_LIMIT: parseFloat(process.env.CLAUDE_MONTHLY_LIMIT) || 10,
  // 경고 임계값 (달러) - 이 금액 이상 사용 시 API 거부
  WARNING_THRESHOLD: parseFloat(process.env.CLAUDE_WARNING_THRESHOLD) || 5,
  // Claude Sonnet 4 요금 (1M 토큰당)
  INPUT_COST_PER_MILLION: 3,   // $3 / 1M input tokens
  OUTPUT_COST_PER_MILLION: 15  // $15 / 1M output tokens
};

// 사용량 추적 (메모리 저장 - 서버 재시작 시 초기화)
let usageTracker = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCost: 0,
  requestCount: 0,
  startDate: new Date().toISOString()
};

/**
 * 비용 계산
 */
function calculateCost(inputTokens, outputTokens) {
  const inputCost = (inputTokens / 1_000_000) * COST_CONFIG.INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * COST_CONFIG.OUTPUT_COST_PER_MILLION;
  return inputCost + outputCost;
}

/**
 * 사용량 업데이트
 */
export function updateUsage(inputTokens, outputTokens) {
  usageTracker.totalInputTokens += inputTokens;
  usageTracker.totalOutputTokens += outputTokens;
  usageTracker.totalCost += calculateCost(inputTokens, outputTokens);
  usageTracker.requestCount += 1;

  console.log(`📊 Claude 사용량: $${usageTracker.totalCost.toFixed(4)} / $${COST_CONFIG.WARNING_THRESHOLD} (${usageTracker.requestCount}회)`);
}

/**
 * 비용 한도 체크
 * @returns {{ allowed: boolean, reason?: string, usage: object }}
 */
export function checkCostLimit() {
  if (usageTracker.totalCost >= COST_CONFIG.WARNING_THRESHOLD) {
    return {
      allowed: false,
      reason: `비용 한도 도달: $${usageTracker.totalCost.toFixed(2)} >= $${COST_CONFIG.WARNING_THRESHOLD}`,
      usage: getUsageStats()
    };
  }
  return { allowed: true, usage: getUsageStats() };
}

/**
 * 사용량 통계 조회
 */
export function getUsageStats() {
  return {
    ...usageTracker,
    totalCost: parseFloat(usageTracker.totalCost.toFixed(4)),
    limit: COST_CONFIG.WARNING_THRESHOLD,
    monthlyLimit: COST_CONFIG.MONTHLY_LIMIT,
    remaining: parseFloat((COST_CONFIG.WARNING_THRESHOLD - usageTracker.totalCost).toFixed(4)),
    percentUsed: parseFloat(((usageTracker.totalCost / COST_CONFIG.WARNING_THRESHOLD) * 100).toFixed(1))
  };
}

/**
 * 사용량 초기화 (수동)
 */
export function resetUsage() {
  usageTracker = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCost: 0,
    requestCount: 0,
    startDate: new Date().toISOString()
  };
  console.log('📊 Claude 사용량이 초기화되었습니다.');
}

export const claude = isValidApiKey ? new Anthropic({ apiKey }) : null;

/**
 * Claude API 연결 상태 확인
 * @returns {Promise<boolean>}
 */
export async function checkClaudeConnection() {
  if (!claude) {
    return false;
  }

  try {
    // 간단한 메시지로 연결 테스트
    await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }]
    });
    return true;
  } catch (error) {
    console.error('Claude API 연결 실패:', error.message);
    return false;
  }
}

export default claude;
