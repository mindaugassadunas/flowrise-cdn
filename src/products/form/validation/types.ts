import { Rules } from 'just-validate';

export interface ValidationRule {
  rule: Rules;
  errorMessage: string;
  value?: any;
  validator?: () => boolean | Promise<boolean>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidatorOptions {
  validateBeforeSubmitting?: boolean;
  focusInvalidField?: boolean;
  errorFieldCssClass?: string[];
  errorLabelStyle?: Record<string, string>;
  errorLabelCssClass?: string[];
  successLabelCssClass?: string[];
}
