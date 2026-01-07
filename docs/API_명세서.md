# API 명세서

## 문서 정보

| 항목 | 내용 |
|------|------|
| 문서명 | API 명세서 |
| 버전 | 1.0 |
| 작성일 | 2026-01-07 |
| 목적 | MSA 분석 AI 서비스 백엔드 API 정의 |

---

## 1. API 개요

### 1.1 기본 정보

| 항목 | 내용 |
|------|------|
| Base URL | `http://localhost:3000/api` |
| 프로토콜 | REST API |
| 데이터 형식 | JSON |
| 인코딩 | UTF-8 |

### 1.2 공통 응답 형식

**성공 응답**
```json
{
  "success": true,
  "data": { ... },
  "message": "요청이 성공적으로 처리되었습니다."
}
```

**에러 응답**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "에러 메시지"
  }
}
```

### 1.3 공통 에러 코드

| 코드 | HTTP Status | 설명 |
|------|-------------|------|
| INVALID_REQUEST | 400 | 잘못된 요청 |
| UNAUTHORIZED | 401 | 인증 필요 |
| NOT_FOUND | 404 | 리소스 없음 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |
| ANALYSIS_FAILED | 500 | 분석 실패 |
| FILE_TOO_LARGE | 413 | 파일 크기 초과 |
| UNSUPPORTED_FORMAT | 415 | 지원하지 않는 형식 |

---

## 2. 분석 API

### 2.1 코드 업로드 분석

코드/폴더를 업로드하여 MSA 구조 분석

**Endpoint**
```
POST /api/analysis/code
```

**Request**
- Content-Type: `multipart/form-data`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| file | File | ✅ | 압축 파일 (.zip) |
| language | String | ✅ | 언어/프레임워크 (java-spring, node-express, react) |
| description | String | ❌ | 추가 설명 |

**Request 예시**
```bash
curl -X POST http://localhost:3000/api/analysis/code \
  -F "file=@project.zip" \
  -F "language=java-spring" \
  -F "description=쇼핑몰 프로젝트입니다"
```

**Response**
```json
{
  "success": true,
  "data": {
    "analysisId": "anls_abc123",
    "status": "completed",
    "inputType": "code",
    "summary": {
      "domain": "이커머스",
      "detectedLanguage": "java-spring",
      "totalFiles": 45,
      "analyzedFiles": 38
    },
    "services": [
      {
        "name": "User Service",
        "responsibility": "회원 가입, 인증, 프로필 관리",
        "type": "Supporting",
        "endpoints": ["/users", "/auth", "/profile"],
        "database": "user_db",
        "dependencies": ["Auth Service"]
      },
      {
        "name": "Order Service",
        "responsibility": "주문 생성, 상태 관리",
        "type": "Core",
        "endpoints": ["/orders", "/cart"],
        "database": "order_db",
        "dependencies": ["User Service", "Product Service", "Payment Service"]
      }
    ],
    "diagram": {
      "nodes": [
        { "id": "user", "label": "User Service", "type": "Supporting" },
        { "id": "order", "label": "Order Service", "type": "Core" }
      ],
      "edges": [
        { "from": "order", "to": "user", "label": "REST" }
      ]
    },
    "recommendations": [
      {
        "type": "warning",
        "message": "User와 Order 간 순환 의존성이 감지되었습니다.",
        "suggestion": "이벤트 기반 통신으로 변경을 권장합니다."
      }
    ],
    "createdAt": "2026-01-07T10:30:00Z"
  }
}
```

---

### 2.2 텍스트 설명 분석

텍스트로 프로젝트를 설명하여 MSA 구조 분석

**Endpoint**
```
POST /api/analysis/text
```

**Request**
- Content-Type: `application/json`

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| description | String | ✅ | 프로젝트 설명 (최소 50자) |
| language | String | ❌ | 예상 언어/프레임워크 |

**Request 예시**
```json
{
  "description": "쇼핑몰을 만들려고 합니다. 회원가입, 상품 관리, 주문, 결제, 배송 추적 기능이 필요해요. 회원은 소셜 로그인도 지원하고, 결제는 카드와 계좌이체를 지원합니다.",
  "language": "node-express"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "analysisId": "anls_def456",
    "status": "completed",
    "inputType": "text",
    "parsed": {
      "domain": "이커머스 (쇼핑몰)",
      "features": ["회원가입", "상품 관리", "주문", "결제", "배송 추적"],
      "authMethod": ["소셜 로그인"],
      "paymentMethod": ["카드", "계좌이체"]
    },
    "services": [
      {
        "name": "User Service",
        "responsibility": "회원가입, 소셜 로그인",
        "type": "Supporting",
        "endpoints": ["/users", "/auth/social"],
        "database": "user_db",
        "dependencies": []
      },
      {
        "name": "Product Service",
        "responsibility": "상품 관리",
        "type": "Core",
        "endpoints": ["/products", "/categories"],
        "database": "product_db",
        "dependencies": []
      },
      {
        "name": "Order Service",
        "responsibility": "주문 처리",
        "type": "Core",
        "endpoints": ["/orders", "/cart"],
        "database": "order_db",
        "dependencies": ["User Service", "Product Service"]
      },
      {
        "name": "Payment Service",
        "responsibility": "카드/계좌이체 결제",
        "type": "Generic",
        "endpoints": ["/payments", "/refunds"],
        "database": "payment_db",
        "dependencies": ["Order Service"]
      },
      {
        "name": "Shipping Service",
        "responsibility": "배송 추적",
        "type": "Generic",
        "endpoints": ["/shipping", "/tracking"],
        "database": "shipping_db",
        "dependencies": ["Order Service"]
      }
    ],
    "diagram": {
      "nodes": [
        { "id": "user", "label": "User Service", "type": "Supporting" },
        { "id": "product", "label": "Product Service", "type": "Core" },
        { "id": "order", "label": "Order Service", "type": "Core" },
        { "id": "payment", "label": "Payment Service", "type": "Generic" },
        { "id": "shipping", "label": "Shipping Service", "type": "Generic" }
      ],
      "edges": [
        { "from": "order", "to": "user", "label": "REST" },
        { "from": "order", "to": "product", "label": "REST" },
        { "from": "payment", "to": "order", "label": "Event" },
        { "from": "shipping", "to": "order", "label": "Event" }
      ]
    },
    "recommendations": [
      {
        "type": "info",
        "message": "결제 서비스는 외부 PG사 연동이 필요합니다.",
        "suggestion": "Stripe, 토스페이먼츠 등을 고려해보세요."
      }
    ],
    "createdAt": "2026-01-07T10:35:00Z"
  }
}
```

---

### 2.3 분석 결과 조회

저장된 분석 결과 조회

**Endpoint**
```
GET /api/analysis/:analysisId
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| analysisId | String | 분석 ID |

**Response**
```json
{
  "success": true,
  "data": {
    "analysisId": "anls_abc123",
    "status": "completed",
    "inputType": "code",
    "summary": { ... },
    "services": [ ... ],
    "diagram": { ... },
    "recommendations": [ ... ],
    "createdAt": "2026-01-07T10:30:00Z"
  }
}
```

**Error Response**
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "분석 결과를 찾을 수 없습니다."
  }
}
```

---

### 2.4 분석 결과 삭제

저장된 분석 결과 삭제

**Endpoint**
```
DELETE /api/analysis/:analysisId
```

**Path Parameters**

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| analysisId | String | 분석 ID |

**Response**
```json
{
  "success": true,
  "message": "분석 결과가 삭제되었습니다."
}
```

---

## 3. RAG 검색 API

### 3.1 MSA 가이드 검색

RAG 기반으로 MSA 관련 가이드 검색

**Endpoint**
```
POST /api/rag/search
```

**Request**
```json
{
  "query": "서비스 분리 기준이 뭔가요?",
  "limit": 5,
  "tags": ["서비스분리", "DDD"]
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| query | String | ✅ | 검색 질문 |
| limit | Number | ❌ | 결과 개수 (기본값: 5, 최대: 10) |
| tags | String[] | ❌ | 필터링할 태그 |

**Response**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "msa-def-5-2",
        "document": "MSA_정의서.md",
        "section": "5.2 분리 기준 체크리스트",
        "content": "서비스 분리 기준 체크리스트: 비즈니스 기능 - 독립적인 비즈니스 가치를 제공하는가? 데이터 소유권 - 명확한 데이터 경계가 있는가? ...",
        "tags": ["서비스분리", "체크리스트", "DDD"],
        "similarity": 0.89
      },
      {
        "id": "domain-guide-2-2",
        "document": "도메인_분석_가이드.md",
        "section": "2.2 Bounded Context 식별 방법",
        "content": "Bounded Context 식별 방법: Step 1 - 유비쿼터스 언어 수집...",
        "tags": ["bounded-context", "DDD", "도메인"],
        "similarity": 0.82
      }
    ],
    "totalResults": 2
  }
}
```

---

## 4. 헬스체크 API

### 4.1 서버 상태 확인

**Endpoint**
```
GET /api/health
```

**Response**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.0.0",
    "timestamp": "2026-01-07T10:00:00Z",
    "services": {
      "database": "connected",
      "claude_api": "connected",
      "voyage_api": "connected"
    }
  }
}
```

---

## 5. API 엔드포인트 요약

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/analysis/code | 코드 업로드 분석 |
| POST | /api/analysis/text | 텍스트 설명 분석 |
| GET | /api/analysis/:analysisId | 분석 결과 조회 |
| DELETE | /api/analysis/:analysisId | 분석 결과 삭제 |
| POST | /api/rag/search | MSA 가이드 검색 |
| GET | /api/health | 서버 상태 확인 |

---

## 6. 제한 사항

### 6.1 파일 업로드 제한

| 항목 | 제한 |
|------|------|
| 최대 파일 크기 | 50MB |
| 지원 형식 | .zip |
| 지원 언어 | java-spring, node-express, react |

### 6.2 Rate Limiting

| 항목 | 제한 |
|------|------|
| 분석 API | 10회 / 분 |
| RAG 검색 API | 30회 / 분 |
| 헬스체크 API | 제한 없음 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-07 | 최초 작성 | - |
