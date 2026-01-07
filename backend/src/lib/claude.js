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
