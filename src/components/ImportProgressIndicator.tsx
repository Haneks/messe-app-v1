import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ImportProgress } from '../hooks/useSongImport';

interface ImportProgressIndicatorProps {
  progress: ImportProgress;
  className?: string;
}

export default function ImportProgressIndicator({ progress, className = '' }: ImportProgressIndicatorProps) {
  const getIcon = () => {
    switch (progress.stage) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'idle':
        return null;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getBackgroundColor = () => {
    switch (progress.stage) {
      case 'complete':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'idle':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTextColor = () => {
    switch (progress.stage) {
      case 'complete':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'idle':
        return 'text-gray-600';
      default:
        return 'text-blue-800';
    }
  };

  if (progress.stage === 'idle') {
    return null;
  }

  return (
    <div className={`p-4 rounded-lg border ${getBackgroundColor()} ${className}`}>
      <div className="flex items-center gap-3">
        {getIcon()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${getTextColor()}`}>
            {progress.message}
          </p>
          {progress.stage !== 'complete' && progress.stage !== 'error' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {progress.progress}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}