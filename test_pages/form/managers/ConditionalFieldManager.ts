import { FormStateManager } from './FormStateManager';
import { FormValidator } from '../validation/FormValidator';
import { ConditionalOperator } from '../models/formTypes';

interface ConditionalRule {
  targetFieldId: string;
  conditions: Condition[];
  action: 'show' | 'hide';
  operator?: 'AND' | 'OR';
  onStateChange?: (isVisible: boolean) => void;
}

interface Condition {
  fieldId: string;
  operator: ConditionalOperator;
  value?: any;
}

export class ConditionalFieldManager {
  private rules: ConditionalRule[] = [];
  private stateManager: FormStateManager;
  private validator: FormValidator;
  private form: HTMLFormElement;
  private isEvaluating: boolean = false;

  constructor(
    form: HTMLFormElement,
    stateManager: FormStateManager,
    validator: FormValidator,
  ) {
    this.form = form;
    this.stateManager = stateManager;
    this.validator = validator;

    // Subscribe to state changes to evaluate conditions
    this.stateManager.subscribe(this.evaluateAllConditions.bind(this));
  }

  public addRule(rule: ConditionalRule): void {
    this.rules.push(rule);

    // Add initial state to state manager
    const targetField = document.getElementById(
      rule.targetFieldId,
    ) as HTMLElement;
    if (targetField) {
      this.stateManager.updateState({
        fields: {
          [rule.targetFieldId]: {
            ...this.stateManager.getFieldState(rule.targetFieldId),
            value:
              this.stateManager.getFieldState(rule.targetFieldId)?.value ?? '',
            isVisible: this.evaluateRule(rule),
            isDirty: false,
            isTouched: false,
            isValid: true,
            isDisabled: false,
            errors: [],
          },
        },
      });
    }

    // Set up listeners for condition fields
    rule.conditions.forEach(condition => {
      const field = document.getElementById(condition.fieldId);
      if (field) {
        field.addEventListener('change', () => this.evaluateRule(rule));
      }
    });
  }

  private evaluateAllConditions(): void {
    // Prevent recursive evaluation
    if (this.isEvaluating) return;

    try {
      this.isEvaluating = true;
      this.rules.forEach(rule => this.evaluateRule(rule));
    } finally {
      this.isEvaluating = false;
    }
  }

  private evaluateRule(rule: ConditionalRule): boolean {
    const results = rule.conditions.map(condition =>
      this.evaluateCondition(condition),
    );

    const finalResult =
      rule.operator === 'OR'
        ? results.some(result => result)
        : results.every(result => result);

    const targetField = document.getElementById(
      rule.targetFieldId,
    ) as HTMLElement;
    if (targetField) {
      const shouldShow = rule.action === 'show' ? finalResult : !finalResult;
      this.updateFieldVisibility(targetField, shouldShow);
    }

    return finalResult;
  }

  private evaluateCondition(condition: Condition): boolean {
    const field = document.getElementById(
      condition.fieldId,
    ) as HTMLInputElement;
    if (!field) return false;

    const fieldValue = field.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'notEquals':
        return fieldValue !== condition.value;
      case 'contains':
        return fieldValue.includes(condition.value);
      case 'notContains':
        return !fieldValue.includes(condition.value);
      case 'startsWith':
        return fieldValue.startsWith(condition.value);
      case 'endsWith':
        return fieldValue.endsWith(condition.value);
      case 'greaterThan':
        return parseFloat(fieldValue) > parseFloat(condition.value);
      case 'lessThan':
        return parseFloat(fieldValue) < parseFloat(condition.value);
      case 'greaterThanOrEqual':
        return parseFloat(fieldValue) >= parseFloat(condition.value);
      case 'lessThanOrEqual':
        return parseFloat(fieldValue) <= parseFloat(condition.value);
      case 'isEmpty':
        return !fieldValue;
      case 'isNotEmpty':
        return !!fieldValue;
      case 'matches':
        return new RegExp(condition.value).test(fieldValue);
      case 'in':
        return (
          Array.isArray(condition.value) && condition.value.includes(fieldValue)
        );
      case 'notIn':
        return (
          Array.isArray(condition.value) &&
          !condition.value.includes(fieldValue)
        );
      case 'custom':
        if (typeof condition.value === 'function') {
          return condition.value(fieldValue);
        }
        return false;
      default:
        return false;
    }
  }

  private resetFieldValidation(fieldId: string) {
    // Mark the field as valid and remove it from `invalidFields`
    this.validator['invalidFields'].delete(fieldId);
    this.stateManager.setFieldValidation(fieldId, true, []);
  }

  private updateFieldVisibility(field: HTMLElement, isVisible: boolean): void {
    const fieldId = field.id;
    const currentState = this.stateManager.getFieldState(fieldId);
    if (!currentState) return;

    const fieldContainer = (field.closest('.form-group') ||
      field) as HTMLElement;
    fieldContainer.style.display = isVisible ? '' : 'none';

    if (!this.isEvaluating) {
      // Re-attach event listeners when field becomes visible
      if (isVisible) {
        field.addEventListener('input', e => this.handleFieldInput(e));
        field.addEventListener('blur', e => this.handleFieldBlur(e));
      }

      this.stateManager.updateState({
        fields: {
          [fieldId]: {
            ...currentState,
            isVisible: isVisible,
          },
        },
      });
    }

    const rule = this.rules.find(r => r.targetFieldId === fieldId);
    rule?.onStateChange?.(isVisible);

    if (!isVisible) {
      this.resetFieldValidation(fieldId);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLSelectElement
      ) {
        field.value = '';
        this.stateManager.setFieldValue(fieldId, '');
      }
    }
  }

  private handleFieldInput(e: Event): void {
    const field = e.target as HTMLInputElement;
    if (!field.id) return;
    this.stateManager.setFieldValue(field.id, field.value);
  }

  private handleFieldBlur(e: Event): void {
    const field = e.target as HTMLInputElement;
    if (!field.id) return;
    this.stateManager.setFieldTouched(field.id);
    this.validator.executeFieldValidation(field);
  }
}
