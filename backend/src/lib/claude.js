import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn('⚠️  ANTHROPIC_API_KEY가 설정되지 않았습니다.');
  console.warn('   .env 파일에 ANTHROPIC_API_KEY를 설정해주세요.');
}

export const claude = apiKey ? new Anthropic({ apiKey }) : null;

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
