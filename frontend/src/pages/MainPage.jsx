import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Loader2, Upload, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CodeUploadTab from '@/components/analysis/CodeUploadTab';
import TextDescriptionTab from '@/components/analysis/TextDescriptionTab';

function MainPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('code');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);

  const [codeState, setCodeState] = useState({
    file: null,
    language: '',
    description: ''
  });

  const [textState, setTextState] = useState({
    description: '',
    language: ''
  });

  const handleAnalyze = async () => {
    if (activeTab === 'code') {
      if (!codeState.file) {
        alert('파일을 업로드해주세요.');
        return;
      }
      if (!codeState.language) {
        alert('언어/프레임워크를 선택해주세요.');
        return;
      }
    } else {
      if (!textState.description || textState.description.length < 50) {
        alert('프로젝트 설명을 50자 이상 입력해주세요.');
        return;
      }
    }

    setIsAnalyzing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    setTimeout(() => {
      clearInterval(interval);
      setIsAnalyzing(false);
      navigate('/analysis/demo_' + Date.now());
    }, 3000);
  };

  if (isAnalyzing) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-slate-900">분석 중입니다...</h2>
        <p className="mb-8 text-slate-500">프로젝트를 분석하고 있습니다. 잠시만 기다려주세요.</p>

        <div className="w-full max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-3 text-center text-sm font-medium text-slate-600">
            {Math.round(Math.min(progress, 100))}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25">
            <Boxes className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl lg:text-5xl">
          MSA 아키텍처 분석 서비스
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-slate-500">
          코드를 업로드하거나 프로젝트를 설명하면,{' '}
          <span className="font-medium text-slate-700">AI가 최적의 MSA 설계를 제안</span>합니다
        </p>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden border-slate-200 shadow-lg">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="code" className="gap-2">
                <Upload className="h-4 w-4" />
                코드 업로드
              </TabsTrigger>
              <TabsTrigger value="text" className="gap-2">
                <FileText className="h-4 w-4" />
                텍스트 설명
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="p-6 md:p-8">
            <TabsContent value="code" className="mt-0">
              <CodeUploadTab state={codeState} setState={setCodeState} />
            </TabsContent>

            <TabsContent value="text" className="mt-0">
              <TextDescriptionTab state={textState} setState={setTextState} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Analyze Button */}
      <div className="mt-8 flex justify-center">
        <Button
          onClick={handleAnalyze}
          size="lg"
          variant="primary"
          className="gap-2 px-8 shadow-lg shadow-blue-500/25"
        >
          <Sparkles className="h-5 w-5" />
          분석 시작
        </Button>
      </div>

      {/* Features */}
      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {[
          {
            title: '코드 분석',
            description: 'Java/Spring, Node.js, React 프로젝트 분석 지원'
          },
          {
            title: 'AI 기반 제안',
            description: 'Claude AI가 최적의 서비스 분리 방안 제안'
          },
          {
            title: '시각화 결과',
            description: '다이어그램과 표로 결과를 직관적으로 확인'
          }
        ].map((feature, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-100 bg-white p-6 text-center shadow-sm"
          >
            <h3 className="mb-2 font-semibold text-slate-900">{feature.title}</h3>
            <p className="text-sm text-slate-500">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MainPage;
