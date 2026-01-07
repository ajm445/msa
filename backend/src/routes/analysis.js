import express from 'express';
import multer from 'multer';
import { supabase, generateAnalysisId } from '../lib/supabase.js';

const router = express.Router();

// 파일 업로드 설정
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('ZIP 파일만 업로드 가능합니다.'), false);
    }
  }
});

/**
 * POST /api/analysis/code
 * 코드 업로드 분석
 */
router.post('/code', upload.single('file'), async (req, res) => {
  try {
    const { language, description } = req.body;
    const file = req.file;

    // 입력 검증
    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '파일을 업로드해주세요.'
        }
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '언어/프레임워크를 선택해주세요.'
        }
      });
    }

    const analysisId = generateAnalysisId();

    // Supabase가 설정된 경우 DB에 저장
    if (supabase) {
      const { error } = await supabase.from('analyses').insert({
        id: analysisId,
        status: 'pending',
        input_type: 'code',
        input_language: language,
        input_description: description || null,
        input_file_name: file.originalname,
        input_file_size: file.size
      });

      if (error) {
        console.error('DB insert error:', error);
        throw new Error('데이터베이스 저장 실패');
      }
    }

    // TODO: 실제 분석 로직 구현 (Claude API 연동)
    // 현재는 pending 상태로 저장만 함

    res.json({
      success: true,
      data: {
        analysisId,
        status: 'pending',
        inputType: 'code',
        message: 'DB에 저장되었습니다. 분석 기능은 추후 구현 예정입니다.'
      }
    });
  } catch (error) {
    console.error('Code analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error.message || '분석 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * POST /api/analysis/text
 * 텍스트 설명 분석
 */
router.post('/text', async (req, res) => {
  try {
    const { description, language } = req.body;

    // 입력 검증
    if (!description || description.length < 50) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: '프로젝트 설명을 50자 이상 입력해주세요.'
        }
      });
    }

    const analysisId = generateAnalysisId();

    // Supabase가 설정된 경우 DB에 저장
    if (supabase) {
      const { error } = await supabase.from('analyses').insert({
        id: analysisId,
        status: 'pending',
        input_type: 'text',
        input_language: language || 'undecided',
        input_description: description
      });

      if (error) {
        console.error('DB insert error:', error);
        throw new Error('데이터베이스 저장 실패');
      }
    }

    // TODO: 실제 분석 로직 구현 (Claude API 연동)
    // 현재는 pending 상태로 저장만 함

    res.json({
      success: true,
      data: {
        analysisId,
        status: 'pending',
        inputType: 'text',
        message: 'DB에 저장되었습니다. 분석 기능은 추후 구현 예정입니다.'
      }
    });
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYSIS_FAILED',
        message: error.message || '분석 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * GET /api/analysis/:analysisId
 * 분석 결과 조회
 */
router.get('/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: '데이터베이스가 설정되지 않았습니다.'
        }
      });
    }

    // 분석 기본 정보 조회
    const { data: analysis, error: analysisError } = await supabase
      .from('analyses')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (analysisError || !analysis) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '분석 결과를 찾을 수 없습니다.'
        }
      });
    }

    // 서비스 목록 조회
    const { data: services } = await supabase
      .from('analysis_services')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order');

    // 권고사항 조회
    const { data: recommendations } = await supabase
      .from('analysis_recommendations')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order');

    // 통신 방식 조회
    const { data: communications } = await supabase
      .from('analysis_communications')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('display_order');

    // 응답 데이터 구성
    const result = {
      analysisId: analysis.id,
      status: analysis.status,
      inputType: analysis.input_type,
      createdAt: analysis.created_at,
      parsed: analysis.parsed_data || {
        domain: analysis.detected_domain,
        features: []
      },
      services: (services || []).map(s => ({
        name: s.service_name,
        responsibility: s.responsibility,
        type: s.service_type,
        endpoints: s.endpoints || [],
        database: s.database_name,
        dependencies: s.dependencies || []
      })),
      recommendations: (recommendations || []).map(r => ({
        type: r.recommendation_type,
        message: r.message,
        suggestion: r.suggestion
      })),
      communications: (communications || []).map(c => ({
        from: c.from_service,
        to: c.to_service,
        method: c.method,
        reason: c.reason
      }))
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '조회 중 오류가 발생했습니다.'
      }
    });
  }
});

/**
 * DELETE /api/analysis/:analysisId
 * 분석 결과 삭제
 */
router.delete('/:analysisId', async (req, res) => {
  try {
    const { analysisId } = req.params;

    if (!supabase) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: '데이터베이스가 설정되지 않았습니다.'
        }
      });
    }

    const { error } = await supabase
      .from('analyses')
      .delete()
      .eq('id', analysisId);

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: '분석 결과가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '삭제 중 오류가 발생했습니다.'
      }
    });
  }
});

export default router;
