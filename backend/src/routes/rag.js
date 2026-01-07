import express from 'express';

const router = express.Router();

/**
 * POST /api/rag/search
 * MSA 가이드 검색
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5, tags } = req.body;

    // 입력 검증
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '검색어를 입력해주세요.'
        }
      });
    }

    // TODO: 실제 RAG 검색 로직 구현
    // 임시 응답
    res.json({
      success: true,
      data: {
        results: [],
        totalResults: 0,
        message: 'RAG 검색 기능은 아직 구현되지 않았습니다.'
      }
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '검색 중 오류가 발생했습니다.'
      }
    });
  }
});

export default router;
