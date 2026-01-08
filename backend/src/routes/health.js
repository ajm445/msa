import express from 'express';
import { supabase, checkConnection } from '../lib/supabase.js';
import { claude, checkClaudeConnection, getUsageStats, resetUsage } from '../lib/claude.js';
import { isVoyageConfigured, checkVoyageConnection } from '../lib/voyage.js';

const router = express.Router();

/**
 * GET /api/health
 * 서버 상태 확인
 */
router.get('/', async (req, res) => {
  try {
    // 서비스 연결 상태 확인
    const voyageConfigured = isVoyageConfigured();

    const [dbConnected, claudeConnected, voyageConnected] = await Promise.all([
      supabase ? checkConnection() : Promise.resolve(false),
      claude ? checkClaudeConnection() : Promise.resolve(false),
      voyageConfigured ? checkVoyageConnection() : Promise.resolve(false)
    ]);

    const services = {
      database: supabase ? (dbConnected ? 'connected' : 'disconnected') : 'not_configured',
      claude_api: claude ? (claudeConnected ? 'connected' : 'disconnected') : 'not_configured',
      voyage_api: voyageConfigured ? (voyageConnected ? 'connected' : 'disconnected') : 'not_configured'
    };

    // 전체 상태 판단
    const isHealthy = supabase ? dbConnected : true; // DB가 설정된 경우 연결 필수

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services,
        usage: claude ? getUsageStats() : null
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

/**
 * GET /api/health/usage
 * Claude API 사용량 조회
 */
router.get('/usage', (req, res) => {
  if (!claude) {
    return res.status(503).json({
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'Claude API가 설정되지 않았습니다.' }
    });
  }

  res.json({
    success: true,
    data: getUsageStats()
  });
});

/**
 * POST /api/health/usage/reset
 * Claude API 사용량 초기화
 */
router.post('/usage/reset', (req, res) => {
  if (!claude) {
    return res.status(503).json({
      success: false,
      error: { code: 'NOT_CONFIGURED', message: 'Claude API가 설정되지 않았습니다.' }
    });
  }

  resetUsage();
  res.json({
    success: true,
    message: '사용량이 초기화되었습니다.',
    data: getUsageStats()
  });
});

export default router;
