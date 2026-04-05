import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validatePhone,
  validateRequired,
  validateNumeric,
  validateDate,
  validateMinLength,
  validateMaxLength,
  validateRange,
  validateFields,
  validationRules,
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.user@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('invalid@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      const result = validatePassword('SecurePass123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('securepass123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('SECUREPASS123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('SecurePass');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Pass1');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone formats', () => {
      expect(validatePhone('+919876543210')).toBe(true);
      expect(validatePhone('9876543210')).toBe(true);
      expect(validatePhone('987-654-3210')).toBe(true);
      expect(validatePhone('(987) 654-3210')).toBe(true);
    });

    it('should reject invalid phone formats', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abcdefghij')).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should validate non-empty values', () => {
      expect(validateRequired('value')).toBe(true);
      expect(validateRequired(123)).toBe(true);
      expect(validateRequired(0)).toBe(true);
    });

    it('should reject empty values', () => {
      expect(validateRequired('')).toBe(false);
      expect(validateRequired('   ')).toBe(false);
      expect(validateRequired(null)).toBe(false);
      expect(validateRequired(undefined)).toBe(false);
    });
  });

  describe('validateNumeric', () => {
    it('should validate numeric values', () => {
      expect(validateNumeric(123)).toBe(true);
      expect(validateNumeric('123')).toBe(true);
      expect(validateNumeric('123.45')).toBe(true);
      expect(validateNumeric(0)).toBe(true);
    });

    it('should reject non-numeric values', () => {
      expect(validateNumeric('abc')).toBe(false);
      expect(validateNumeric(NaN)).toBe(false);
      expect(validateNumeric(Infinity)).toBe(false);
    });
  });

  describe('validateDate', () => {
    it('should validate valid dates', () => {
      expect(validateDate(new Date())).toBe(true);
      expect(validateDate('2024-01-01')).toBe(true);
      expect(validateDate('2024-01-01T12:00:00Z')).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('invalid')).toBe(false);
      expect(validateDate('2024-13-01')).toBe(false);
    });
  });

  describe('validateMinLength', () => {
    it('should validate strings meeting minimum length', () => {
      expect(validateMinLength('hello', 5)).toBe(true);
      expect(validateMinLength('hello world', 5)).toBe(true);
    });

    it('should reject strings below minimum length', () => {
      expect(validateMinLength('hi', 5)).toBe(false);
    });
  });

  describe('validateMaxLength', () => {
    it('should validate strings within maximum length', () => {
      expect(validateMaxLength('hello', 10)).toBe(true);
      expect(validateMaxLength('hello', 5)).toBe(true);
    });

    it('should reject strings exceeding maximum length', () => {
      expect(validateMaxLength('hello world', 5)).toBe(false);
    });
  });

  describe('validateRange', () => {
    it('should validate numbers within range', () => {
      expect(validateRange(5, 1, 10)).toBe(true);
      expect(validateRange(1, 1, 10)).toBe(true);
      expect(validateRange(10, 1, 10)).toBe(true);
    });

    it('should reject numbers outside range', () => {
      expect(validateRange(0, 1, 10)).toBe(false);
      expect(validateRange(11, 1, 10)).toBe(false);
    });
  });

  describe('validateFields', () => {
    it('should validate multiple fields successfully', () => {
      const result = validateFields(
        {
          email: 'user@example.com',
          password: 'SecurePass123',
        },
        {
          email: validationRules.email,
          password: validationRules.password,
        }
      );

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('should return errors for invalid fields', () => {
      const result = validateFields(
        {
          email: 'invalid-email',
          password: 'weak',
        },
        {
          email: validationRules.email,
          password: validationRules.password,
        }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
    });
  });

  describe('validationRules', () => {
    it('should validate required fields', () => {
      const rule = validationRules.required('Name');
      expect(rule('John')).toBeNull();
      expect(rule('')).toBe('Name is required');
    });

    it('should validate email', () => {
      const rule = validationRules.email;
      expect(rule('user@example.com')).toBeNull();
      expect(rule('invalid')).toBe('Please enter a valid email address');
    });

    it('should validate password', () => {
      const rule = validationRules.password;
      expect(rule('SecurePass123')).toBeNull();
      expect(rule('weak')).toBeDefined();
    });

    it('should validate phone', () => {
      const rule = validationRules.phone;
      expect(rule('+919876543210')).toBeNull();
      expect(rule('123')).toBe('Please enter a valid phone number');
    });

    it('should validate numeric fields', () => {
      const rule = validationRules.numeric('Age');
      expect(rule(25)).toBeNull();
      expect(rule('abc')).toBe('Age must be a valid number');
    });

    it('should validate date fields', () => {
      const rule = validationRules.date('Birth Date');
      expect(rule('2024-01-01')).toBeNull();
      expect(rule('invalid')).toBe('Birth Date must be a valid date');
    });

    it('should validate minimum length', () => {
      const rule = validationRules.minLength('Username', 5);
      expect(rule('johndoe')).toBeNull();
      expect(rule('joe')).toBe('Username must be at least 5 characters');
    });

    it('should validate maximum length', () => {
      const rule = validationRules.maxLength('Bio', 100);
      expect(rule('Short bio')).toBeNull();
      expect(rule('a'.repeat(101))).toBe('Bio must be at most 100 characters');
    });
  });
});
