import type { AxiosError } from 'axios';

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
  detail?: string;
  non_field_errors?: string[];
}

/**
 * Extract error message from API response
 */
export const getErrorMessage = (error: unknown): string => {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Handle AxiosError
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    
    // Use enhanced error message from interceptor
    if (axiosError.message) {
      return axiosError.message;
    }

    // Extract from response data
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      
      if (data.message) {
        return data.message;
      }
      
      if (data.detail) {
        return data.detail;
      }
      
      if (data.non_field_errors && data.non_field_errors.length > 0) {
        return data.non_field_errors[0];
      }
      
      // If there are field errors, return the first one
      if (data.errors) {
        const firstError = Object.values(data.errors)[0];
        if (firstError && firstError.length > 0) {
          return firstError[0];
        }
      }
    }
    
    return 'An error occurred while processing your request';
  }

  // Handle Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

/**
 * Extract field-specific errors from API response
 */
export const getFieldErrors = (error: unknown): Record<string, string> => {
  if (!isAxiosError(error)) {
    return {};
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const data = axiosError.response?.data;

  if (!data?.errors) {
    return {};
  }

  // Convert array of errors to single string per field
  const fieldErrors: Record<string, string> = {};
  
  for (const [field, errors] of Object.entries(data.errors)) {
    if (errors && errors.length > 0) {
      fieldErrors[field] = errors[0];
    }
  }

  return fieldErrors;
};

/**
 * Get all error messages from API response
 */
export const getAllErrorMessages = (error: unknown): string[] => {
  if (!isAxiosError(error)) {
    return [getErrorMessage(error)];
  }

  const axiosError = error as AxiosError<ApiErrorResponse>;
  const data = axiosError.response?.data;
  const messages: string[] = [];

  if (!data) {
    return [getErrorMessage(error)];
  }

  // Add main message
  if (data.message) {
    messages.push(data.message);
  }

  // Add detail
  if (data.detail) {
    messages.push(data.detail);
  }

  // Add non-field errors
  if (data.non_field_errors) {
    messages.push(...data.non_field_errors);
  }

  // Add field errors
  if (data.errors) {
    for (const errors of Object.values(data.errors)) {
      if (errors && errors.length > 0) {
        messages.push(...errors);
      }
    }
  }

  return messages.length > 0 ? messages : [getErrorMessage(error)];
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: Record<string, string[]>): string => {
  const messages: string[] = [];
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    messages.push(`${fieldName}: ${fieldErrors.join(', ')}`);
  }
  
  return messages.join('\n');
};

/**
 * Check if error is an AxiosError
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  return !axiosError.response && axiosError.message.toLowerCase().includes('network');
};

/**
 * Check if error is a timeout error
 */
export const isTimeoutError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  return axiosError.code === 'ECONNABORTED' || axiosError.response?.status === 408;
};

/**
 * Check if error is a validation error (400)
 */
export const isValidationError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  return axiosError.response?.status === 400;
};

/**
 * Check if error is an authentication error (401)
 */
export const isAuthError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  return axiosError.response?.status === 401;
};

/**
 * Check if error is a forbidden error (403)
 */
export const isForbiddenError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  return axiosError.response?.status === 403;
};

/**
 * Check if error is a not found error (404)
 */
export const isNotFoundError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  return axiosError.response?.status === 404;
};

/**
 * Check if error is a server error (500+)
 */
export const isServerError = (error: unknown): boolean => {
  if (!isAxiosError(error)) {
    return false;
  }
  
  const axiosError = error as AxiosError;
  const status = axiosError.response?.status;
  return status !== undefined && status >= 500;
};
