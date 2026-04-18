import { ValidationError } from './errorHandler';

export interface FieldRule {
  field: string;
  label?: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: unknown) => string | null;
}

export function validate(data: Record<string, unknown>, rules: FieldRule[]): void {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];
    const label = rule.label || rule.field;

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${label} es requerido`);
      continue;
    }

    // Skip further checks if value is not present and not required
    if (value === undefined || value === null) continue;

    // Type check
    if (rule.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${label} debe ser un arreglo`);
        continue;
      }
    } else if (rule.type && typeof value !== rule.type) {
      errors.push(`${label} debe ser de tipo ${rule.type}`);
      continue;
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${label} debe tener al menos ${rule.minLength} caracteres`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${label} debe tener máximo ${rule.maxLength} caracteres`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(rule.patternMessage || `${label} tiene un formato inválido`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${label} debe ser al menos ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${label} debe ser máximo ${rule.max}`);
      }
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) errors.push(customError);
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join('. '));
  }
}

export function validateUUID(value: string, label: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`${label} no es un UUID válido`);
  }
}

export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime())) {
    throw new ValidationError('Fecha de inicio no es válida');
  }
  if (isNaN(end.getTime())) {
    throw new ValidationError('Fecha de fin no es válida');
  }
  if (start > end) {
    throw new ValidationError('La fecha de inicio debe ser anterior a la fecha de fin');
  }
}

export function validateHexColor(value: string, label: string): void {
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
    throw new ValidationError(`${label} debe ser un color hexadecimal válido (ej: #FF0000)`);
  }
}
