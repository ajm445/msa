import { Boxes } from 'lucide-react';

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600">
              <Boxes className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-slate-600">
              MSA Analyzer
            </span>
          </div>

          <p className="text-sm text-slate-500">
            © 2026 MSA Analyzer. All rights reserved.
          </p>

          <p className="text-sm text-slate-400">
            MSA 아키텍처 분리 AI 분석 서비스
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
