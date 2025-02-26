import { DatepickerConfig } from '../components/datepicker/types/datepickerTypes';
import { DropdownConfig } from '../components/dropdown/types/dropdownTypes';
import { FileUploadConfig } from '../components/file/types/fileTypes';
import { PhoneFieldConfig } from '../components/phone/types/phoneTypes';
import { SelectConfig } from '../components/select/types/selectTypes';
import { URLFieldConfig } from '../components/url/types/urlTypes';

export interface FormConfig {
  path: string;
  action: string;
  method?: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE';
  fields?: Record<
    string,
    | DropdownConfig
    | DatepickerConfig
    | SelectConfig
    | PhoneFieldConfig
    | URLFieldConfig
    | FileUploadConfig
  >;
  redirect?: string;
  hiddenFields?: HiddenFieldConfig[];
  storage?: StorageConfig;
  successMessage?: string;
  successRedirect?: string;
  redirectParams?: RedirectParam[];
  errorMessage?: string;
  conditionalFields?: ConditionalFieldConfig[];
  conditionalSteps?: ConditionalStepConfig[];
}

export interface BaseFieldConfig {
  type: 'dropdown' | 'datepicker' | 'select' | 'phone' | 'url' | 'fileupload';
  required?: boolean;
  label?: string;
  placeholder?: string;
  defaultValue?: any;
  disabled?: boolean;
  hidden?: boolean;
  classList?: string[];
  attributes?: Record<string, string>;
  validators?: Array<{
    type: string;
    message: string;
    params?: any;
  }>;
}

export interface ConditionalStepConfig {
  stepId: string;
  action: 'show' | 'hide';
  operator?: 'AND' | 'OR';
  conditions: Condition[];
  clearOnHide?: boolean;
  validateOnShow?: boolean;
}

export interface Condition {
  fieldId: string;
  operator: ConditionalOperator;
  value?: any;
}

// export type FieldConfig = DropdownFieldConfig | '';

export interface BaseField {
  getValue(): any;
  setValue(value: any): void;
  destroy(): void;
  show(): void;
  hide(): void;
  getErrors(): string[];
}

export interface HiddenFieldConfig {
  name: string;
  cookieKey?: string;
  storageKey?: string;
  defaultValue?: string;
}

export interface RedirectParam {
  key: string;
  value?: string;
  fieldId?: string;
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
  isFunctional?: boolean;
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
