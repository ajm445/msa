import express from 'express';
import { supabase, checkConnection } from '../lib/supabase.js';
import { claude, checkClaudeConnection } from '../lib/claude.js';

const router = express.Router();

/**
 * GET /api/health
 * 서버 상태 확인
 */
router.get('/', async (req, res) => {
  try {
    // 서비스 연결 상태 확인
    const [dbConnected, claudeConnected] = await Promise.all([
      supabase ? checkConnection() : Promise.resolve(false),
      claude ? checkClaudeConnection() : Promise.resolve(false)
    ]);

    const services = {
      database: supabase ? (dbConnected ? 'connected' : 'disconnected') : 'not_configured',
      claude_api: claude ? (claudeConnected ? 'connected' : 'disconnected') : 'not_configured',
      voyage_api: 'not_configured' // 추후 구현
    };

    // 전체 상태 판단
    const isHealthy = supabase ? dbConnected : true; // DB가 설정된 경우 연결 필수

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'degraded',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services
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
