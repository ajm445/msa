# Claude API 크레딧 구매 및 관리 가이드

## 1. 개요

MSA Analyzer는 Claude API를 사용하여 MSA 분석을 수행합니다. API를 사용하려면 Anthropic 계정에 크레딧이 있어야 합니다.

### 요금 체계 (Claude Sonnet 4 기준)

| 항목 | 요금 |
|------|------|
| 입력 토큰 | $3 / 1M 토큰 |
| 출력 토큰 | $15 / 1M 토큰 |
| **분석 1회당 예상 비용** | **$0.05 ~ $0.10** |

---

## 2. 크레딧 구매 방법

### 2.1 Anthropic Console 접속

1. https://console.anthropic.com 접속
2. 로그인 (계정이 없으면 회원가입)

### 2.2 결제 수단 등록

1. **Settings → Billing** 이동
   - 직접 URL: https://console.anthropic.com/settings/billing

2. **Add payment method** 클릭

3. 결제 정보 입력:
   - 신용카드/체크카드 번호
   - 만료일
   - CVC
   - 청구지 주소

### 2.3 크레딧 구매

1. **Buy credits** 클릭

2. 구매 금액 선택:
   | 금액 | 예상 분석 횟수 |
   |------|----------------|
   | $5 | ~70회 |
   | $10 | ~140회 |
   | $20 | ~280회 |
   | $50 | ~700회 |

3. **Purchase** 클릭하여 결제 완료

---

## 3. 한도 설정 (권장)

예상치 못한 비용을 방지하기 위해 한도 설정을 권장합니다.

### 3.1 한도 설정 페이지

https://console.anthropic.com/settings/limits

### 3.2 설정 항목

| 설정 | 설명 | 권장값 |
|------|------|--------|
| **Monthly spend limit** | 월간 최대 지출 | $10 ~ $20 |
| **Usage alert threshold** | 알림 받을 금액 | $5 |

### 3.3 설정 방법

```
1. "Monthly spend limit" 옆 [Edit] 클릭
2. 원하는 금액 입력 (예: 10)
3. [Save] 클릭

4. "Usage alert threshold" 옆 [Edit] 클릭
5. 알림 받을 금액 입력 (예: 5)
6. [Save] 클릭
```

### 3.4 동작 방식

| 사용량 | 동작 |
|--------|------|
| $0 ~ 임계값 미만 | 정상 작동 |
| 임계값 도달 | 이메일 알림 발송 |
| 월간 한도 도달 | API 호출 자동 차단 |

---

## 4. 사용량 모니터링

### 4.1 Anthropic Console에서 확인

**Usage 페이지:** https://console.anthropic.com/settings/usage

확인 가능 항목:
- 일별/월별 사용량
- 토큰 사용량 (입력/출력)
- 비용 상세 내역

### 4.2 MSA Analyzer에서 확인

백엔드 서버가 실행 중일 때:

```bash
# 사용량 조회
curl http://localhost:3000/api/health/usage

# 응답 예시
{
  "success": true,
  "data": {
    "totalInputTokens": 15000,
    "totalOutputTokens": 3000,
    "totalCost": 0.09,
    "requestCount": 2,
    "limit": 5,
    "remaining": 4.91,
    "percentUsed": 1.8
  }
}
```

```bash
# 사용량 초기화 (서버 재시작 시 자동 초기화됨)
curl -X POST http://localhost:3000/api/health/usage/reset
```

---

## 5. 애플리케이션 비용 제한 설정

MSA Analyzer 백엔드에서 자체적으로 비용 제한을 설정할 수 있습니다.

### 5.1 환경 변수 설정

`backend/.env` 파일:

```env
# Claude API 비용 제한
CLAUDE_MONTHLY_LIMIT=10       # 월간 총 한도 ($10)
CLAUDE_WARNING_THRESHOLD=5    # 이 금액에서 API 거부 ($5)
```

### 5.2 동작 방식

| 사용량 | 동작 |
|--------|------|
| $0 ~ $4.99 | 정상 작동 |
| $5 이상 | API 호출 거부 (에러 반환) |

### 5.3 참고사항

- 서버 재시작 시 사용량이 초기화됩니다
- Anthropic Console의 한도 설정과 별개로 작동합니다
- 두 가지를 함께 사용하면 이중 안전장치가 됩니다

---

## 6. 자주 묻는 질문 (FAQ)

### Q1. 무료 크레딧이 있나요?

신규 가입 시 $5 무료 크레딧이 제공될 수 있습니다. 단, 프로모션에 따라 다를 수 있으며, 유효 기간이 있습니다.

### Q2. 크레딧이 소진되면 어떻게 되나요?

API 호출 시 다음 오류가 발생합니다:
```
Your credit balance is too low to access the Anthropic API.
```
크레딧을 추가 구매하면 즉시 사용 가능합니다.

### Q3. 환불이 가능한가요?

구매한 크레딧은 일반적으로 환불되지 않습니다. 소액부터 구매하여 테스트 후 추가 구매를 권장합니다.

### Q4. 여러 프로젝트에서 같은 API 키를 사용해도 되나요?

네, 하나의 API 키로 여러 프로젝트에서 사용 가능합니다. 단, 모든 사용량이 합산되어 청구됩니다.

### Q5. API 키가 노출되면 어떻게 하나요?

1. 즉시 해당 키를 삭제합니다 (Console → API Keys → Delete)
2. 새 키를 발급받습니다
3. `.env` 파일의 키를 교체합니다
4. 한도 설정이 되어 있다면 피해가 제한됩니다

---

## 7. 유용한 링크

| 페이지 | URL |
|--------|-----|
| Anthropic Console | https://console.anthropic.com |
| API Keys | https://console.anthropic.com/settings/keys |
| Billing | https://console.anthropic.com/settings/billing |
| Usage | https://console.anthropic.com/settings/usage |
| Limits | https://console.anthropic.com/settings/limits |
| 공식 문서 | https://docs.anthropic.com |
| 요금 안내 | https://www.anthropic.com/pricing |

---

## 8. 비용 최적화 팁

1. **짧고 명확한 프로젝트 설명 작성**
   - 불필요하게 긴 설명은 입력 토큰을 증가시킵니다

2. **적절한 max_tokens 설정**
   - 현재 4096으로 설정되어 있으며, 필요시 줄일 수 있습니다

3. **캐싱 활용**
   - 동일한 분석 요청은 DB에 저장된 결과를 재사용합니다

4. **RAG 활용**
   - RAG 검색으로 관련 가이드를 제공하면 더 정확한 분석이 가능하여 재분석 필요성이 줄어듭니다
