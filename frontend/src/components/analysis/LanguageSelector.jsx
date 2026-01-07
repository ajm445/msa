import { cn } from '@/lib/utils';

const languages = [
  { id: 'java-spring', label: 'Java/Spring', icon: '☕' },
  { id: 'node-express', label: 'Node.js/Express', icon: '🟢' },
  { id: 'react', label: 'React', icon: '⚛️' }
];

function LanguageSelector({ value, onChange, showUndecided = false }) {
  const options = showUndecided
    ? [...languages, { id: 'undecided', label: '미정', icon: '❓' }]
    : languages;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-3">
        언어/프레임워크 선택 {!showUndecided && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map(lang => (
          <label
            key={lang.id}
            className={cn(
              'flex items-center px-4 py-3 border rounded-xl cursor-pointer transition-all',
              value === lang.id
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
            )}
          >
            <input
              type="radio"
              name="language"
              value={lang.id}
              checked={value === lang.id}
              onChange={e => onChange(e.target.value)}
              className="sr-only"
            />
            <span className="mr-2 text-base">{lang.icon}</span>
            <span className="text-sm font-medium">{lang.label}</span>
            {value === lang.id && (
              <span className="ml-2 w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

export default LanguageSelector;
