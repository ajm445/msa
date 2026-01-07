import claude from '../lib/claude.js';

/**
 * MSA 분석을 위한 시스템 프롬프트
 */
const SYSTEM_PROMPT = `당신은 MSA(Microservice Architecture) 전문가입니다.
사용자의 프로젝트 설명이나 코드 구조를 분석하여 최적의 MSA 서비스 분리 방안을 제안합니다.

## 분석 원칙
1. DDD(Domain-Driven Design) 원칙에 따라 Bounded Context를 식별합니다.
2. 서비스 간 결합도는 최소화하고, 응집도는 최대화합니다.
3. 데이터 소유권을 명확히 하여 각 서비스가 자체 데이터베이스를 갖도록 합니다.
4. 실용적이고 구현 가능한 수준의 서비스 분리를 제안합니다.

## 서비스 유형
- Core: 핵심 비즈니스 로직을 담당하는 서비스 (예: Order, Product)
- Supporting: 핵심 서비스를 지원하는 서비스 (예: User, Auth)
- Generic: 범용적으로 사용되는 서비스 (예: Payment, Notification)

## 통신 방식
- REST: 동기적 요청/응답이 필요한 경우
- Event: 비동기 이벤트 기반 통신 (느슨한 결합)
- gRPC: 고성능, 타입 안전성이 필요한 내부 통신
- MessageQueue: 메시지 큐를 통한 비동기 처리

반드시 지정된 JSON 형식으로만 응답하세요.`;

/**
 * 텍스트 설명 분석을 위한 프롬프트 생성
 */
function createTextAnalysisPrompt(description, language) {
  return `다음 프로젝트 설명을 분석하여 MSA 서비스 분리 방안을 제안해주세요.

## 프로젝트 설명
${description}

## 예상 기술 스택
${language || '미정 (자유롭게 제안)'}

## 응답 형식 (반드시 이 JSON 형식으로만 응답)
{
  "parsed": {
    "domain": "프로젝트 도메인 (예: 이커머스, 핀테크, 소셜미디어)",
    "features": ["기능1", "기능2", "..."],
    "complexity": "low | medium | high"
  },
  "services": [
    {
      "name": "서비스명 (예: User Service)",
      "responsibility": "서비스 책임 설명",
      "type": "Core | Supporting | Generic",
      "endpoints": ["/api/endpoint1", "/api/endpoint2"],
      "database": "데이터베이스명",
      "dependencies": ["의존하는 다른 서비스명"]
    }
  ],
  "diagram": {
    "nodes": [
      {"id": "고유ID", "label": "서비스명", "type": "Core | Supporting | Generic"}
    ],
    "edges": [
      {"from": "출발노드ID", "to": "도착노드ID", "label": "REST | Event | gRPC | MessageQueue"}
    ]
  },
  "communications": [
    {
      "from": "출발 서비스명",
      "to": "도착 서비스명",
      "method": "REST | Event | gRPC | MessageQueue",
      "reason": "이 통신 방식을 선택한 이유"
    }
  ],
  "recommendations": [
    {
      "type": "info | warning | error",
      "message": "권고 메시지",
      "suggestion": "구체적인 제안"
    }
  ]
}`;
}

/**
 * 코드 분석을 위한 프롬프트 생성
 */
function createCodeAnalysisPrompt(codeStructure, language, description) {
  return `다음 코드 구조를 분석하여 MSA 서비스 분리 방안을 제안해주세요.

## 코드 구조
${codeStructure}

## 언어/프레임워크
${language}

## 추가 설명
${description || '없음'}

## 응답 형식 (반드시 이 JSON 형식으로만 응답)
{
  "summary": {
    "domain": "프로젝트 도메인",
    "detectedPatterns": ["MVC", "Repository", "..."],
    "totalFiles": 0,
    "analyzedFiles": 0
  },
  "services": [
    {
      "name": "서비스명",
      "responsibility": "서비스 책임 설명",
      "type": "Core | Supporting | Generic",
      "endpoints": ["/api/endpoint1"],
      "database": "데이터베이스명",
      "dependencies": ["의존하는 다른 서비스명"],
      "sourceFiles": ["관련 소스 파일 경로"]
    }
  ],
  "diagram": {
    "nodes": [
      {"id": "고유ID", "label": "서비스명", "type": "Core | Supporting | Generic"}
    ],
    "edges": [
      {"from": "출발노드ID", "to": "도착노드ID", "label": "REST | Event | gRPC | MessageQueue"}
    ]
  },
  "communications": [
    {
      "from": "출발 서비스명",
      "to": "도착 서비스명",
      "method": "REST | Event | gRPC | MessageQueue",
      "reason": "이 통신 방식을 선택한 이유"
    }
  ],
  "recommendations": [
    {
      "type": "info | warning | error",
      "message": "권고 메시지",
      "suggestion": "구체적인 제안"
    }
  ]
}`;
}

/**
 * Claude API 응답에서 JSON 추출
 */
function extractJsonFromResponse(content) {
  // 코드 블록 내 JSON 추출
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1].trim());
  }

  // 직접 JSON 파싱 시도
  return JSON.parse(content);
}

/**
 * 텍스트 설명 기반 MSA 분석
 * @param {string} description - 프로젝트 설명
 * @param {string} language - 예상 언어/프레임워크
 * @returns {Promise<object>} 분석 결과
 */
export async function analyzeText(description, language) {
  if (!claude) {
    throw new Error('Claude API가 설정되지 않았습니다. ANTHROPIC_API_KEY를 확인해주세요.');
  }

  const prompt = createTextAnalysisPrompt(description, language);

  try {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;
    const result = extractJsonFromResponse(content);

    return {
      status: 'completed',
      ...result
    };
  } catch (error) {
    console.error('텍스트 분석 실패:', error);
    throw new Error(`분석 실패: ${error.message}`);
  }
}

/**
 * 코드 구조 기반 MSA 분석
 * @param {string} codeStructure - 코드 구조 정보
 * @param {string} language - 언어/프레임워크
 * @param {string} description - 추가 설명
 * @returns {Promise<object>} 분석 결과
 */
export async function analyzeCode(codeStructure, language, description) {
  if (!claude) {
    throw new Error('Claude API가 설정되지 않았습니다. ANTHROPIC_API_KEY를 확인해주세요.');
  }

  const prompt = createCodeAnalysisPrompt(codeStructure, language, description);

  try {
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0].text;
    const result = extractJsonFromResponse(content);

    return {
      status: 'completed',
      ...result
    };
  } catch (error) {
    console.error('코드 분석 실패:', error);
    throw new Error(`분석 실패: ${error.message}`);
  }
}

export default {
  analyzeText,
  analyzeCode
};
