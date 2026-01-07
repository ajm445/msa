import express from 'express';
import { searchRAG, processDocument, listDocuments, deleteDocument, getDocumentChunks } from '../services/ragService.js';
import { isVoyageConfigured } from '../lib/voyage.js';

const router = express.Router();

/**
 * POST /api/rag/search
 * MSA 가이드 검색
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5, tags = [], threshold = 0.3 } = req.body;

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

    // Voyage AI 설정 확인
    if (!isVoyageConfigured()) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'RAG 서비스가 설정되지 않았습니다. VOYAGE_API_KEY를 확인해주세요.'
        }
      });
    }

    // RAG 검색 수행
    const results = await searchRAG(query, {
      limit: Math.min(limit, 10),
      tags: Array.isArray(tags) ? tags : [],
      threshold: Math.max(0.1, Math.min(threshold, 1.0))
    });

    res.json({
      success: true,
      data: {
        results,
        totalResults: results.length
      }
    });
  } catch (error) {
    console.error('RAG search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_FAILED',
        message: error.message || '검색 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * GET /api/rag/documents
 * 문서 목록 조회
 */
router.get('/documents', async (req, res) => {
  try {
    const documents = await listDocuments();

    res.json({
      success: true,
      data: {
        documents,
        totalDocuments: documents.length
      }
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '문서 목록 조회 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * GET /api/rag/documents/:documentId/chunks
 * 특정 문서의 청크 조회
 */
router.get('/documents/:documentId/chunks', async (req, res) => {
  try {
    const { documentId } = req.params;
    const chunks = await getDocumentChunks(documentId);

    res.json({
      success: true,
      data: {
        documentId,
        chunks,
        totalChunks: chunks.length
      }
    });
  } catch (error) {
    console.error('Get chunks error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '청크 조회 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * DELETE /api/rag/documents/:documentId
 * 문서 삭제
 */
router.delete('/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    await deleteDocument(documentId);

    res.json({
      success: true,
      message: '문서가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete document error:', error?.message || error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error?.message || '서버 내부 오류가 발생했습니다.'
      }
    });
  }
});

export default router;
