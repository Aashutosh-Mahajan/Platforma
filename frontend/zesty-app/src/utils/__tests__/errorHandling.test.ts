import { describe, it, expect } from 'vitest';
import type { AxiosError } from 'axios';
import {
  getErrorMessage,
  getFieldErrors,
  getAllErrorMessages,
  formatValidationErrors,
  isNetworkError,
  isTimeoutError,
  isValidationError,
  isAuthError,
  isForbiddenError,
  isNotFoundError,
  isServerError,
} from '../errorHandling';

describe('Error Handling Utilities', () => {
  describe('getErrorMessage', () => {
    it('should extract message from AxiosError with message', () => {
      const error = {
        isAxiosError: true,
        message: 'Network error',
      } as AxiosError;

      expect(getErrorMessage(error)).toBe('Network error');
    });

    it('should extract message from response data', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            message: 'Custom error message',
          },
        },
      } as AxiosError;

      expect(getErrorMessage(error)).toBe('Custom error message');
    });

    it('should extract detail from response data', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            detail: 'Detailed error message',
          },
        },
      } as AxiosError;

      expect(getErrorMessage(error)).toBe('Detailed error message');
    });

    it('should extract first non-field error', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            non_field_errors: ['Error 1', 'Error 2'],
          },
        },
      } as AxiosError;

      expect(getErrorMessage(error)).toBe('Error 1');
    });

    it('should extract first field error', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            errors: {
              email: ['Invalid email format'],
              password: ['Password too weak'],
            },
          },
        },
      } as AxiosError;

      expect(getErrorMessage(error)).toBe('Invalid email format');
    });

    it('should handle Error objects', () => {
      const error = new Error('Standard error');
      expect(getErrorMessage(error)).toBe('Standard error');
    });

    it('should handle string errors', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should return default message for unknown errors', () => {
      expect(getErrorMessage(null)).toBe('An unexpected error occurred');
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
      expect(getErrorMessage({})).toBe('An unexpected error occurred');
    });
  });

  describe('getFieldErrors', () => {
    it('should extract field errors from AxiosError', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            errors: {
              email: ['Invalid email format', 'Email already exists'],
              password: ['Password too weak'],
            },
          },
        },
      } as AxiosError;

      const fieldErrors = getFieldErrors(error);
      expect(fieldErrors.email).toBe('Invalid email format');
      expect(fieldErrors.password).toBe('Password too weak');
    });

    it('should return empty object for non-AxiosError', () => {
      const error = new Error('Standard error');
      expect(getFieldErrors(error)).toEqual({});
    });

    it('should return empty object when no errors field', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            message: 'Error message',
          },
        },
      } as AxiosError;

      expect(getFieldErrors(error)).toEqual({});
    });
  });

  describe('getAllErrorMessages', () => {
    it('should extract all error messages', () => {
      const error = {
        isAxiosError: true,
        response: {
          data: {
            message: 'Main error',
            detail: 'Detailed error',
            non_field_errors: ['Non-field error 1', 'Non-field error 2'],
            errors: {
              email: ['Email error'],
              password: ['Password error'],
            },
          },
        },
      } as AxiosError;

      const messages = getAllErrorMessages(error);
      expect(messages).toContain('Main error');
      expect(messages).toContain('Detailed error');
      expect(messages).toContain('Non-field error 1');
      expect(messages).toContain('Non-field error 2');
      expect(messages).toContain('Email error');
      expect(messages).toContain('Password error');
    });

    it('should return single message for simple errors', () => {
      const error = new Error('Simple error');
      const messages = getAllErrorMessages(error);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toBe('Simple error');
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors', () => {
      const errors = {
        email: ['Invalid email format'],
        first_name: ['First name is required'],
        phone_number: ['Invalid phone number'],
      };

      const formatted = formatValidationErrors(errors);
      expect(formatted).toContain('Email: Invalid email format');
      expect(formatted).toContain('First Name: First name is required');
      expect(formatted).toContain('Phone Number: Invalid phone number');
    });
  });

  describe('Error Type Checkers', () => {
    describe('isNetworkError', () => {
      it('should detect network errors', () => {
        const error = {
          isAxiosError: true,
          message: 'Network Error',
        } as AxiosError;

        expect(isNetworkError(error)).toBe(true);
      });

      it('should return false for non-network errors', () => {
        const error = {
          isAxiosError: true,
          message: 'Other error',
          response: { status: 400 },
        } as AxiosError;

        expect(isNetworkError(error)).toBe(false);
      });
    });

    describe('isTimeoutError', () => {
      it('should detect timeout errors by code', () => {
        const error = {
          isAxiosError: true,
          code: 'ECONNABORTED',
        } as AxiosError;

        expect(isTimeoutError(error)).toBe(true);
      });

      it('should detect timeout errors by status', () => {
        const error = {
          isAxiosError: true,
          response: { status: 408 },
        } as AxiosError;

        expect(isTimeoutError(error)).toBe(true);
      });
    });

    describe('isValidationError', () => {
      it('should detect 400 errors', () => {
        const error = {
          isAxiosError: true,
          response: { status: 400 },
        } as AxiosError;

        expect(isValidationError(error)).toBe(true);
      });

      it('should return false for other status codes', () => {
        const error = {
          isAxiosError: true,
          response: { status: 500 },
        } as AxiosError;

        expect(isValidationError(error)).toBe(false);
      });
    });

    describe('isAuthError', () => {
      it('should detect 401 errors', () => {
        const error = {
          isAxiosError: true,
          response: { status: 401 },
        } as AxiosError;

        expect(isAuthError(error)).toBe(true);
      });
    });

    describe('isForbiddenError', () => {
      it('should detect 403 errors', () => {
        const error = {
          isAxiosError: true,
          response: { status: 403 },
        } as AxiosError;

        expect(isForbiddenError(error)).toBe(true);
      });
    });

    describe('isNotFoundError', () => {
      it('should detect 404 errors', () => {
        const error = {
          isAxiosError: true,
          response: { status: 404 },
        } as AxiosError;

        expect(isNotFoundError(error)).toBe(true);
      });
    });

    describe('isServerError', () => {
      it('should detect 500+ errors', () => {
        expect(isServerError({
          isAxiosError: true,
          response: { status: 500 },
        } as AxiosError)).toBe(true);

        expect(isServerError({
          isAxiosError: true,
          response: { status: 502 },
        } as AxiosError)).toBe(true);

        expect(isServerError({
          isAxiosError: true,
          response: { status: 503 },
        } as AxiosError)).toBe(true);
      });

      it('should return false for non-server errors', () => {
        expect(isServerError({
          isAxiosError: true,
          response: { status: 400 },
        } as AxiosError)).toBe(false);
      });
    });
  });
});
