import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import analysisRoutes from './routes/analysis.js';
import ragRoutes from './routes/rag.js';
import healthRoutes from './routes/health.js';

// 환경 변수 로드
dotenv.config();

// ES Module에서 __dirname 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 미들웨어 설정
app.use(cors({
  origin: isProduction ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const analysisLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 분당 10회
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
    }
  }
});

const ragLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 30, // 분당 30회
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.'
    }
  }
});

// 라우트 설정
app.use('/api/analysis', analysisLimiter, analysisRoutes);
app.use('/api/rag', ragLimiter, ragRoutes);
app.use('/api/health', healthRoutes);

// 프로덕션: Frontend 정적 파일 서빙
if (isProduction) {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // SPA fallback - API가 아닌 모든 요청을 index.html로
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  // 개발 환경: API 정보 표시
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'MSA Analyzer API Server',
      version: '1.0.0'
    });
  });

  // 404 처리 (개발 환경에서만)
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: '요청한 리소스를 찾을 수 없습니다.'
      }
    });
  });
}

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '서버 내부 오류가 발생했습니다.'
    }
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 MSA Analyzer API Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
});
