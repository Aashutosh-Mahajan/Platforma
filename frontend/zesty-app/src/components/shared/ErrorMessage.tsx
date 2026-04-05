import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, onDismiss }) => {
  return (
    <div 
      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4" 
      role="alert" 
      aria-live="assertive"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0" aria-hidden="true">
          <svg
            className="h-5 w-5 text-red-400"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-red-800">{message}</p>
        </div>
        <div className="ml-3 flex gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
              aria-label="Retry action"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 rounded px-2 py-1"
              aria-label="Dismiss error message"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
