import { Upload, FileText } from 'lucide-react';

function TabSelector({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'code', label: '코드 업로드', icon: Upload },
    { id: 'text', label: '텍스트 설명', icon: FileText }
  ];

  return (
    <div className="flex justify-center mb-6">
      <div className="inline-flex rounded-lg bg-gray-100 p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default TabSelector;
