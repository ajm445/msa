import { Link } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';

function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <Boxes className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            MSA Analyzer
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Button asChild variant="primary">
            <Link to="/">분석하기</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export default Header;
