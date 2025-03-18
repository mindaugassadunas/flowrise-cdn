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
  private swiper: any = null;

  constructor(
    form: HTMLFormElement,
    stateManager: FormStateManager,
    validator: FormValidator,
    swiperInstance?: any,
  ) {
    this.form = form;
    this.stateManager = stateManager;
    this.validator = validator;
    this.swiper = swiperInstance;

    // Subscribe to state changes to evaluate conditions
    this.stateManager.subscribe(this.evaluateAllConditions.bind(this));
  }

  public addRule(rule: ConditionalRule): void {
    this.rules.push(rule);

    // Set up listeners for condition fields
    rule.conditions.forEach(condition => {
      const field = document.getElementById(condition.fieldId);
      if (field) {
        field.addEventListener('change', () => this.evaluateRule(rule));
      }
    });

    // Don't evaluate the rule immediately!
  }

  // Method to set Swiper instance after initialization if needed
  public setSwiper(swiperInstance: any): void {
    this.swiper = swiperInstance;
  }

  private isInitializing = true;
  public initializeRules(): void {
    this.isInitializing = true;

    // First ensure all fields have initial states
    this.rules.forEach(rule => {
      const targetField = document.getElementById(
        rule.targetFieldId,
      ) as HTMLElement;
      if (targetField) {
        this.stateManager.updateState({
          fields: {
            [rule.targetFieldId]: {
              ...this.stateManager.getFieldState(rule.targetFieldId),
              value:
                this.stateManager.getFieldState(rule.targetFieldId)?.value ??
                '',
              isVisible: true, // Start as visible
              isDirty: false,
              isTouched: false,
              isValid: true,
              isDisabled: false,
              errors: [],
            },
          },
        });
      }
    });

    // Evaluate all rules during initialization
    this.rules.forEach(rule => this.evaluateRule(rule));

    // Mark initialization as complete
    this.isInitializing = false;
  }

  private _debounceTimer: any = null;
  private _lastEvaluationTime = 0;

  private evaluateAllConditions(): void {
    // Skip if no rules are defined
    if (this.isEvaluating || this.rules.length === 0) return;

    try {
      this.isEvaluating = true;

      // Only evaluate rules that are directly related to the changed field
      this.rules.forEach(rule => {
        // Check if any of the rule's conditions involve the recently changed field
        const isRelevant = rule.conditions.some(
          condition =>
            this.stateManager.getFieldState(condition.fieldId)?.isDirty,
        );

        if (isRelevant) {
          this.evaluateRule(rule);
        }
      });
    } finally {
      this.isEvaluating = false;
    }
  }

  private evaluateRule(rule: ConditionalRule): boolean {
    console.log('EVALUATE RULE', rule);
    const results = rule.conditions.map(condition =>
      this.evaluateCondition(condition),
    );
    console.log('EVALUATE RULE RESULTS', results);

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
    console.log('FINAL RESULT', finalResult);
    return finalResult;
  }

  private evaluateCondition(condition: Condition): boolean {
    const field = document.getElementById(
      condition.fieldId,
    ) as HTMLInputElement;
    if (!field) return false;

    const fieldValue = field.value;
    console.log('EVALUATE CONDITION', condition);
    console.log('FIELD VALUE', field.value);

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
    console.log('RESET FIELD VALIDATION');
    this.validator['invalidFields'].delete(fieldId);
    this.stateManager.setFieldValidation(fieldId, true, []);
  }

  private updateFieldVisibility(field: HTMLElement, isVisible: boolean): void {
    const fieldId = field.id;
    let currentState = this.stateManager.getFieldState(fieldId);
    console.log('UPDATE FIELD VISIBILITY', fieldId, currentState);
    // UPDATE FIELD VISIBILITY state-field undefined
    if (!currentState) {
      currentState = {
        value: field instanceof HTMLInputElement ? field.value : '',
        isDirty: false,
        isTouched: false,
        isValid: true,
        errors: [],
        isDisabled: false,
        isVisible: true,
        isFunctional: false,
      };
    }

    const fieldContainer = (field.closest('.form_input-group') ||
      field) as HTMLElement;
    fieldContainer.style.display = isVisible ? '' : 'none';

    // Always update the state, regardless of isEvaluating
    this.stateManager.updateState({
      fields: {
        [fieldId]: {
          ...currentState,
          isVisible: isVisible,
        },
      },
    });

    // Only handle event listeners and other side effects when not evaluating
    if (!this.isEvaluating) {
      if (isVisible) {
        field.addEventListener('input', e => this.handleFieldInput(e));
        field.addEventListener('blur', e => this.handleFieldBlur(e));
      }
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

    if (this.swiper) {
      setTimeout(() => {
        this.swiper.updateAutoHeight();
        this.swiper.update(); // Full update of Swiper
      }, 50);
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
