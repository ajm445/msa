import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, Plus, Info, AlertTriangle, ChevronDown, ChevronUp, Database, Link2, Clock, FileText, Loader2, AlertCircle, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import ArchitectureDiagram from '../components/analysis/ArchitectureDiagram';
import { analysisService } from '@/services/analysisService';

// 데모용 목업 데이터 (API 연동 전 또는 데모 ID인 경우 사용)
const mockAnalysisResult = {
  analysisId: 'anls_demo123',
  status: 'completed',
  inputType: 'text',
  createdAt: new Date().toISOString(),
  parsed: {
    domain: '이커머스 (쇼핑몰)',
    features: ['회원가입', '상품 관리', '주문', '결제', '배송 추적'],
    authMethod: ['소셜 로그인'],
    paymentMethod: ['카드', '계좌이체']
  },
  services: [
    {
      name: 'User Service',
      responsibility: '회원가입, 소셜 로그인, 프로필 관리',
      type: 'Supporting',
      endpoints: ['/users', '/auth', '/auth/social'],
      database: 'user_db',
      dependencies: []
    },
    {
      name: 'Product Service',
      responsibility: '상품 정보, 검색, 카테고리 관리',
      type: 'Core',
      endpoints: ['/products', '/categories', '/search'],
      database: 'product_db',
      dependencies: []
    },
    {
      name: 'Order Service',
      responsibility: '주문 생성, 주문 상태 관리',
      type: 'Core',
      endpoints: ['/orders', '/cart'],
      database: 'order_db',
      dependencies: ['User Service', 'Product Service']
    },
    {
      name: 'Payment Service',
      responsibility: '카드/계좌이체 결제, 환불 처리',
      type: 'Generic',
      endpoints: ['/payments', '/refunds'],
      database: 'payment_db',
      dependencies: ['Order Service']
    },
    {
      name: 'Shipping Service',
      responsibility: '배송 추적, 배송사 연동',
      type: 'Generic',
      endpoints: ['/shipping', '/tracking'],
      database: 'shipping_db',
      dependencies: ['Order Service']
    }
  ],
  recommendations: [
    {
      type: 'info',
      message: '결제 서비스는 외부 PG사 연동이 필요합니다.',
      suggestion: 'Stripe, 토스페이먼츠 등을 고려해보세요.'
    },
    {
      type: 'warning',
      message: 'Order와 Payment 간 데이터 정합성에 주의가 필요합니다.',
      suggestion: 'Saga 패턴 또는 이벤트 소싱을 고려하세요.'
    }
  ],
  communications: [
    { from: 'Order Service', to: 'User Service', method: 'REST', reason: '사용자 정보 조회' },
    { from: 'Order Service', to: 'Product Service', method: 'REST', reason: '재고 확인' },
    { from: 'Order Service', to: 'Payment Service', method: 'Event', reason: '비동기 결제 처리' },
    { from: 'Order Service', to: 'Shipping Service', method: 'Event', reason: '비동기 배송 처리' }
  ]
};

function AnalysisResultPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expandedService, setExpandedService] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // AI 프롬프트 생성
  const generateAIPrompt = useCallback((data) => {
    const serviceList = data.services.map(s => `- ${s.name}: ${s.responsibility}`).join('\n');
    const commList = data.communications.map(c => `- ${c.from} → ${c.to} (${c.method}): ${c.reason}`).join('\n');

    return `# MSA 프로젝트 생성 요청

이 JSON 파일은 MSA(Microservices Architecture) 분석 결과입니다.
아래 분석 데이터를 기반으로 실제 프로젝트 구조와 기본 코드를 생성해주세요.

## 프로젝트 개요
- 도메인: ${data.parsed.domain}
- 주요 기능: ${data.parsed.features.join(', ')}
${data.parsed.authMethod ? `- 인증 방식: ${data.parsed.authMethod.join(', ')}` : ''}
${data.parsed.paymentMethod ? `- 결제 수단: ${data.parsed.paymentMethod.join(', ')}` : ''}

## 서비스 목록
${serviceList}

## 서비스 간 통신
${commList}

## 요청사항
1. 각 마이크로서비스별 프로젝트 폴더 구조를 생성해주세요
2. 각 서비스의 기본 엔드포인트 코드를 작성해주세요
3. 서비스 간 통신을 위한 인터페이스를 정의해주세요
4. Docker Compose 파일을 생성해주세요
5. API Gateway 설정을 포함해주세요

## 기술 스택 제안
- 언어/프레임워크: Node.js (Express) 또는 Java (Spring Boot)
- 데이터베이스: PostgreSQL (각 서비스별 분리)
- 메시지 브로커: RabbitMQ 또는 Kafka (이벤트 기반 통신용)
- API Gateway: Kong 또는 Nginx
- 컨테이너: Docker + Docker Compose

아래 analysisData를 참고하여 프로젝트를 생성해주세요.`;
  }, []);

  // 분석 결과를 JSON 파일로 다운로드
  const handleSaveAsJson = useCallback(() => {
    if (!result) return;

    const analysisData = {
      analysisId: result.analysisId,
      exportedAt: new Date().toISOString(),
      inputType: result.inputType,
      createdAt: result.createdAt,
      parsed: result.parsed,
      services: result.services,
      recommendations: result.recommendations,
      communications: result.communications,
    };

    const exportData = {
      _description: "이 파일을 AI(Claude, ChatGPT 등)에게 전달하면 MSA 프로젝트 기본 구조를 생성받을 수 있습니다.",
      _usage: "AI에게 이 JSON 파일 전체를 붙여넣고 프로젝트 생성을 요청하세요.",
      aiPrompt: generateAIPrompt(analysisData),
      analysisData,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `msa-analysis-${result.analysisId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // 저장 완료 피드백
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  }, [result, generateAIPrompt]);

  useEffect(() => {
    const fetchResult = async () => {
      // 데모 ID인 경우 목업 데이터 사용
      if (id.startsWith('demo_')) {
        setResult(mockAnalysisResult);
        setIsLoading(false);
        return;
      }

      try {
        const response = await analysisService.getResult(id);
        setResult(response.data);
      } catch (err) {
        setError(err.message || '분석 결과를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResult();
  }, [id]);

  const formatDate = dateString => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="relative mb-8">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold text-slate-900">결과 불러오는 중...</h2>
        <p className="text-slate-500">분석 결과를 가져오고 있습니다.</p>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900">오류가 발생했습니다</h2>
            <p className="mb-6 text-slate-500">{error}</p>
            <Button onClick={() => navigate('/')} variant="primary">
              메인으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 결과가 없는 경우
  if (!result) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <Card className="text-center">
          <CardContent className="pt-8 pb-8">
            <h2 className="mb-2 text-xl font-bold text-slate-900">분석 결과를 찾을 수 없습니다</h2>
            <p className="mb-6 text-slate-500">요청하신 분석 결과가 존재하지 않습니다.</p>
            <Button onClick={() => navigate('/')} variant="primary">
              새 분석 시작
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로가기
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleSaveAsJson}
          >
            {isSaved ? (
              <>
                <Check className="h-4 w-4 text-green-600" />
                저장됨
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                저장
              </>
            )}
          </Button>
          <Button onClick={() => navigate('/')} variant="primary" className="gap-2">
            <Plus className="h-4 w-4" />
            새 분석
          </Button>
        </div>
      </div>

      {/* Analysis Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <FileText className="h-4 w-4 text-white" />
            </div>
            분석 결과
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <span className="text-sm text-slate-500">분석 ID</span>
              <p className="font-medium text-slate-900 font-mono text-sm">{result.analysisId}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">분석 일시</span>
              <p className="font-medium text-slate-900">{formatDate(result.createdAt)}</p>
            </div>
            <div>
              <span className="text-sm text-slate-500">입력 방식</span>
              <p className="font-medium text-slate-900">
                {result.inputType === 'code' ? '코드 업로드' : '텍스트 설명'}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-500">상태</span>
              <Badge variant="supporting" className="mt-1">완료</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Clock className="h-4 w-4 text-white" />
            </div>
            프로젝트 요약
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <span className="text-sm text-slate-500">도메인</span>
            <p className="font-medium text-slate-900">{result.parsed.domain}</p>
          </div>
          <div>
            <span className="text-sm text-slate-500">주요 기능</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {result.parsed.features.map((feature, idx) => (
                <Badge key={idx} variant="secondary">{feature}</Badge>
              ))}
            </div>
          </div>
          {result.parsed.authMethod && (
            <div>
              <span className="text-sm text-slate-500">인증 방식</span>
              <p className="font-medium text-slate-900">{result.parsed.authMethod.join(', ')}</p>
            </div>
          )}
          {result.parsed.paymentMethod && (
            <div>
              <span className="text-sm text-slate-500">결제 수단</span>
              <p className="font-medium text-slate-900">{result.parsed.paymentMethod.join(', ')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
              <Database className="h-4 w-4 text-white" />
            </div>
            서비스 분리 제안
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">서비스명</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">책임</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">유형</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">DB</th>
                </tr>
              </thead>
              <tbody>
                {result.services.map((service, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{service.name}</td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{service.responsibility}</td>
                    <td className="py-3 px-4">
                      <Badge variant={service.type.toLowerCase()}>{service.type}</Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-sm font-mono">{service.database}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Architecture Diagram */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600">
              <Link2 className="h-4 w-4 text-white" />
            </div>
            MSA 구조 다이어그램
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArchitectureDiagram services={result.services} communications={result.communications} />
          <div className="flex items-center justify-center gap-6 mt-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-10 h-0.5 bg-blue-500" />
              <span className="text-slate-600">REST</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-0.5 border-t-2 border-dashed border-violet-500" />
              <span className="text-slate-600">Event</span>
            </div>
            <div className="flex items-center gap-4 ml-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-slate-600">Core</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Supporting</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-slate-400" />
                <span className="text-slate-600">Generic</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Details */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600">
              <Database className="h-4 w-4 text-white" />
            </div>
            서비스 상세
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {result.services.map((service, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedService(expandedService === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-slate-900">{service.name}</span>
                  <Badge variant={service.type.toLowerCase()}>{service.type}</Badge>
                </div>
                {expandedService === idx ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </button>

              {expandedService === idx && (
                <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div>
                      <span className="text-sm text-slate-500">책임</span>
                      <p className="text-slate-900">{service.responsibility}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">데이터베이스</span>
                      <p className="font-mono text-slate-900">{service.database}</p>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">엔드포인트</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {service.endpoints.map((ep, i) => (
                          <code key={i} className="px-2 py-0.5 bg-slate-200 rounded text-xs font-mono">{ep}</code>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-slate-500">의존성</span>
                      <p className="text-slate-900">
                        {service.dependencies.length > 0 ? service.dependencies.join(', ') : '없음'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-600">
              <Info className="h-4 w-4 text-white" />
            </div>
            권고사항
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.recommendations.map((rec, idx) => (
            <Alert key={idx} variant={rec.type === 'warning' ? 'warning' : 'info'}>
              {rec.type === 'warning' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              <AlertTitle>{rec.message}</AlertTitle>
              {rec.suggestion && (
                <AlertDescription>{rec.suggestion}</AlertDescription>
              )}
            </Alert>
          ))}
        </CardContent>
      </Card>

      {/* Communication Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Link2 className="h-4 w-4 text-white" />
            </div>
            통신 방식 제안
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">From</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">To</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">방식</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">이유</th>
                </tr>
              </thead>
              <tbody>
                {result.communications.map((comm, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-900">{comm.from}</td>
                    <td className="py-3 px-4 text-slate-900">{comm.to}</td>
                    <td className="py-3 px-4">
                      <Badge variant={comm.method === 'REST' ? 'core' : 'secondary'} className={cn(
                        comm.method === 'Event' && 'bg-violet-100 text-violet-800'
                      )}>
                        {comm.method}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-sm">{comm.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI 활용 안내 */}
      <Card className="border-2 border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI로 프로젝트 생성하기
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            이 분석 결과를 AI에게 전달하면 MSA 프로젝트의 기본 구조와 코드를 자동으로 생성받을 수 있습니다.
          </p>
          <div className="bg-white rounded-lg p-4 border border-indigo-100">
            <h4 className="font-medium text-slate-900 mb-2">사용 방법</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>위의 <span className="font-medium text-indigo-600">저장</span> 버튼을 클릭하여 JSON 파일을 다운로드합니다</li>
              <li>Claude, ChatGPT 등 AI 어시스턴트에게 파일 내용을 전달합니다</li>
              <li>AI가 분석 결과를 기반으로 프로젝트 구조, Docker 설정, 기본 코드를 생성합니다</li>
            </ol>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-500">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>JSON 파일에는 AI가 이해할 수 있는 프롬프트가 포함되어 있어, 별도의 설명 없이 바로 프로젝트 생성을 요청할 수 있습니다.</p>
          </div>
          <Button onClick={handleSaveAsJson} variant="primary" className="w-full gap-2">
            <Download className="h-4 w-4" />
            분석 결과 저장 (AI 프롬프트 포함)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalysisResultPage;
