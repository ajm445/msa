import express from 'express';

const router = express.Router();

/**
 * GET /api/health
 * 서버 상태 확인
 */
router.get('/', async (req, res) => {
  try {
    // TODO: 실제 서비스 연결 상태 확인 로직 구현
    res.json({
      success: true,
      data: {
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: {
          database: 'not_configured',
          claude_api: 'not_configured',
          voyage_api: 'not_configured'
        }
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      data: {
        status: 'unhealthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

export default router;
