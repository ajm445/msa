import api from '@/lib/api';

/**
 * 분석 API 서비스
 */
export const analysisService = {
  /**
   * 코드 업로드 분석 요청
   * @param {File} file - .zip 파일
   * @param {string} language - 언어/프레임워크 (java-spring, node-express, react)
   * @param {string} [description] - 추가 설명 (선택)
   * @returns {Promise<{analysisId: string, status: string}>}
   */
  async analyzeCode(file, language, description = '') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    if (description) {
      formData.append('description', description);
    }

    return api.post('/analysis/code', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 파일 업로드는 더 긴 타임아웃
    });
  },

  /**
   * 텍스트 설명 분석 요청
   * @param {string} description - 프로젝트 설명 (최소 50자)
   * @param {string} [language] - 언어/프레임워크 (선택, 미정 가능)
   * @returns {Promise<{analysisId: string, status: string}>}
   */
  async analyzeText(description, language = 'undecided') {
    return api.post('/analysis/text', {
      description,
      language,
    });
  },

  /**
   * 분석 결과 조회
   * @param {string} analysisId - 분석 ID
   * @returns {Promise<AnalysisResult>}
   */
  async getResult(analysisId) {
    return api.get(`/analysis/${analysisId}`);
  },

  /**
   * 분석 결과 삭제
   * @param {string} analysisId - 분석 ID
   * @returns {Promise<{success: boolean}>}
   */
  async deleteResult(analysisId) {
    return api.delete(`/analysis/${analysisId}`);
  },
};

/**
 * @typedef {Object} AnalysisResult
 * @property {string} analysisId - 분석 ID
 * @property {string} status - 분석 상태 (pending, processing, completed, failed)
 * @property {string} inputType - 입력 타입 (code, text)
 * @property {string} createdAt - 생성 일시
 * @property {ParsedInfo} parsed - 파싱된 프로젝트 정보
 * @property {Service[]} services - 제안된 서비스 목록
 * @property {Recommendation[]} recommendations - 권고사항
 * @property {Communication[]} communications - 통신 방식 제안
 */

/**
 * @typedef {Object} ParsedInfo
 * @property {string} domain - 도메인
 * @property {string[]} features - 주요 기능
 * @property {string[]} [authMethod] - 인증 방식
 * @property {string[]} [paymentMethod] - 결제 수단
 */

/**
 * @typedef {Object} Service
 * @property {string} name - 서비스명
 * @property {string} responsibility - 책임
 * @property {string} type - 유형 (Core, Supporting, Generic)
 * @property {string[]} endpoints - API 엔드포인트
 * @property {string} database - 데이터베이스명
 * @property {string[]} dependencies - 의존성
 */

/**
 * @typedef {Object} Recommendation
 * @property {string} type - 타입 (info, warning)
 * @property {string} message - 메시지
 * @property {string} [suggestion] - 제안
 */

/**
 * @typedef {Object} Communication
 * @property {string} from - 출발 서비스
 * @property {string} to - 도착 서비스
 * @property {string} method - 통신 방식 (REST, Event, gRPC)
 * @property {string} reason - 이유
 */

export default analysisService;
