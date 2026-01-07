import { Info, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import LanguageSelector from './LanguageSelector';

function TextDescriptionTab({ state, setState }) {
  const charCount = state.description.length;
  const minChars = 50;
  const isValid = charCount >= minChars;

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <LanguageSelector
        value={state.language}
        onChange={value => setState(prev => ({ ...prev, language: value }))}
        showUndecided
      />

      {/* Project Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          프로젝트 설명 <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={state.description}
          onChange={e => setState(prev => ({ ...prev, description: e.target.value }))}
          placeholder={`만들고 싶은 프로젝트를 자세히 설명해주세요.\n\n예시:\n쇼핑몰을 만들려고 합니다. 회원가입, 상품 관리, 주문, 결제, 배송 추적 기능이 필요해요. 회원은 소셜 로그인도 지원하고, 결제는 카드와 계좌이체를 지원합니다.`}
          rows={8}
          className={cn(
            !isValid && charCount > 0 && 'border-amber-300 focus-visible:ring-amber-500'
          )}
        />

        {/* Character Count */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Info className="h-4 w-4" />
            <span>최소 {minChars}자 이상 입력해주세요</span>
          </div>
          <div className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            isValid ? 'text-green-600' : charCount > 0 ? 'text-amber-500' : 'text-slate-400'
          )}>
            {isValid && <CheckCircle2 className="h-4 w-4" />}
            <span>{charCount}자</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextDescriptionTab;
