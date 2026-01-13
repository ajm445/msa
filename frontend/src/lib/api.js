import axios from 'axios';

// API 기본 설정
// 프로덕션: 같은 서버에서 서빙되므로 상대경로 '/api' 사용
// 개발: localhost:3000/api 사용
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api'),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    // 요청 전 처리 (예: 토큰 추가)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 에러 처리
    const errorMessage = error.response?.data?.error?.message
      || error.message
      || '알 수 없는 오류가 발생했습니다.';

    console.error('API Error:', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

export default api;
