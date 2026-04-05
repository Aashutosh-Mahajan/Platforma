import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center" role="status" aria-live="polite">
      <div 
        className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
        aria-hidden="true"
      ></div>
      {message ? (
        <p className="mt-4 text-sm sm:text-base text-gray-600">{message}</p>
      ) : (
        <span className="sr-only">Loading...</span>
      )}
    </div>
  );
};
