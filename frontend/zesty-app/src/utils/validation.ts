export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validatePhone = (phone: string): boolean => {
  // Supports formats: +919876543210, 9876543210, (987) 654-3210, etc.
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  return phoneRegex.test(phone);
};

export const validatePostalCode = (postalCode: string): boolean => {
  const postalCodeRegex = /^[0-9]{5,6}$/;
  return postalCodeRegex.test(postalCode);
};

export const validateRequired = (value: string | number | undefined | null): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== undefined && value !== null;
};

export const validateNumeric = (value: string | number): boolean => {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }
  
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }
  
  return false;
};

export const validateDate = (date: string | Date): boolean => {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }
  
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime());
  }
  
  return false;
};

export const validateMinLength = (value: string, minLength: number): boolean => {
  return value.length >= minLength;
};

export const validateMaxLength = (value: string, maxLength: number): boolean => {
  return value.length <= maxLength;
};

export const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const getFieldError = (errors: Record<string, string[]>, field: string): string => {
  return errors[field]?.[0] || '';
};

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate multiple fields at once
 */
export const validateFields = (
  fields: Record<string, any>,
  rules: Record<string, (value: any) => string | null>
): ValidationResult => {
  const errors: Record<string, string> = {};
  
  for (const [field, value] of Object.entries(fields)) {
    const validator = rules[field];
    if (validator) {
      const error = validator(value);
      if (error) {
        errors[field] = error;
      }
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Common validation rules
 */
export const validationRules = {
  required: (fieldName: string) => (value: any) => {
    if (!validateRequired(value)) {
      return `${fieldName} is required`;
    }
    return null;
  },
  
  email: (value: string) => {
    if (value && !validateEmail(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },
  
  password: (value: string) => {
    const result = validatePassword(value);
    if (!result.valid) {
      return result.errors[0];
    }
    return null;
  },
  
  phone: (value: string) => {
    if (value && !validatePhone(value)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },
  
  numeric: (fieldName: string) => (value: any) => {
    if (value && !validateNumeric(value)) {
      return `${fieldName} must be a valid number`;
    }
    return null;
  },
  
  date: (fieldName: string) => (value: any) => {
    if (value && !validateDate(value)) {
      return `${fieldName} must be a valid date`;
    }
    return null;
  },
  
  minLength: (fieldName: string, min: number) => (value: string) => {
    if (value && !validateMinLength(value, min)) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },
  
  maxLength: (fieldName: string, max: number) => (value: string) => {
    if (value && !validateMaxLength(value, max)) {
      return `${fieldName} must be at most ${max} characters`;
    }
    return null;
  },
};
