import { LoadingSpinner } from './LoadingSpinner';

/**
 * LoadingFallback component for React.lazy Suspense fallback
 * Displays a centered loading spinner while lazy-loaded components are being fetched
 */
export const LoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner size="large" message="Loading..." />
    </div>
  );
};
