export interface FormConfig {
  action: string;
  hiddenFields?: HiddenFieldConfig[];
  storage?: StorageConfig;
  successMessage?: string;
  successRedirect?: string;
  errorMessage?: string;
  conditionalFields?: ConditionalFieldConfig[];
}

export interface HiddenFieldConfig {
  name: string;
  cookieKey?: string;
  storageKey?: string;
  defaultValue?: string;
}

export interface StorageConfig {
  key: string; // localStorage key for this form
  storeMode?: 'live' | 'submit'; // When to store data (default: 'submit')
  fields?: string[]; // Specific fields to store (if empty, store all)
  prefill?: boolean; // Whether to prefill form with stored data
}

export interface FormState {
  fields: Record<string, FieldState>;
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
  submitCount: number;
}

export interface FieldState {
  value: any;
  isDirty: boolean;
  isTouched: boolean;
  isValid: boolean;
  errors: string[];
  isDisabled: boolean;
  isVisible: boolean;
}

export type StateUpdateCallback = (state: FormState) => void;

// New types for conditional fields
export interface ConditionalFieldConfig {
  targetFieldId: string;
  action: 'show' | 'hide';
  operator?: 'AND' | 'OR';
  conditions: ConditionConfig[];
  clearOnHide?: boolean; // Whether to clear field value when hidden
  validateOnShow?: boolean; // Whether to validate field when shown
  defaultState?: 'visible' | 'hidden';
}

export interface ConditionConfig {
  fieldId: string;
  operator: ConditionalOperator;
  value?: any;
  customLogic?: string; // For complex conditions using JavaScript expressions
}

export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'greaterThan'
  | 'lessThan'
  | 'greaterThanOrEqual'
  | 'lessThanOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'matches' // For regex patterns
  | 'in' // For array of values
  | 'notIn'
  | 'custom'; // For custom logic functions
