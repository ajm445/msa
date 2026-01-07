import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  Supabase 환경 변수가 설정되지 않았습니다.');
  console.warn('   SUPABASE_URL과 SUPABASE_ANON_KEY를 .env 파일에 설정해주세요.');
}

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Supabase 연결 상태 확인
 * @returns {Promise<boolean>}
 */
export async function checkConnection() {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('analyses').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * 분석 ID 생성
 * @returns {string}
 */
export function generateAnalysisId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `anls_${timestamp}${random}`;
}

export default supabase;
