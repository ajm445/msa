import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileArchive, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import LanguageSelector from './LanguageSelector';

function CodeUploadTab({ state, setState }) {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setState(prev => ({ ...prev, file: acceptedFiles[0] }));
    }
  }, [setState]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip']
    },
    maxSize: 50 * 1024 * 1024,
    multiple: false
  });

  const removeFile = () => {
    setState(prev => ({ ...prev, file: null }));
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <LanguageSelector
        value={state.language}
        onChange={value => setState(prev => ({ ...prev, language: value }))}
      />

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          프로젝트 파일 업로드 <span className="text-red-500">*</span>
        </label>

        {!state.file ? (
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
              isDragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
            )}
          >
            <input {...getInputProps()} />
            <div className={cn(
              'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full',
              isDragActive ? 'bg-blue-100' : 'bg-slate-100'
            )}>
              <Upload className={cn(
                'h-7 w-7',
                isDragActive ? 'text-blue-600' : 'text-slate-400'
              )} />
            </div>
            <p className="text-slate-700 font-medium mb-1">
              {isDragActive
                ? '파일을 여기에 놓으세요'
                : '파일을 드래그하거나 클릭하여 업로드'}
            </p>
            <p className="text-sm text-slate-400">
              .zip 파일, 최대 50MB
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
                <FileArchive className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">{state.file.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{formatFileSize(state.file.size)}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-green-600">업로드 완료</span>
                </div>
              </div>
            </div>
            <Button
              onClick={removeFile}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Additional Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">
          추가 설명 <span className="text-slate-400 font-normal">(선택)</span>
        </label>
        <Textarea
          value={state.description}
          onChange={e => setState(prev => ({ ...prev, description: e.target.value }))}
          placeholder="프로젝트에 대한 추가 설명을 입력하세요..."
          rows={3}
        />
      </div>
    </div>
  );
}

export default CodeUploadTab;
